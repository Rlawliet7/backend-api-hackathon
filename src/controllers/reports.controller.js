import { Order, StockHistory } from '../models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

/**
 * Helper: parse & validasi range tanggal dari query ?from=&to=.
 * Default: 30 hari terakhir kalau tidak diisi.
 */
const parseDateRange = (query) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw new ApiError(400, 'Format from/to tidak valid. Gunakan format tanggal ISO, mis. 2025-01-01.');
  }
  if (from > to) {
    throw new ApiError(400, 'from harus lebih awal dari to.');
  }

  return { from, to };
};

/**
 * GET /reports/sales-summary — Admin
 * Query: ?from=&to=&channel=online|offline
 * Ringkasan penjualan: total order, total revenue, breakdown per channel & per status.
 * Hanya menghitung order yang statusnya sudah dianggap "terjual" (bukan pending/cancelled).
 */
export const getSalesSummary = catchAsync(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const { channel } = req.query;

  const matchStage = {
    createdAt: { $gte: from, $lte: to },
    status: { $nin: ['pending', 'cancelled'] },
  };
  if (channel) {
    if (!['online', 'offline'].includes(channel)) {
      throw new ApiError(400, 'channel harus "online" atau "offline".');
    }
    matchStage.channel = channel;
  }

  const [summary, byChannel, byStatus] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalDiscount: { $sum: '$discount' },
          averageOrderValue: { $avg: '$total' },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      { $group: { _id: '$channel', totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', totalOrders: { $sum: 1 } } },
    ]),
  ]);

  const result = summary[0] || { totalOrders: 0, totalRevenue: 0, totalDiscount: 0, averageOrderValue: 0 };

  res.status(200).json({
    success: true,
    data: {
      range: { from, to },
      totalOrders: result.totalOrders,
      totalRevenue: result.totalRevenue,
      totalDiscount: result.totalDiscount,
      averageOrderValue: Math.round(result.averageOrderValue || 0),
      byChannel,
      byStatus,
    },
  });
});

/**
 * GET /reports/top-products — Admin
 * Query: ?from=&to=&limit=10
 * Produk terlaris berdasarkan quantity terjual, dihitung dari order.items (bukan cart).
 */
export const getTopProducts = catchAsync(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const limit = Math.min(50, Number(req.query.limit) || 10);

  const topProducts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        status: { $nin: ['pending', 'cancelled'] },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: limit },
  ]);

  res.status(200).json({
    success: true,
    data: { range: { from, to }, products: topProducts },
  });
});

/**
 * GET /reports/stock-movement — Admin
 * Query: ?from=&to=&referenceType=&productId=
 * Ringkasan pergerakan stok per tipe (restock/sale/adjustment/return), dan per referenceType.
 */
export const getStockMovement = catchAsync(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const { referenceType, productId } = req.query;

  const matchStage = { createdAt: { $gte: from, $lte: to } };
  if (referenceType) {
    if (!['order', 'manual', 'device_scan'].includes(referenceType)) {
      throw new ApiError(400, 'referenceType tidak valid. Pilihan: order, manual, device_scan.');
    }
    matchStage.referenceType = referenceType;
  }
  if (productId) matchStage.productId = productId;

  const [byType, byReferenceType, byChannel] = await Promise.all([
    StockHistory.aggregate([
      { $match: matchStage },
      { $group: { _id: '$type', totalQuantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
    StockHistory.aggregate([
      { $match: matchStage },
      { $group: { _id: '$referenceType', totalQuantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
    StockHistory.aggregate([
      { $match: matchStage },
      { $group: { _id: '$storeChannel', totalQuantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: { range: { from, to }, byType, byReferenceType, byChannel },
  });
});