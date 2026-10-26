const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
router.post('/register', controller.register);
router.post('/login', loginLimit, controller.login);
router.get('/me', authenticate, (req, res) => res.json({ success: true, data: req.user }));
module.exports = router;
