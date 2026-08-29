import env from './config/env.js';
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
import { startAutoFinalizeSessionsJob } from './jobs/autoFinalizeSessions.job.js';
import reviewsRoutes from './routes/reviews.routes.js';
import productReviewsRoutes from './routes/productReviews.routes.js';
import errorHandler from './middlewares/errorhandler.middleware.js';

const app = express();

// Connect DB
connectDB();

// Global middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const basePath = env.API_BASE_PATH;

app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Backend API Hackathon</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            color: #17202a;
            background: #f6f8fb;
          }
          main {
            width: min(90vw, 560px);
            padding: 32px;
            border: 1px solid #dce3ec;
            border-radius: 8px;
            background: #ffffff;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 28px;
          }
          p {
            margin: 8px 0;
            line-height: 1.5;
          }
          code {
            padding: 2px 6px;
            border-radius: 4px;
            background: #eef2f7;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Welcome to Backend API Hackathon</h1>
          <p>Server Express berjalan dengan baik.</p>
          <p>Health check: <code>/health</code></p>
          <p>Database check: <code>/check-db</code></p>
          <p>API base path: <code>${basePath}</code></p>
        </main>
      </body>
    </html>
  `);
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
 
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Global error handler (harus paling akhir)
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

export default app;
