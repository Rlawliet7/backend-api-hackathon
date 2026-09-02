import env from './config/env.js';
import {getFirstpage} from './utils/htmlFace.js'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/user.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import stockRoutes from './routes/stock.routes.js';
import devicesRoutes from './routes/devices.routes.js';
import deviceScansRoutes from './routes/deviceScans.routes.js';
import posSessionsRoutes from './routes/posSessions.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import testimonialsRoutes from './routes/testimonials.routes.js';
import productReviewsRoutes from './routes/productReviews.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import vouchersRoutes from './routes/vouchers.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { startAutoFinalizeSessionsJob } from './jobs/autoFinalizeSessions.job.js';
import errorHandler from './middlewares/errorhandler.middleware.js';


const app = express();

// Connect DB
connectDB();

// Global middlewares
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

const basePath = env.API_BASE_PATH;

app.get('/', (req, res) => {
  res.type('html').send(getFirstpage());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.get('/check-db', async (req, res) => {
  const connected = await connectDB();

  res.status(connected ? 200 : 503).json({
    success: connected,
    connected,
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    message: connected ? 'Database connected.' : 'Database not connected.',
  });
});

// Routes
app.use(`${basePath}/auth`, authRoutes);
app.use(`${basePath}/users`, usersRoutes);
app.use(`${basePath}/products`, productsRoutes);
app.use(`${basePath}/categories`, categoriesRoutes);
app.use(`${basePath}/cart`, cartRoutes);
app.use(`${basePath}/orders`, ordersRoutes);
app.use(`${basePath}/payments`, paymentsRoutes);
app.use(`${basePath}/stock`, stockRoutes);
app.use(`${basePath}/devices`, devicesRoutes);
app.use(`${basePath}/device/scans`, deviceScansRoutes);
app.use(`${basePath}/pos-sessions`, posSessionsRoutes);
app.use(`${basePath}/products/:productId/reviews`, productReviewsRoutes);
app.use(`${basePath}/reviews`, reviewsRoutes);
app.use(`${basePath}/testimonials`, testimonialsRoutes);
app.use(`${basePath}/feedback`, feedbackRoutes);
app.use(`${basePath}/vouchers`, vouchersRoutes);
app.use(`${basePath}/wishlist`, wishlistRoutes);
app.use(`${basePath}/notifications`, notificationsRoutes);
app.use(`${basePath}/reports`, reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Global error handler (harus paling akhir)
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    startAutoFinalizeSessionsJob()
  });
}

export default app;
