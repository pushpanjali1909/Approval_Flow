/**
 * Request Routes definition
 */

const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { validateRequestPayload } = require('../middleware/validation');

// Collection routes
router.post('/', validateRequestPayload, requestController.create);
router.get('/', requestController.list);

// Single item routes
router.get('/:id', requestController.getById);
router.put('/:id', validateRequestPayload, requestController.update);

// State transition routes
router.post('/:id/submit', requestController.submit);
router.post('/:id/approve', requestController.approve);
router.post('/:id/reject', requestController.reject);

module.exports = router;
