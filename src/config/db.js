import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Skipping database connection.');
    return false;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.warn('Continuing without database connection.');
    return false;
  }
};

export default connectDB;
