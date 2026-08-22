import dotenv from 'dotenv';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

const {
  NODE_ENV,
  PORT = 5000,
  HOST = '0.0.0.0',
  MONGODB_URI,
  API_BASE_PATH = '/api/v1',
  FRONTEND_URL = 'http://localhost:5173,http://localhost:3000',

  // JWT (user auth)
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES = '15m',
  JWT_REFRESH_EXPIRES = '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,

  // Google Cloud Storage
  GCS_PROJECT_ID,
  GCS_BUCKET_NAME,
  GCS_KEYFILE_PATH,

  // Device / Hardware auth
  DEVICE_KEY_HASH_SALT,

  // POS Session
  SESSION_TIMEOUT_SECONDS = 120,
  SESSION_AUTOCLOSE_CRON = '*/30 * * * * *',

  // Rate limit
  RATE_LIMIT_WINDOW_MS = 60000,
  RATE_LIMIT_MAX = 100,
  DEVICE_RATE_LIMIT_MAX = 200,

  // Bcrypt
  BCRYPT_SALT_ROUNDS = 10,
} = process.env;

export default {
  NODE_ENV: NODE_ENV || 'development',
  PORT: Number(PORT),
  HOST,
  MONGODB_URI,
  API_BASE_PATH,
  FRONTEND_URL: FRONTEND_URL.split(',').map((url) => url.trim()).filter(Boolean),

  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,

  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,

  GCS_PROJECT_ID,
  GCS_BUCKET_NAME,
  GCS_KEYFILE_PATH,

  DEVICE_KEY_HASH_SALT,

  SESSION_TIMEOUT_SECONDS: Number(SESSION_TIMEOUT_SECONDS),
  SESSION_AUTOCLOSE_CRON,

  RATE_LIMIT_WINDOW_MS: Number(RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX: Number(RATE_LIMIT_MAX),
  DEVICE_RATE_LIMIT_MAX: Number(DEVICE_RATE_LIMIT_MAX),

  BCRYPT_SALT_ROUNDS: Number(BCRYPT_SALT_ROUNDS),
};
