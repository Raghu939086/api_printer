const router = require('express').Router();
const controller = require('../controllers/file.controller');

// Public: streams a stored PDF by its GridFS id.
router.get('/:id', controller.getFile);

module.exports = router;
