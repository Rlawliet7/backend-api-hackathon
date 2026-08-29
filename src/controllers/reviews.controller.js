import { Review, Order, Product } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * Hitung ulang averageRating & totalReviews produk berdasarkan seluruh review yang ada.
 */
const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { productId } },
    { $group: { _id: '$productId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { avgRating = 0, count = 0 } = stats[0] || {};

  await Product.findByIdAndUpdate(productId, {
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: count,
  });
};

/**
 * POST /products/:productId/reviews — Protected
 * Body: { orderId, rating, comment?, images? }
 * Hanya bisa review produk yang pernah dibeli (order milik sendiri, status completed/paid).
 */
export const createReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { orderId, rating, comment, images } = req.body;

  if (!orderId || !rating) {
    throw new ApiError(400, 'orderId dan rating wajib diisi.');
  }
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, 'rating harus antara 1-5.');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order tidak ditemukan.');
  }
  if (!order.userId?.equals(req.user._id)) {
    throw new ApiError(403, 'Anda hanya bisa mereview order milik Anda sendiri.');
  }
  if (!['paid', 'processing', 'ready', 'delivering', 'completed'].includes(order.status)) {
    throw new ApiError(400, 'Order ini belum dibayar, tidak bisa direview.');
  }

  const boughtProduct = order.items.some((item) => item.productId.equals(productId));
  if (!boughtProduct) {
    throw new ApiError(400, 'Produk ini tidak ada di order yang Anda sebutkan.');
  }

  const existing = await Review.findOne({ productId, orderId, userId: req.user._id });
  if (existing) {
    throw new ApiError(409, 'Anda sudah mereview produk ini untuk order tersebut.');
  }

  const review = await Review.create({
    productId,
    userId: req.user._id,
    orderId,
    rating,
    comment: comment || '',
    images: images || [],
  });

  await recalculateProductRating(productId);

  res.status(201).json({
    success: true,
    message: 'Review berhasil ditambahkan.',
    data: { review },
  });
});

/**
 * GET /products/:productId/reviews — Public
 */
export const listProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const [reviews, total] = await Promise.all([
    Review.find({ productId })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments({ productId }),
  ]);

  res.status(200).json({
    success: true,
    data: { reviews, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * DELETE /reviews/:id — Owner atau Admin
 */
export const deleteReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError(404, 'Review tidak ditemukan.');
  }
  if (req.user.role !== 'admin' && !review.userId.equals(req.user._id)) {
    throw new ApiError(403, 'Anda tidak memiliki akses untuk menghapus review ini.');
  }

  const { productId } = review;
  await review.deleteOne();
  await recalculateProductRating(productId);

  res.status(200).json({
    success: true,
    message: 'Review berhasil dihapus.',
    data: null,
  });
});