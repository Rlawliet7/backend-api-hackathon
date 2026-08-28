import mongoose from 'mongoose';
import env from './env.js';

let cachedConnection = null;

const connectDB = async () => {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Skipping database connection.');
    return false;
  }

  if (cachedConnection || mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    cachedConnection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    cachedConnection = null;
    console.error('MongoDB connection error:', err.message);
    console.warn('Continuing without database connection.');
    return false;
  }
};

export default connectDB;
