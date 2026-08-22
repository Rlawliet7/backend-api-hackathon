import mongoose from 'mongoose';

const deviceScanSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    barcode: { type: String, required: true },
    mode: { type: String, enum: ['restock', 'buy'], required: true },
    status: { type: String, enum: ['matched', 'unmatched', 'processed'], default: 'matched' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfflineCheckoutSession', default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

deviceScanSchema.index({ deviceId: 1, receivedAt: -1 });

export default mongoose.model('DeviceScan', deviceScanSchema);