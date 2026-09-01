const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const { uploadCategoria } = require('../middleware/upload');

// --- Públicas ---
router.get('/', categoryController.listar);
router.get('/:id', categoryController.obtener);

// --- Protegidas ---
router.post('/', requireAuth, uploadCategoria, categoryController.crear);
router.put('/:id', requireAuth, uploadCategoria, categoryController.actualizar);
router.delete('/:id', requireAuth, categoryController.eliminar);

module.exports = router;
