import env from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
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

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Routes
app.use(`${basePath}/auth`, authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Global error handler (harus paling akhir)
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
