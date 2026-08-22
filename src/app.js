import env from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import errorHandler from './middlewares/errorhandler.middleware.js';

const app = express();

const isProduction = env.NODE_ENV === 'production';

// Global middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.FRONTEND_URL.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(isProduction ? 'combined' : 'dev'));

const basePath = env.API_BASE_PATH;

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    environment: env.NODE_ENV,
  });
});

// Routes
app.use(`${basePath}/auth`, authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Global error handler (harus paling akhir)
app.use(errorHandler);

export default app;
