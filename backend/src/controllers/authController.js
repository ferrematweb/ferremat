const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 horas, alineado con JWT_EXPIRES_IN por defecto

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, usuario: admin.usuario },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS
  };
}

/**
 * POST /api/auth/login  y  POST /admin/login
 * Body: { usuario, password }
 * Verifica credenciales, firma un JWT y lo entrega:
 *   - como cookie httpOnly (para que el panel admin EJS lo use)
 *   - y también en el JSON de respuesta (útil para clientes API/Postman)
 */
async function login(req, res) {
  const { usuario, password } = req.body || {};

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const admin = await prisma.admin.findUnique({ where: { usuario: String(usuario).trim() } });
  if (!admin) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrecto.' });
  }

  const passwordOk = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrecto.' });
  }

  const token = signToken(admin);
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.json({
    token,
    admin: { id: admin.id, usuario: admin.usuario, nombre: admin.nombre }
  });
}

/**
 * POST /api/auth/logout  y  POST /admin/logout
 */
function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  return res.json({ ok: true });
}

/**
 * GET /api/auth/me
 * Devuelve el admin autenticado actual (útil para el frontend del panel).
 */
async function me(req, res) {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
  if (!admin) return res.status(404).json({ error: 'Administrador no encontrado.' });
  return res.json({ id: admin.id, usuario: admin.usuario, nombre: admin.nombre });
}

module.exports = { login, logout, me };
