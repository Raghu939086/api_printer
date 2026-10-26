const multer = require('multer');
const path = require('path');

const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

// Keep the uploaded file in memory so the controller can stream it into GridFS
// (MongoDB) instead of writing it to the local disk.
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = new Set(['.pdf']);
  const allowedMime = new Set(['application/pdf']);
  if (allowedExt.has(ext) && allowedMime.has(file.mimetype)) return cb(null, true);
  cb(new Error('Only PDF files are allowed'));
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 }
});
