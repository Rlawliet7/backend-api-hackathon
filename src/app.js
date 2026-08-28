import env from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/user.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import cartRoutes from './routes/cart.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import stockRoutes from './routes/stock.routes.js';
import errorHandler from './middlewares/errorhandler.middleware.js';

const app = express();

// Global middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const basePath = env.API_BASE_PATH;

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use(async (req, res, next) => {
  const isConnected = await connectDB();

  if (!isConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is not available.',
    });
  }

  return next();
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
