import mongoose from 'mongoose';

const deviceScanSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    mode: { type: String, enum: ['restock', 'buy'], required: true },
    barcode: { type: String, required: true },
    matchedProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null }, // null jika unmatched
    status: { type: String, enum: ['matched', 'unmatched'], required: true },
    deviceUptimeMs: { type: Number, default: null }, // dari firmware, hanya untuk debug
    receivedAt: { type: Date, default: Date.now }, // waktu resmi, selalu digenerate backend
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfflineCheckoutSession', default: null }, // hanya mode "buy"
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

deviceScanSchema.index({ deviceId: 1, receivedAt: -1 });

export default mongoose.model('DeviceScan', deviceScanSchema);