/**
 * Centralized Error Handling Middleware
 * Ensures consistent response format: { "message": "..." }
 */

/**
 * Catches 404 for undefined routes
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
}

/**
 * Global error handler for uncaught exceptions & async failures
 */
function errorHandler(err, _req, res, _next) {
  console.error('[Error Handler]', err);

  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid JSON payload in request body.',
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

