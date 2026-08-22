/**
 * Error terstruktur agar error handler global bisa membentuk response
 * sesuai format kontrak: { success: false, message, errors? }
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;