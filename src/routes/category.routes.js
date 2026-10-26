const router = require('express').Router();
const controller = require('../controllers/category.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', controller.list);
router.post('/', authenticate, requireAdmin, controller.create);
router.put('/:id', authenticate, requireAdmin, controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.remove);
module.exports = router;
