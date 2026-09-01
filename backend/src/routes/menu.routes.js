const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { requireAuth } = require('../middleware/auth');

// --- Pública ---
// GET /api/menu            -> solo ítems visibles (para el sitio público)
// GET /api/menu?todos=true -> todos los ítems, incluidos ocultos (panel admin)
router.get('/', menuController.listar);

// --- Protegidas ---
router.get('/:id', requireAuth, menuController.obtener);
router.post('/', requireAuth, menuController.crear);
router.put('/:id', requireAuth, menuController.actualizar);
router.delete('/:id', requireAuth, menuController.eliminar);

module.exports = router;
