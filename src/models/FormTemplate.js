const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, match: /^[a-zA-Z][a-zA-Z0-9_]*$/ },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['text', 'textarea', 'date', 'email', 'number', 'select', 'checkbox'], required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String, trim: true, maxlength: 120 }],
  helpText: { type: String, trim: true, maxlength: 300, default: '' }
}, { _id: false });

const formTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 180 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  formType: { type: String, enum: ['downloadable', 'fillable', 'both'], default: 'both' },
  fileUrl: { type: String, trim: true, default: '' },
  fileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  originalFileName: { type: String, trim: true, default: '' },
  fields: { type: [fieldSchema], default: [] },
  tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }], default: [] },
  officialUrl: { type: String, trim: true, default: '' },
  version: { type: String, trim: true, default: '1.0' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

formTemplateSchema.index({ tags: 1 });
formTemplateSchema.index({ title: 'text', description: 'text', slug: 'text', tags: 'text' });
module.exports = mongoose.model('FormTemplate', formTemplateSchema);
