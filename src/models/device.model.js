import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    keyHash: { type: String, required: true }, // hash dari device key, pakai DEVICE_KEY_HASH_SALT
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Device', deviceSchema);