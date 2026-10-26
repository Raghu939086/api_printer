const Application = require('../models/Application');
const FormTemplate = require('../models/FormTemplate');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { formTemplateId, data = {}, status = 'draft', notes = '' } = req.body;
  if (!formTemplateId) return res.status(400).json({ success: false, message: 'formTemplateId is required' });
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ success: false, message: 'data must be an object' });
  const template = await FormTemplate.findOne({ _id: formTemplateId, isActive: true });
  if (!template) return res.status(404).json({ success: false, message: 'Active form template not found' });
  const allowedStatuses = ['draft', 'ready_to_print'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: 'New applications may only be draft or ready_to_print' });
  // Validate supplied keys against configured template fields; never accept arbitrary field names.
  const known = new Set(template.fields.map((f) => f.name));
  const unknown = Object.keys(data).filter((key) => !known.has(key));
  if (unknown.length) return res.status(400).json({ success: false, message: 'Unknown form fields supplied', fields: unknown });
  for (const field of template.fields) {
    if (field.required && (data[field.name] === undefined || data[field.name] === null || String(data[field.name]).trim() === '')) {
      return res.status(400).json({ success: false, message: `${field.label} is required` });
    }
    if (field.type === 'select' && data[field.name] !== undefined && !field.options.includes(String(data[field.name]))) {
      return res.status(400).json({ success: false, message: `Invalid option for ${field.label}` });
    }
  }
  const item = await Application.create({ formTemplate: template._id, owner: req.user._id, data, status, notes });
  res.status(201).json({ success: true, data: item });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Application.find(filter).populate({ path: 'formTemplate', select: 'title slug category fileUrl formType' }).sort({ updatedAt: -1 }).skip((p - 1) * l).limit(l),
    Application.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
});

exports.getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  const item = await Application.findOne(filter).populate('formTemplate', 'title slug category fields fileUrl officialUrl formType');
  if (!item) return res.status(404).json({ success: false, message: 'Application not found' });
  res.json({ success: true, data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  const item = await Application.findOne(filter).populate('formTemplate');
  if (!item) return res.status(404).json({ success: false, message: 'Application not found' });
  if (['printed', 'archived'].includes(item.status)) return res.status(409).json({ success: false, message: 'Printed or archived applications cannot be edited' });
  if (req.body.data !== undefined) {
    if (!req.body.data || typeof req.body.data !== 'object' || Array.isArray(req.body.data)) return res.status(400).json({ success: false, message: 'data must be an object' });
    const known = new Set(item.formTemplate.fields.map((f) => f.name));
    const unknown = Object.keys(req.body.data).filter((key) => !known.has(key));
    if (unknown.length) return res.status(400).json({ success: false, message: 'Unknown form fields supplied', fields: unknown });
    item.data = req.body.data;
  }
  if (req.body.notes !== undefined) item.notes = req.body.notes;
  if (req.body.status !== undefined) {
    if (!['draft', 'ready_to_print'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Status transition not allowed through this endpoint' });
    item.status = req.body.status;
  }
  await item.save();
  res.json({ success: true, data: item });
});

exports.remove = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  const item = await Application.findOneAndDelete(filter);
  if (!item) return res.status(404).json({ success: false, message: 'Application not found' });
  res.json({ success: true, message: 'Application deleted' });
});

exports.markPrinted = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  const item = await Application.findOne(filter);
  if (!item) return res.status(404).json({ success: false, message: 'Application not found' });
  if (item.status !== 'ready_to_print') return res.status(409).json({ success: false, message: 'Mark the application ready_to_print before printing' });
  // Integrate your existing printer/job queue here before marking as printed.
  item.status = 'printed';
  await item.save();
  res.json({ success: true, message: 'Application marked printed. Connect this action to your actual print service.', data: item });
});
