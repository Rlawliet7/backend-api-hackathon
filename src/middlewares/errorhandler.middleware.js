import ApiError from '../utils/ApiError.js';

/**
 * Error handler global. Pasang paling akhir di app.js: app.use(errorHandler)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errors } = err;

  if (!(err instanceof ApiError)) {
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validasi gagal.';
      errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = `Format ${err.path} tidak valid.`;
    } else if (err.code === 11000) {
      // Duplicate key error
      statusCode = 409;
      const field = Object.keys(err.keyValue || {})[0];
      message = `${field} sudah digunakan.`;
    } else {
      statusCode = statusCode || 500;
      message = message || 'Terjadi kesalahan pada server.';
    }
  }

  res.status(statusCode || 500).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};

export default errorHandler;