import { Testimonial } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * POST /testimonials — Protected
 * Body: { message, productId?, rating? }
 * Testimoni baru masuk sebagai belum disetujui (isApproved: false) sampai di-approve admin.
 */
export const createTestimonial = catchAsync(async (req, res) => {
  const { message, productId, rating } = req.body;

  if (!message) {
    throw new ApiError(400, 'message wajib diisi.');
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new ApiError(400, 'rating harus antara 1-5.');
  }

  const testimonial = await Testimonial.create({
    userId: req.user._id,
    productId: productId || null,
    message,
    rating: rating ?? null,
  });

  res.status(201).json({
    success: true,
    message: 'Testimoni berhasil dikirim, menunggu persetujuan admin.',
    data: { testimonial },
  });
});

/**
 * GET /testimonials — Public
 * Default hanya menampilkan yang sudah isApproved: true.
 * Admin bisa lihat semua (termasuk pending) dengan ?status=pending atau ?status=all.
 */
export const listTestimonials = catchAsync(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = {};
  const isAdminViewingAll = req.user?.role === 'admin' && req.query.status;

  if (isAdminViewingAll) {
    if (req.query.status === 'pending') filter.isApproved = false;
    else if (req.query.status === 'approved') filter.isApproved = true;
    // status === 'all' -> tanpa filter isApproved
  } else {
    filter.isApproved = true;
  }

  if (req.query.featured === 'true') filter.isFeatured = true;

  const [testimonials, total] = await Promise.all([
    Testimonial.find(filter)
      .populate('userId', 'name avatarUrl')
      .populate('productId', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Testimonial.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { testimonials, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * PATCH /testimonials/:id/approve — Admin
 * Body: { isApproved: boolean, isFeatured?: boolean }
 */
export const approveTestimonial = catchAsync(async (req, res) => {
  const { isApproved, isFeatured } = req.body;

  if (typeof isApproved !== 'boolean') {
    throw new ApiError(400, 'isApproved wajib diisi dengan boolean.');
  }

  const updates = { isApproved };
  if (typeof isFeatured === 'boolean') updates.isFeatured = isFeatured;

  const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!testimonial) {
    throw new ApiError(404, 'Testimoni tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: `Testimoni berhasil ${isApproved ? 'disetujui' : 'ditolak'}.`,
    data: { testimonial },
  });
});