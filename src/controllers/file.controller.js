const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { findFile, openDownloadStream } = require('../utils/gridfs');

// Streams a PDF stored in GridFS (MongoDB) back to the client.
exports.getFile = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid file id' });
  }
  const file = await findFile(req.params.id);
  if (!file) return res.status(404).json({ success: false, message: 'File not found' });

  res.set('Content-Type', file.contentType || 'application/pdf');
  res.set('Content-Length', String(file.length));
  res.set('Content-Disposition', `inline; filename="${(file.filename || 'document.pdf').replace(/"/g, '')}"`);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, max-age=3600');

  const stream = openDownloadStream(req.params.id);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500);
    res.end();
  });
  stream.pipe(res);
});
