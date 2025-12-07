const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);
console.log('✅ MongoDB Connected');

// USERS COLLECTION (identity verification)
const UserSchema = new mongoose.Schema({
  identityKey: { type: String, required: true, unique: true },
  userId: String,
  createdAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: true },
  source: String
});
const User = mongoose.model('User', UserSchema);

// PRIVATE MEDIA COLLECTION (per user only)
const MediaSchema = new mongoose.Schema({
  userId: { type: String, required: true },  // Links to verified user
  identityKey: { type: String, required: true },  // Double verification
  imageKey: String,                          // Your AsyncStorage key
  uhrpTxId: String,                          // Blockchain proof
  imageUri: String,                          // Local file path
  thumbnailUri: String,
  createdAt: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed      // Watermark position, etc.
});
const Media = mongoose.model('Media', MediaSchema);

// 1. DESKTOP AUTO-REGISTER (stores identityKey)
app.post('/auto-register', async (req, res) => {
  const { identityKey } = req.body;
  try {
    let user = await User.findOne({ identityKey });
    if (!user) {
      user = new User({
        identityKey,
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        source: 'desktop'
      });
      await user.save();
      console.log('✅ New user registered:', user.userId);
    }
    res.json({ success: true, userId: user.userId, identityKey });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 2. MOBILE VERIFICATION
app.post('/verify-key', async (req, res) => {
  const { identityKey } = req.body;
  const user = await User.findOne({ identityKey, verified: true });
  res.json({ verified: !!user, userId: user?.userId });
});

// 3. STORE MEDIA PRIVATELY (only verified users)
app.post('/store-media', async (req, res) => {
  const { identityKey, imageKey, uhrpTxId, imageUri, thumbnailUri, metadata } = req.body;
  
  // VERIFY USER EXISTS
  const user = await User.findOne({ identityKey, verified: true });
  if (!user) return res.status(401).json({ error: 'User not verified' });
  
  // STORE MEDIA (PRIVATE to this user)
  const media = new Media({
    userId: user.userId,
    identityKey,
    imageKey,
    uhrpTxId,
    imageUri,
    thumbnailUri,
    metadata
  });
  await media.save();
  
  res.json({ success: true, mediaId: media._id });
});

// 4. GET USER'S PRIVATE MEDIA GALLERY
app.get('/media/:identityKey/:imageId', async (req, res) => {  // ← CHANGED
  try {
    const media = await Media.findOne({
      identityKey: req.params.identityKey,
      imageKey: req.params.imageId
    });
    res.json(media || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(3000, () => console.log('🚀 Server: http://localhost:3000'));
