import { Cart, Product } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * Helper: ambil (atau buat) cart milik user, lalu hitung subtotal.
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
};

const serializeCart = async (cart) => {
  const populated = await Cart.populate(cart, { path: 'items.productId', select: 'name images price discountPrice stock isActive' });
  const items = populated.items.map((item) => ({
    productId: item.productId?._id,
    name: item.productId?.name,
    image: item.productId?.images?.[0] || null,
    priceSnapshot: item.priceSnapshot,
    quantity: item.quantity,
    subtotal: item.priceSnapshot * item.quantity,
    currentStock: item.productId?.stock,
    isProductActive: item.productId?.isActive,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, subtotal };
};

/**
 * GET /cart — Protected
 */
export const getCart = catchAsync(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const serialized = await serializeCart(cart);

  res.status(200).json({
    success: true,
    data: serialized,
  });
});

/**
 * POST /cart/items/:productId — Protected
 * Body: { quantity }
 * Tambah produk ke cart. Jika produk sudah ada, quantity ditambahkan (bukan diganti).
 */
export const addCartItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const quantity = Number(req.body.quantity) || 1;

  if (quantity < 1) {
    throw new ApiError(400, 'quantity minimal 1.');
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan atau sudah tidak aktif.');
  }
  if (product.stock < quantity) {
    throw new ApiError(400, `Stok tidak mencukupi. Sisa stok: ${product.stock}.`);
  }

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find((item) => item.productId.equals(product._id));

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.priceSnapshot = product.discountPrice ?? product.price; // refresh harga terbaru
  } else {
    cart.items.push({
      productId: product._id,
      quantity,
      priceSnapshot: product.discountPrice ?? product.price,
    });
  }

  await cart.save();
  const serialized = await serializeCart(cart);

  res.status(200).json({
    success: true,
    message: 'Produk berhasil ditambahkan ke keranjang.',
    data: serialized,
  });
});

/**
 * PATCH /cart/items/:productId — Protected
 * Body: { quantity } — set quantity absolut (bukan menambah)
 */
export const updateCartItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const quantity = Number(req.body.quantity);

  if (!quantity || quantity < 1) {
    throw new ApiError(400, 'quantity wajib diisi, minimal 1. Gunakan DELETE untuk menghapus item.');
  }

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.productId.equals(productId));

  if (!item) {
    throw new ApiError(404, 'Produk tidak ada di keranjang.');
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Produk tidak ditemukan atau sudah tidak aktif.');
  }
  if (product.stock < quantity) {
    throw new ApiError(400, `Stok tidak mencukupi. Sisa stok: ${product.stock}.`);
  }

  item.quantity = quantity;
  item.priceSnapshot = product.discountPrice ?? product.price;

  await cart.save();
  const serialized = await serializeCart(cart);

  res.status(200).json({
    success: true,
    message: 'Keranjang berhasil diperbarui.',
    data: serialized,
  });
});

/**
 * DELETE /cart/items/:productId — Protected
 */
export const removeCartItem = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const cart = await getOrCreateCart(req.user._id);
  const beforeCount = cart.items.length;
  cart.items = cart.items.filter((i) => !i.productId.equals(productId));

  if (cart.items.length === beforeCount) {
    throw new ApiError(404, 'Produk tidak ada di keranjang.');
  }

  await cart.save();
  const serialized = await serializeCart(cart);

  res.status(200).json({
    success: true,
    message: 'Produk berhasil dihapus dari keranjang.',
    data: serialized,
  });
});

/**
 * DELETE /cart — Protected (kosongkan seluruh keranjang)
 */
export const clearCart = catchAsync(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Keranjang berhasil dikosongkan.',
    data: { items: [], subtotal: 0 },
  });
});