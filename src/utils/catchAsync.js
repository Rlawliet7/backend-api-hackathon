/**
 * Membungkus async controller agar error otomatis diteruskan ke next()
 * dan ditangani oleh error handler global.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;