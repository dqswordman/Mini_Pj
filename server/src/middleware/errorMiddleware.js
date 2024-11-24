exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[${new Date().toISOString()}] Error: ${message}, Path: ${req.path}`);
  
  res.status(statusCode).json({
    success: false,
    message,
  });
};
