import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: String,
    fullAddress: String,
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null }, // null jika daftar via Google
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String, default: null },
    addresses: [addressSchema],
    loyaltyPoints: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);