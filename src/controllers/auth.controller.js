const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email and password are required' });
  if (String(password).length < 12) return res.status(400).json({ success: false, message: 'Password must be at least 12 characters' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ success: false, message: 'Email is already registered' });
  // Public registration always creates a regular user. Create admin accounts through a trusted operational process.
  const user = await User.create({ name, email: normalizedEmail, passwordHash: await User.hashPassword(password), role: 'user' });
  res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password are required' });
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.comparePassword(String(password)))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  res.json({ success: true, data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } });
});
