import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true }, // label fisik, mis. "KASIR-01"
    name: { type: String, default: null },
    storeId: { type: String, default: null },
    apiKeyHash: { type: String, required: true }, // hash dari apiKey firmware; apiKey mentah TIDAK PERNAH disimpan
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Device', deviceSchema);