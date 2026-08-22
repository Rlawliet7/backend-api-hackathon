import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['restock', 'sale', 'adjustment', 'return'], required: true },
    quantity: { type: Number, required: true },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    referenceType: { type: String, enum: ['order', 'manual', 'device_scan'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null jika sistem/device
    storeChannel: { type: String, enum: ['online', 'offline'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockHistorySchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model('StockHistory', stockHistorySchema);