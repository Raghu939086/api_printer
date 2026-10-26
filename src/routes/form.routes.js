const router = require('express').Router();
const controller = require('../controllers/form.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', authenticate, requireAdmin, upload.single('file'), controller.create);
router.put('/:id', authenticate, requireAdmin, upload.single('file'), controller.update);
router.patch('/:id', authenticate, requireAdmin, upload.single('file'), controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.remove);
module.exports = router;
