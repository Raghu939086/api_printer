const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  formTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
  status: { type: String, enum: ['draft', 'ready_to_print', 'printed', 'archived'], default: 'draft', index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: '' }
}, { timestamps: true });

applicationSchema.index({ owner: 1, updatedAt: -1 });
module.exports = mongoose.model('Application', applicationSchema);
