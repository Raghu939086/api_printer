const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const formRoutes = require('./routes/form.routes');
const categoryRoutes = require('./routes/category.routes');
const applicationRoutes = require('./routes/application.routes');
const fileRoutes = require('./routes/file.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes('*') || origins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ success: true, message: 'Applications API is healthy' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  dotfiles: 'deny',
  index: false,
  setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
}));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/files', fileRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
