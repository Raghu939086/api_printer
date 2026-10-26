const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');

exports.list = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  const items = await Category.find(filter).sort({ name: 1 });
  res.json({ success: true, data: items });
});
exports.create = asyncHandler(async (req, res) => {
  const { name, description = '', slug } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });
  const item = await Category.create({ name, description, slug: slugify(slug || name) });
  res.status(201).json({ success: true, data: item });
});
exports.update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.name && !body.slug) body.slug = slugify(body.name);
  const item = await Category.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, data: item });
});
exports.remove = asyncHandler(async (req, res) => {
  const item = await Category.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
});
