const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-interview';

  // ── Try primary URI first ──────────────────────────────────────────────────
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return;
  } catch (primaryErr) {
    console.warn(`⚠️  Could not connect to MongoDB at ${uri}: ${primaryErr.message}`);
  }

  // ── Fallback: in-memory MongoDB (dev/test only) ────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ MongoDB connection failed in production. Exiting.');
    process.exit(1);
  }

  try {
    console.log('🔄 Starting in-memory MongoDB fallback (data resets on restart)...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('✅ MongoDB (in-memory) started — perfect for local dev without a local install.');
    console.log('   To persist data, install MongoDB: https://www.mongodb.com/try/download/community');
  } catch (fallbackErr) {
    console.error('❌ Both MongoDB and in-memory fallback failed:', fallbackErr.message);
    console.error('   Install MongoDB Community: https://www.mongodb.com/try/download/community');
    process.exit(1);
  }
};

module.exports = connectDB;
