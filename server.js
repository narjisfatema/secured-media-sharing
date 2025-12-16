import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import { createAuthMiddleware } from '@bsv/auth-express-middleware';
import { ProtoWallet as Wallet, PrivateKey } from '@bsv/sdk';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// 1. MONGODB CONNECTION
// ============================================================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bsv-auth';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Make sure MongoDB is running: brew services start mongodb-community');
  });

// ============================================================================
// 2. MONGODB USER SCHEMA
// ============================================================================
const userSchema = new mongoose.Schema({
  identityKey: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  registeredAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  media: [{
    fileHash: String,
    fileName: String,
    fileUrl: String,
    mimeType: String,
    fileSize: Number,
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
});

userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

const User = mongoose.model('User', userSchema);

// ============================================================================
// 3. SERVER WALLET INITIALIZATION (AUTO-GENERATE KEY)
// ============================================================================
const serverPrivateKey = PrivateKey.fromRandom();
const wallet = new Wallet(serverPrivateKey);

console.log('\n🔑 SERVER KEYS (Save these for reference):');
console.log('Private Key:', serverPrivateKey.toHex());
console.log('Public Key:', serverPrivateKey.toPublicKey().toString());
console.log('\n');

// ============================================================================
// 4. BRC-103 AUTH MIDDLEWARE
// ============================================================================
const authMiddleware = createAuthMiddleware({
  wallet,
  allowUnauthenticated: false
});

// ============================================================================
// 5. EXPRESS APP SETUP
// ============================================================================
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// 6. PUBLIC ROUTES (No authentication required)
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    server: 'running'
  });
});

// Auto-register user
app.post('/auto-register', async (req, res) => {
  try {
    const { identityKey } = req.body;
    
    if (!identityKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Identity key is required' 
      });
    }

    // Validate identity key format (should be 66 chars hex starting with 02 or 03)
    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(identityKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid identity key format'
      });
    }
    
    // Find or create user
    let user = await User.findOne({ identityKey });
    
    if (!user) {
      user = await User.create({ identityKey });
      console.log(`✅ NEW USER REGISTERED: ${identityKey.slice(0, 16)}...`);
    } else {
      await user.updateLastActive();
      console.log(`✅ EXISTING USER: ${identityKey.slice(0, 16)}...`);
    }
    
    res.json({ 
      success: true, 
      user: {
        identityKey: user.identityKey,
        registeredAt: user.registeredAt,
        mediaCount: user.media.length
      }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Verify key (for mobile users)
app.post('/verify-key', async (req, res) => {
  try {
    const { identityKey } = req.body;
    
    if (!identityKey) {
      return res.status(400).json({ verified: false });
    }

    // Check if key exists in database
    const user = await User.findOne({ identityKey });
    
    res.json({ 
      verified: !!user,
      user: user ? {
        identityKey: user.identityKey,
        registeredAt: user.registeredAt,
        mediaCount: user.media.length
      } : null
    });
  } catch (err) {
    console.error('❌ Verify error:', err);
    res.status(500).json({ verified: false, error: err.message });
  }
});

// ============================================================================
// 7. PROTECTED ROUTES (BRC-103 authentication required)
// ============================================================================
app.use(authMiddleware);

// Middleware to update last active timestamp
app.use(async (req, res, next) => {
  if (req.auth && req.auth.identityKey) {
    try {
      await User.updateOne(
        { identityKey: req.auth.identityKey },
        { lastActive: new Date() }
      );
    } catch (err) {
      console.error('Error updating last active:', err);
    }
  }
  next();
});

// Get user profile
app.get('/profile', async (req, res) => {
  try {
    console.log(`📊 Profile request from: ${req.auth.identityKey.slice(0, 16)}...`);
    
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      user: {
        identityKey: user.identityKey,
        registeredAt: user.registeredAt,
        lastActive: user.lastActive,
        mediaCount: user.media.length
      }
    });
  } catch (err) {
    console.error('❌ Profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload media
app.post('/upload-media', async (req, res) => {
  try {
    const { fileHash, fileName, fileUrl, mimeType, fileSize } = req.body;
    
    if (!fileHash || !fileName) {
      return res.status(400).json({ 
        error: 'fileHash and fileName are required' 
      });
    }
    
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add media to user's collection
    user.media.push({
      fileHash,
      fileName,
      fileUrl: fileUrl || '',
      mimeType: mimeType || 'image/jpeg',
      fileSize: fileSize || 0,
      uploadedAt: new Date()
    });
    
    await user.save();
    
    console.log(`📸 MEDIA UPLOADED by ${user.identityKey.slice(0, 16)}...: ${fileName}`);
    
    res.json({ 
      success: true, 
      mediaCount: user.media.length,
      media: user.media[user.media.length - 1]
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's media
app.get('/my-media', async (req, res) => {
  try {
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sort by upload date (newest first)
    const sortedMedia = user.media.sort((a, b) => 
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    
    res.json({ 
      media: sortedMedia,
      count: sortedMedia.length
    });
  } catch (err) {
    console.error('❌ Get media error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete media
app.delete('/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    const user = await User.findOne({ identityKey: req.auth.identityKey });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove media item
    user.media = user.media.filter(m => m._id.toString() !== mediaId);
    await user.save();
    
    console.log(`🗑️  MEDIA DELETED by ${user.identityKey.slice(0, 16)}...`);
    
    res.json({ success: true, mediaCount: user.media.length });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get stats (for demo/admin)
app.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMedia = await User.aggregate([
      { $project: { mediaCount: { $size: '$media' } } },
      { $group: { _id: null, total: { $sum: '$mediaCount' } } }
    ]);
    
    res.json({
      totalUsers,
      totalMedia: totalMedia[0]?.total || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 8. START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 BSV BRC-103 Authentication Server                     ║
║                                                            ║
║  📍 Server running on: http://localhost:${PORT}              ║
║  🔐 BRC-103 authentication: ENABLED                        ║
║  📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'}                                     ║
║                                                            ║
║  📝 Public Endpoints:                                      ║
║     POST /auto-register                                    ║
║     POST /verify-key                                       ║
║     GET  /health                                           ║
║                                                            ║
║  🔒 Protected Endpoints (require BRC-103):                 ║
║     GET    /profile                                        ║
║     POST   /upload-media                                   ║
║     GET    /my-media                                       ║
║     DELETE /media/:mediaId                                 ║
║     GET    /stats                                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});
