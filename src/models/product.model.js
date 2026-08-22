import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    barcode: { type: String, required: true, unique: true }, // isi QR fisik, mis. "8991002123456"
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: null },
    images: [{ type: String }],
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    unit: { type: String, default: 'pcs' },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);