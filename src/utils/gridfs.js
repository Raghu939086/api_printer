const mongoose = require('mongoose');

const BUCKET = 'pdfs';

// GridFS stores the PDF bytes inside MongoDB itself, so uploaded files survive
// deploys/restarts (unlike the local ./uploads folder on ephemeral hosts).
function getBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is not ready');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

function uploadBuffer(buffer, filename, contentType = 'application/pdf', metadata = {}) {
  return new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(filename, { contentType, metadata });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

async function findFile(id) {
  const _id = new mongoose.Types.ObjectId(id);
  const files = await getBucket().find({ _id }).limit(1).toArray();
  return files[0] || null;
}

function openDownloadStream(id) {
  return getBucket().openDownloadStream(new mongoose.Types.ObjectId(id));
}

async function deleteFile(id) {
  if (!id) return;
  try {
    await getBucket().delete(new mongoose.Types.ObjectId(id));
  } catch (_) {
    // File already gone — ignore.
  }
}

module.exports = { getBucket, uploadBuffer, findFile, openDownloadStream, deleteFile };
