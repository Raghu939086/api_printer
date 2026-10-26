function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with that unique value already exists' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map((e) => e.message) });
  }
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID format' });
  if (err.message === 'Only PDF files are allowed') return res.status(400).json({ success: false, message: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: 'File exceeds configured upload limit' });
  if (err.message?.includes('CORS')) return res.status(403).json({ success: false, message: 'Origin is not allowed' });
  const status = Number(err.statusCode) || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message
  });
}
module.exports = { notFound, errorHandler };
