const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const { uploadProductoCompleto } = require('../middleware/upload');

// --- Públicas ---
// GET /api/productos?categoria=&nuevo=&destacado=&disponible=&q=
router.get('/', productController.listar);
// GET /api/productos/:id
router.get('/:id', productController.obtener);

// --- Protegidas (requieren admin autenticado) ---
// Acepta 1 imagen principal ("imagen") + varias de galería ("imagenes") en la misma petición
router.post('/', requireAuth, uploadProductoCompleto, productController.crear);
router.put('/:id', requireAuth, uploadProductoCompleto, productController.actualizar);
router.delete('/:id', requireAuth, productController.eliminar);

module.exports = router;
