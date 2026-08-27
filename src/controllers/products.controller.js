import { Product, Category } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import slugify from '../utils/slugify.js';
import mongoose from 'mongoose';

const SORT_MAP = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { name: 1 },
  rating: { averageRating: -1 },
};

/**
 * GET /products — Public
 * Query: ?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=
 */
export const listProducts = catchAsync(async (req, res) => {
  const { search, category, minPrice, maxPrice, sort } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = { isActive: true };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  if (category) {
    // Terima category berupa ObjectId ataupun slug kategori.
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.categoryId = category;
    } else {
      const cat = await Category.findOne({ slug: category });
      filter.categoryId = cat ? cat._id : null; // null -> hasil kosong kalau slug tidak ketemu
    }
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const sortOption = SORT_MAP[sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('categoryId', 'name slug')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

/**
 * GET /products/:idOrSlug — Public
 */
export const getProduct = catchAsync(async (req, res) => {
  const { idOrSlug } = req.params;

  const filter = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug, isActive: true }
    : { slug: idOrSlug, isActive: true };

  const product = await Product.findOne(filter).populate('categoryId', 'name slug');

  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    data: { product },
  });
});

/**
 * POST /products — Admin
 * Body: { sku, barcode, name, description?, categoryId, price, discountPrice?, images?, stock?, lowStockThreshold?, unit? }
 * Wajib isi barcode agar bisa dikenali hardware, harus cocok persis dengan isi QR fisik.
 */
export const createProduct = catchAsync(async (req, res) => {
  const {
    sku,
    barcode,
    name,
    description,
    categoryId,
    price,
    discountPrice,
    images,
    stock,
    lowStockThreshold,
    unit,
  } = req.body;

  if (!sku || !barcode || !name || !categoryId || price === undefined) {
    throw new ApiError(400, 'sku, barcode, name, categoryId, dan price wajib diisi.');
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(400, 'categoryId tidak valid / kategori tidak ditemukan.');
  }

  const existingBarcode = await Product.findOne({ barcode });
  if (existingBarcode) {
    throw new ApiError(409, 'barcode sudah digunakan oleh produk lain. Barcode harus unik.');
  }

  const existingSku = await Product.findOne({ sku });
  if (existingSku) {
    throw new ApiError(409, 'sku sudah digunakan oleh produk lain.');
  }

  const slug = slugify(name);

  const product = await Product.create({
    sku,
    barcode,
    name,
    slug,
    description: description || '',
    categoryId,
    price,
    discountPrice: discountPrice ?? null,
    images: images || [],
    stock: stock ?? 0,
    lowStockThreshold: lowStockThreshold ?? 10,
    unit: unit || 'pcs',
  });

  res.status(201).json({
    success: true,
    message: 'Produk berhasil ditambahkan.',
    data: { product },
  });
});

/**
 * PATCH /products/:id — Admin
 */
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // sku & barcode boleh diubah, tapi tetap wajib unik jika diubah.
  if (updates.barcode) {
    const clash = await Product.findOne({ barcode: updates.barcode, _id: { $ne: id } });
    if (clash) throw new ApiError(409, 'barcode sudah digunakan oleh produk lain.');
  }
  if (updates.sku) {
    const clash = await Product.findOne({ sku: updates.sku, _id: { $ne: id } });
    if (clash) throw new ApiError(409, 'sku sudah digunakan oleh produk lain.');
  }
  if (updates.categoryId) {
    const category = await Category.findById(updates.categoryId);
    if (!category) throw new ApiError(400, 'categoryId tidak valid / kategori tidak ditemukan.');
  }
  if (updates.name) {
    updates.slug = slugify(updates.name);
  }

  // stock sengaja tidak diizinkan diubah lewat endpoint ini —
  // perubahan stok harus lewat modul Stock (Bab 8) supaya tercatat di stockhistories.
  delete updates.stock;

  const product = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: 'Produk berhasil diperbarui.',
    data: { product },
  });
});

/**
 * DELETE /products/:id — Admin (Soft delete)
 */
export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });

  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan.');
  }

  res.status(200).json({
    success: true,
    message: 'Produk berhasil dihapus (soft delete).',
    data: null,
  });
});