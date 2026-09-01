const express = require('express');
const router = express.Router();
const { requireAdminSession, extractToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

function yaAutenticado(req) {
  const token = extractToken(req);
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch (e) {
    return false;
  }
}

// GET /admin/login
router.get('/login', (req, res) => {
  if (yaAutenticado(req)) return res.redirect('/admin');
  res.render('login', { titulo: 'Ingresar', error: null });
});

// POST /admin/logout  (el login real ocurre vía fetch a /api/auth/login,
// que ya deja la cookie httpOnly lista)
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/admin/login');
});

// A partir de aquí, todas las rutas requieren sesión de admin activa.
router.use(requireAdminSession);

// GET /admin  -> panel principal
router.get('/', (req, res) => {
  res.render('dashboard', { titulo: 'Panel de administración', activo: 'inicio' });
});

// GET /admin/productos
router.get('/productos', (req, res) => {
  res.render('productos', { titulo: 'Productos', activo: 'productos' });
});

// GET /admin/categorias
router.get('/categorias', (req, res) => {
  res.render('categorias', { titulo: 'Categorías', activo: 'categorias' });
});

// GET /admin/menu
router.get('/menu', (req, res) => {
  res.render('menu', { titulo: 'Menú de navegación', activo: 'menu' });
});

module.exports = router;
