import { Product, StockHistory } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * POST /stock/restock — Admin
 * Body: { productId, quantity, note? }
 * Restock manual lewat aplikasi (tanpa scan hardware) — quantity harus positif.
 */
export const restock = catchAsync(async (req, res) => {
  const { productId, quantity, note } = req.body;

  if (!productId || !quantity) {
    throw new ApiError(400, 'productId dan quantity wajib diisi.');
  }
  if (Number(quantity) <= 0) {
    throw new ApiError(400, 'quantity harus lebih besar dari 0. Gunakan endpoint lain untuk koreksi pengurangan stok.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan.');
  }

  const stockBefore = product.stock;
  product.stock += Number(quantity);
  await product.save();

  const history = await StockHistory.create({
    productId: product._id,
    type: 'restock',
    quantity: Number(quantity),
    stockBefore,
    stockAfter: product.stock,
    referenceType: 'manual',
    referenceId: null,
    note: note || 'Restock manual oleh admin',
    performedBy: req.user._id,
    storeChannel: 'offline',
  });

  res.status(201).json({
    success: true,
    message: 'Restock berhasil dicatat.',
    data: { product, history },
  });
});

/**
 * GET /stock/history — Admin
 * Query: ?productId=&referenceType=&type=&page=&limit=
 * referenceType: "order" | "manual" | "device_scan"
 */
export const getStockHistory = catchAsync(async (req, res) => {
  const { productId, referenceType, type } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = {};
  if (productId) filter.productId = productId;
  if (referenceType) {
    if (!['order', 'manual', 'device_scan'].includes(referenceType)) {
      throw new ApiError(400, 'referenceType tidak valid. Pilihan: order, manual, device_scan.');
    }
    filter.referenceType = referenceType;
  }
  if (type) filter.type = type;

  const [history, total] = await Promise.all([
    StockHistory.find(filter)
      .populate('productId', 'name sku barcode')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    StockHistory.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { history, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /stock/low-stock — Admin
 * Produk aktif yang stock <= lowStockThreshold miliknya masing-masing.
 */
export const getLowStockProducts = catchAsync(async (req, res) => {
  const products = await Product.aggregate([
    {
      $match: {
        isActive: true,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      },
    },
    { $sort: { stock: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: { products, count: products.length },
  });
});