const multer = require('multer');
const path = require('path');

const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

// Keep the uploaded file in memory so the controller can stream it into GridFS
// (MongoDB) instead of writing it to the local disk.
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  // PDFs are stored as-is; Word documents (.doc/.docx) are converted to PDF
  // in the controller before being saved.
  const allowedExt = new Set(['.pdf', '.doc', '.docx']);
  const allowedMime = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);
  // Some browsers send a generic/empty mimetype for .docx, so trust the
  // extension when the mimetype is missing or octet-stream.
  const mimeOk = allowedMime.has(file.mimetype) || file.mimetype === 'application/octet-stream' || !file.mimetype;
  if (allowedExt.has(ext) && mimeOk) return cb(null, true);
  cb(new Error('Only PDF or Word (.doc, .docx) files are allowed'));
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 }
});
