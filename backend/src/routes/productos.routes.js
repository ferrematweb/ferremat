const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const { uploadProducto, uploadProductoGaleria } = require('../middleware/upload');

// --- Públicas ---
// GET /api/productos?categoria=&nuevo=&destacado=&disponible=&q=
router.get('/', productController.listar);
// GET /api/productos/:id
router.get('/:id', productController.obtener);

// --- Protegidas (requieren admin autenticado) ---
// Acepta 1 imagen principal ("imagen") + varias de galería ("imagenes")
router.post('/', requireAuth, uploadProducto, uploadProductoGaleria, productController.crear);
router.put('/:id', requireAuth, uploadProducto, uploadProductoGaleria, productController.actualizar);
router.delete('/:id', requireAuth, productController.eliminar);

module.exports = router;
