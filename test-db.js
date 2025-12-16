const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://narjis:f14@open-run-asia.buxkry1.mongodb.net/bsv-photo-gallery?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  identityKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function testConnection() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    const testUser = new User({
      identityKey: 'test_key_' + Date.now(),
      verified: true
    });
    await testUser.save();
    console.log('✅ Test user created:', testUser);
    
    const count = await User.countDocuments();
    console.log('📊 Total users:', count);
    
    console.log('🔍 Check MongoDB Compass - refresh to see the database!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testConnection();
