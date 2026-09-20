/**
 * Global error handling middleware.
 * Handles JSON parse errors, custom application errors, and fallback 500 errors.
 */

function errorHandler(err, req, res, next) {
  // Handle invalid JSON body syntax from client
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON',
      message: 'Invalid JSON payload provided in request.'
    });
  }

  // Handle custom application errors with status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.name || 'Error',
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }

  // Generic server error
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred on the server.'
  });
}

// 404 for undefined routes
function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
