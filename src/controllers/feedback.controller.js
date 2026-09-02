import { Feedback } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * POST /feedback — Public-Protected
 * Bisa dikirim baik oleh guest (tanpa login) maupun user yang sedang login.
 * Body: { category, message, name?, email? } — name/email wajib diisi HANYA jika guest (tidak ada req.user).
 */
export const createFeedback = catchAsync(async (req, res) => {
  const { category, message, name, email } = req.body;

  if (!category || !message) {
    throw new ApiError(400, 'category dan message wajib diisi.');
  }

  const isGuest = !req.user;
  if (isGuest && (!name || !email)) {
    throw new ApiError(400, 'name dan email wajib diisi jika mengirim feedback tanpa login.');
  }

  const feedback = await Feedback.create({
    userId: req.user ? req.user._id : null,
    guestName: isGuest ? name : null,
    guestEmail: isGuest ? email : null,
    category,
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Feedback berhasil dikirim. Terima kasih!',
    data: { feedback },
  });
});

/**
 * GET /feedback — Admin
 * Query: ?status=open|in_review|resolved&category=
 */
export const listFeedback = catchAsync(async (req, res) => {
  const { status, category } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const [feedbacks, total] = await Promise.all([
    Feedback.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { feedbacks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * PATCH /feedback/:id — Admin
 * Body: { status?, adminResponse? }
 */
export const updateFeedback = catchAsync(async (req, res) => {
  const { status, adminResponse } = req.body;

  const updates = {};
  if (status) {
    if (!['open', 'in_review', 'resolved'].includes(status)) {
      throw new ApiError(400, 'status tidak valid. Pilihan: open, in_review, resolved.');
    }
    updates.status = status;
  }
  if (adminResponse !== undefined) updates.adminResponse = adminResponse;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'Tidak ada field valid untuk diubah.');
  }

  const feedback = await Feedback.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!feedback) {
    throw new ApiError(404, 'Feedback tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: 'Feedback berhasil diperbarui.',
    data: { feedback },
  });
});