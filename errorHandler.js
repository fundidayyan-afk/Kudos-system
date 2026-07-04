// Centralized error handler — keeps error response shape consistent
// across the API: { error: { code, message } }
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status === 500 ? 'An unexpected error occurred.' : err.message;

  res.status(status).json({ error: { code, message } });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` } });
}

module.exports = { errorHandler, notFoundHandler };
