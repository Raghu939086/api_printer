const router = require('express').Router();
const controller = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.post('/', controller.create);
router.get('/', controller.listMine);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/print', controller.markPrinted);
module.exports = router;
