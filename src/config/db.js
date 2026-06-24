const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoURI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGODB_URL ||
      process.env.DATABASE_URL;

    if (!mongoURI) {
      console.error('❌ No MongoDB URI found. Set MONGO_URI (or MONGODB_URI) in environment variables.');
      console.error('Server stays up for /health; API routes need a database connection.');
      return null;
    }

    const sanitizedURI = mongoURI.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
    console.log(`🔄 Connecting to MongoDB: ${sanitizedURI}`);

    cached.promise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: process.env.VERCEL ? 5 : 10,
        minPoolSize: process.env.VERCEL ? 1 : 2,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 30000,
      })
      .then((conn) => {
        console.log('✅ MongoDB connected successfully');
        console.log(`📦 Database: ${conn.connection.name}`);
        return conn;
      })
      .catch((error) => {
        cached.promise = null;
        console.error('❌ MongoDB connection failed:', error.message);
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
          process.exit(1);
        }
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch {
    cached.conn = null;
  }

  return cached.conn;
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('🛑 Shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
    }
};

// Handle application termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = connectDB;