const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
