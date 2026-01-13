import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import { createAuthMiddleware } from '@bsv/auth-express-middleware';
import { ProtoWallet as Wallet, PrivateKey } from '@bsv/sdk';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bsv-auth';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const userSchema = new mongoose.Schema({
  identityKey: { type: String, unique: true, required: true, index: true },
  registeredAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  media: [{
    fileHash: String, fileName: String, fileUrl: String, mimeType: String, fileSize: Number, uploadedAt: { type: Date, default: Date.now }
  }]
});

userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

const User = mongoose.model('User', userSchema);
const wallet = new Wallet(PrivateKey.fromRandom());
const authMiddleware = createAuthMiddleware({ wallet, allowUnauthenticated: false });

const app = express();

app.use(cors()); // Allow all
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  // Log where the request is coming from
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/auto-register', async (req, res) => {
  try {
    const { identityKey } = req.body;
    if (!identityKey) return res.status(400).json({ success: false });
    
    let user = await User.findOne({ identityKey });
    if (!user) {
      user = await User.create({ identityKey });
      console.log('🆕 Register:', identityKey.slice(0, 10));
    } else {
      await user.updateLastActive();
      console.log('Login :', `${identityKey.slice(0, 5)}.......${identityKey.slice(-5)}`);
    }
    res.json({ success: true, user: { identityKey: user.identityKey } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/verify-mobile-key', async (req, res) => {
  try {
    const { identityKey } = req.body;
    if (!identityKey) return res.status(400).json({ success: false });
    
    const user = await User.findOne({ identityKey: identityKey.trim() });
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    
    await user.updateLastActive();
    console.log('📱 Mobile Verify:', identityKey.slice(0, 10));
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.use(authMiddleware);

app.use(async (req, res, next) => {
  if (req.auth?.identityKey) await User.updateOne({ identityKey: req.auth.identityKey }, { lastActive: new Date() }).catch(()=>{});
  next();
});

app.get('/profile', async (req, res) => {
  const user = await User.findOne({ identityKey: req.auth.identityKey });
  res.json({ user });
});

app.post('/upload-media', async (req, res) => {
  const user = await User.findOne({ identityKey: req.auth.identityKey });
  user.media.push({ ...req.body, uploadedAt: new Date() });
  await user.save();
  res.json({ success: true, media: user.media[user.media.length - 1] });
});

app.get('/my-media', async (req, res) => {
  const user = await User.findOne({ identityKey: req.auth.identityKey });
  res.json({ media: user.media, count: user.media.length });
});

app.delete('/media/:mediaId', async (req, res) => {
  const user = await User.findOne({ identityKey: req.auth.identityKey });
  user.media = user.media.filter(m => m._id.toString() !== req.params.mediaId);
  await user.save();
  res.json({ success: true });
});

// START SERVER
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  // Calculate current IP just for display
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) localIP = net.address;
    }
  }
  console.log(`Server is Running`);
});