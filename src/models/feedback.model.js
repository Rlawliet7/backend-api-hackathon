import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null jika dikirim guest
    guestName: { type: String, default: null },
    guestEmail: { type: String, default: null },
    category: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open' },
    adminResponse: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Feedback', feedbackSchema);