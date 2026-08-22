import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null jika dari sesi kasir offline tanpa akun customer
    channel: { type: String, enum: ['online', 'offline'], required: true },
    fulfillmentType: { type: String, enum: ['delivery', 'pickup', 'in_store'], required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    voucherCode: { type: String, default: null },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    pointsEarned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'ready', 'delivering', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    deliveryAddress: { type: Object, default: null },
    storeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sourceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfflineCheckoutSession', default: null },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null jika online/auto
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Order', orderSchema);