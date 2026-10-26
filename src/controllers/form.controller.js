const FormTemplate = require('../models/FormTemplate');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { uploadBuffer, deleteFile } = require('../utils/gridfs');

exports.list = asyncHandler(async (req, res) => {
  const { category, search, page = '1', limit = '20' } = req.query;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  if (category) filter.category = category;
  if (search) filter.$text = { $search: String(search).slice(0, 100) };
  const [items, total] = await Promise.all([
    FormTemplate.find(filter).populate('category', 'name slug').sort({ updatedAt: -1 }).skip((p - 1) * l).limit(l),
    FormTemplate.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
});

exports.getById = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user?.role !== 'admin') filter.isActive = true;
  const item = await FormTemplate.findOne(filter).populate('category', 'name slug');
  if (!item) return res.status(404).json({ success: false, message: 'Form not found' });
  res.json({ success: true, data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const { title, category, description = '', formType = 'both', fields = [], tags = [], officialUrl = '', version = '1.0', slug } = req.body;
  if (!title || !category) return res.status(400).json({ success: false, message: 'title and category are required' });
  let fileUrl = '';
  let fileId = null;
  if (req.file) {
    fileId = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    fileUrl = `/api/files/${fileId}`;
  }
  const item = await FormTemplate.create({
    title, category, description, formType, fields: typeof fields === 'string' ? JSON.parse(fields) : fields,
    tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
    officialUrl, version, slug: slugify(slug || title), fileUrl, fileId,
    originalFileName: req.file?.originalname || '', createdBy: req.user._id
  });
  res.status(201).json({ success: true, data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await FormTemplate.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Form not found' });
  const allowed = ['title', 'category', 'description', 'formType', 'fields', 'tags', 'officialUrl', 'version', 'isActive', 'slug'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      item[key] = (key === 'fields' || key === 'tags') && typeof req.body[key] === 'string' ? JSON.parse(req.body[key]) : req.body[key];
    }
  }
  if (req.body.title && !req.body.slug) item.slug = slugify(req.body.title);
  if (req.file) {
    const oldFileId = item.fileId;
    const newFileId = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    item.fileId = newFileId;
    item.fileUrl = `/api/files/${newFileId}`;
    item.originalFileName = req.file.originalname;
    if (oldFileId) await deleteFile(oldFileId); // remove the replaced file from GridFS
  }
  await item.save();
  res.json({ success: true, data: item });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await FormTemplate.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Form not found' });
  const used = await Application.exists({ formTemplate: item._id });
  if (used) {
    item.isActive = false;
    await item.save();
    return res.json({ success: true, message: 'Form deactivated because saved applications reference it', data: item });
  }
  if (item.fileId) await deleteFile(item.fileId);
  await item.deleteOne();
  res.json({ success: true, message: 'Form deleted' });
});
