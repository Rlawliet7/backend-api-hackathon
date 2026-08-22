import mongoose from 'mongoose';

const sessionItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    barcode: { type: String, required: true },
    name: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const offlineCheckoutSessionSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    status: { type: String, enum: ['open', 'finalized', 'cancelled'], default: 'open' },
    items: [sessionItemSchema],
    openedAt: { type: Date, default: Date.now },
    lastScanAt: { type: Date, default: Date.now },
    finalizedAt: { type: Date, default: null },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null jika auto-timeout
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }, // terisi setelah finalisasi
  },
  { timestamps: false }
);

offlineCheckoutSessionSchema.index({ deviceId: 1, status: 1 });

export default mongoose.model('OfflineCheckoutSession', offlineCheckoutSessionSchema);