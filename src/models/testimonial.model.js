import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    isFeatured: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Testimonial', testimonialSchema);