import mongoose from 'mongoose';
import { DeviceScan, Product, StockHistory, OfflineCheckoutSession } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { notifyAllAdmins } from '../utils/notify.js';

/**
 * Proses efek mode "restock": stock += 1, catat stockhistories,
 * dan kalau stok baru saja naik melewati lowStockThreshold, kirim notifikasi info ke admin.
 */
const processRestock = async (product, scanId) => {
  const stockBefore = product.stock;
  const wasBelowThreshold = stockBefore < product.lowStockThreshold;

  product.stock += 1;
  await product.save();

  await StockHistory.create({
    productId: product._id,
    type: 'restock',
    quantity: 1,
    stockBefore,
    stockAfter: product.stock,
    referenceType: 'device_scan',
    referenceId: scanId,
    note: 'Restock via scan hardware',
    performedBy: null,
    storeChannel: 'offline',
  });

  const nowAboveThreshold = product.stock >= product.lowStockThreshold;
  if (wasBelowThreshold && nowAboveThreshold) {
    await notifyAllAdmins({
      title: 'Stok sudah dinormalkan',
      message: `Stok "${product.name}" sudah kembali di atas ambang batas (${product.lowStockThreshold}). Stok saat ini: ${product.stock}.`,
      type: 'stock_normalized',
    });
  }

  return product.stock;
};

/**
 * Proses efek mode "buy": cari/buat sesi kasir "open" milik deviceId,
 * lalu tambah/increment item di sesi tersebut. Sesuai Bab 11.1 langkah 1-3.
 */
const processBuy = async (product, barcode, deviceId, scanId) => {
  let session = await OfflineCheckoutSession.findOne({ deviceId, status: 'open' });

  if (!session) {
    session = await OfflineCheckoutSession.create({
      deviceId,
      status: 'open',
      items: [],
    });
  }

  const existingItem = session.items.find((item) => item.productId.equals(product._id));
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    session.items.push({
      productId: product._id,
      barcode,
      name: product.name,
      priceSnapshot: product.discountPrice ?? product.price,
      quantity: 1,
    });
  }

  session.lastScanAt = new Date();
  await session.save();

  await DeviceScan.updateOne({ _id: scanId }, { $set: { sessionId: session._id } });

  return session;
};

/**
 * POST /device/scans — Device API Key
 * Body: { deviceId, mode, barcode, deviceUptimeMs? }
 *
 * Urutan wajib sesuai Bab 10.1:
 * 1. (sudah divalidasi oleh middleware authenticateDevice sebelum sampai sini)
 * 2. Simpan raw event ke devicescans SELALU, apa pun hasil pencarian produk.
 * 3. Cari produk by barcode → unmatched (404) atau matched (lanjut sesuai mode).
 */
export const ingestScan = catchAsync(async (req, res) => {
  const { deviceId, mode, barcode, deviceUptimeMs } = req.body;

  if (!deviceId || !mode || !barcode) {
    throw new ApiError(400, 'deviceId, mode, dan barcode wajib diisi.');
  }
  if (!['restock', 'buy'].includes(mode)) {
    throw new ApiError(400, 'mode hanya boleh "restock" atau "buy".');
  }

  // 2. Simpan raw event dulu, apa pun hasilnya nanti.
  const scan = await DeviceScan.create({
    deviceId,
    mode,
    barcode,
    matchedProductId: null,
    status: 'unmatched', // default, diupdate jadi "matched" di bawah kalau produk ketemu
    deviceUptimeMs: deviceUptimeMs ?? null,
    receivedAt: new Date(),
  });

  // 3. Cari produk.
  const product = await Product.findOne({ barcode });

  if (!product) {
    await notifyAllAdmins({
      title: 'Barcode tidak dikenali',
      message: `Device "${deviceId}" scan barcode "${barcode}" yang belum terdaftar di sistem.`,
      type: 'unmatched_scan',
    });

    return res.status(404).json({
      success: false,
      matched: false,
      message: 'Barcode tidak terdaftar, tersimpan untuk ditinjau admin',
    });
  }

  // Produk ketemu → update scan jadi matched.
  scan.matchedProductId = product._id;
  scan.status = 'matched';
  await scan.save();

  if (mode === 'restock') {
    const stockAfter = await processRestock(product, scan._id);
    return res.status(201).json({
      success: true,
      matched: true,
      productId: product._id,
      stockAfter,
    });
  }

  // mode === 'buy'
  const session = await processBuy(product, barcode, deviceId, scan._id);
  return res.status(201).json({
    success: true,
    matched: true,
    productId: product._id,
    sessionId: session._id,
  });
});

/**
 * GET /device/scans — Admin
 * Query: ?deviceId=&status=&mode=&from=&to=
 */
export const listScans = catchAsync(async (req, res) => {
  const { deviceId, status, mode, from, to } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Number(req.query.limit) || 50);

  const filter = {};
  if (deviceId) filter.deviceId = deviceId;
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (from || to) {
    filter.receivedAt = {};
    if (from) filter.receivedAt.$gte = new Date(from);
    if (to) filter.receivedAt.$lte = new Date(to);
  }

  const [scans, total] = await Promise.all([
    DeviceScan.find(filter)
      .populate('matchedProductId', 'name sku barcode')
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DeviceScan.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { scans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
});

/**
 * PATCH /device/scans/:id/map-product — Admin
 * Body: { productId }
 * Petakan scan unmatched secara retroaktif ke produk yang benar, lalu picu ulang efek stok/sesi.
 */
export const mapProductRetroactive = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { productId } = req.body;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'productId wajib diisi dan valid.');
  }

  const scan = await DeviceScan.findById(id);
  if (!scan) {
    throw new ApiError(404, 'Scan tidak ditemukan.');
  }
  if (scan.status === 'matched') {
    throw new ApiError(400, 'Scan ini sudah matched sebelumnya, tidak bisa dipetakan ulang.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Produk tidak ditemukan.');
  }

  scan.matchedProductId = product._id;
  scan.status = 'matched';
  await scan.save();

  // Picu ulang efek stok/sesi, sama seperti kalau dari awal sudah matched.
  if (scan.mode === 'restock') {
    await processRestock(product, scan._id);
  } else {
    await processBuy(product, scan.barcode, scan.deviceId, scan._id);
  }

  res.status(200).json({
    success: true,
    message: 'Scan berhasil dipetakan ke produk',
    data: { status: scan.status },
  });
});