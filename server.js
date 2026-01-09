import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import { createAuthMiddleware } from '@bsv/auth-express-middleware';
import { ProtoWallet as Wallet, PrivateKey } from '@bsv/sdk';
import dotenv from 'dotenv';
import os from 'os'; // Added to detect network IP

dotenv.config();

// 1. MONGODB CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bsv-auth';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Make sure MongoDB is running');
  });

// 2. MONGODB USER SCHEMA
const userSchema = new mongoose.Schema({
  identityKey: { type: String, unique: true, required: true, index: true },
  registeredAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  media: [{
    fileHash: String,
    fileName: String,
    fileUrl: String,
    mimeType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }]
});

userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

const User = mongoose.model('User', userSchema);

// 3. SERVER WALLET INITIALIZATION
const serverPrivateKey = PrivateKey.fromRandom();
const wallet = new Wallet(serverPrivateKey);

// 4. BRC-103 AUTH MIDDLEWARE
const authMiddleware = createAuthMiddleware({
  wallet,
  allowUnauthenticated: false
});

// 5. EXPRESS APP SETUP
const app = express();

// IMPORTANT: Allow CORS from any device (Mobile/Web)
app.use(cors()); 
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with IP address
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - [${req.method}] ${req.path} - From: ${req.ip}`);
  next();
});

// 6. PUBLIC ROUTES

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'running' });
});

// Auto-register (Desktop Flow)
app.post('/auto-register', async (req, res) => {
  try {
    const { identityKey } = req.body;
    if (!identityKey) return res.status(400).json({ success: false, error: 'Identity key is required' });

    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(identityKey)) {
      return res.status(400).json({ success: false, error: 'Invalid identity key format' });
    }
   
    let user = await User.findOne({ identityKey });
    if (!user) {
      user = await User.create({ identityKey });
      console.log(`🆕 NEW USER REGISTERED: ${identityKey.slice(0, 16)}...`);
    } else {
      await user.updateLastActive();
      console.log(`👤 USER LOGIN: ${identityKey.slice(0, 16)}...`);
    }
   
    res.json({
      success: true,
      user: { identityKey: user.identityKey, registeredAt: user.registeredAt, mediaCount: user.media.length }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Key (Mobile Flow)
app.post('/verify-mobile-key', async (req, res) => {
  try {
    const { identityKey } = req.body;
    if (!identityKey) return res.status(400).json({ success: false, error: 'Identity key is required' });

    const cleanKey = identityKey.trim();

    // Check if user exists
    const user = await User.findOne({ identityKey: cleanKey });
   
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Identity key not found. Please register on Desktop first.',
        needsDesktopAuth: true
      });
    }

    await user.updateLastActive();
    console.log(`📱 MOBILE VERIFIED: ${cleanKey.slice(0, 16)}...`);
   
    res.json({
      success: true,
      user: {
        identityKey: user.identityKey,
        registeredAt: user.registeredAt,
        lastActive: user.lastActive,
        mediaCount: user.media.length
      }
    });
  } catch (err) {
    console.error('❌ Mobile verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PROTECTED ROUTES (Requires BRC-103 Auth)
app.use(authMiddleware);

// Update last active on any protected request
app.use(async (req, res, next) => {
  if (req.auth && req.auth.identityKey) {
    try { await User.updateOne({ identityKey: req.auth.identityKey }, { lastActive: new Date() }); } 
    catch (err) { console.error('Error updating last active:', err); }
  }
  next();
});

app.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/upload-media', async (req, res) => {
  try {
    const { fileHash, fileName, fileUrl, mimeType, fileSize } = req.body;
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    if (!user) return res.status(404).json({ error: 'User not found' });
   
    user.media.push({ fileHash, fileName, fileUrl, mimeType, fileSize, uploadedAt: new Date() });
    await user.save();
    console.log(`📸 MEDIA UPLOADED: ${fileName}`);
   
    res.json({ success: true, media: user.media[user.media.length - 1] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/my-media', async (req, res) => {
  try {
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sortedMedia = user.media.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json({ media: sortedMedia, count: sortedMedia.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.media = user.media.filter(m => m._id.toString() !== mediaId);
    await user.save();
    res.json({ success: true, mediaCount: user.media.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/stats', async (req, res) => {
  const totalUsers = await User.countDocuments();
  res.json({ totalUsers, timestamp: new Date().toISOString() });
});

// 8. START SERVER
const PORT = process.env.PORT || 3000;

// Listen on 0.0.0.0 to accept connections from other devices (like your phone)
app.listen(PORT, '0.0.0.0', () => {
  // Get Network IP to display
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Find IPv4 that is not internal (like 127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
      }
    }
  }
  
  console.log(`\n🚀 Server running!`);
  console.log(`👉 Access on Computer: http://localhost:${PORT}`);
  console.log(`👉 Access on Mobile:   http://${localIP}:${PORT}`);
  console.log(`   (Ensure Mobile and Computer are on the same WiFi)`);
});