import { Wishlist, Product } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, productIds: [] });
  }
  return wishlist;
};

/**
 * GET /wishlist — Protected
 */
export const getWishlist = catchAsync(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  await wishlist.populate('productIds', 'name slug images price discountPrice stock isActive');

  res.status(200).json({
    success: true,
    data: { productIds: wishlist.productIds },
  });
});

/**
 * POST /wishlist/:productId — Protected
 */
export const addToWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan atau sudah tidak aktif.');
  }

  const wishlist = await getOrCreateWishlist(req.user._id);

  const alreadyExists = wishlist.productIds.some((id) => id.equals(productId));
  if (alreadyExists) {
    throw new ApiError(409, 'Produk sudah ada di wishlist Anda.');
  }

  wishlist.productIds.push(productId);
  await wishlist.save();

  res.status(201).json({
    success: true,
    message: 'Produk berhasil ditambahkan ke wishlist.',
    data: { productIds: wishlist.productIds },
  });
});

/**
 * DELETE /wishlist/:productId — Protected
 */
export const removeFromWishlist = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await getOrCreateWishlist(req.user._id);

  const beforeCount = wishlist.productIds.length;
  wishlist.productIds = wishlist.productIds.filter((id) => !id.equals(productId));

  if (wishlist.productIds.length === beforeCount) {
    throw new ApiError(404, 'Produk tidak ada di wishlist Anda.');
  }

  await wishlist.save();

  res.status(200).json({
    success: true,
    message: 'Produk berhasil dihapus dari wishlist.',
    data: { productIds: wishlist.productIds },
  });
});