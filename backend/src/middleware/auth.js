const jwt = require('jsonwebtoken');

/**
 * Extrae el token JWT de la petición.
 * Prioridad: cookie httpOnly "token" (usada por el panel admin EJS)
 * y luego el header "Authorization: Bearer <token>" (para clientes API).
 */
function extractToken(req) {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

/**
 * Middleware para proteger endpoints de la API JSON.
 * Si no hay token válido, responde 401 en formato JSON.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Se requiere iniciar sesión.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
  }
}

/**
 * Middleware para proteger vistas del panel admin (EJS).
 * Si no hay token válido, redirige a la pantalla de login en vez de
 * devolver JSON, ya que aquí el "cliente" es un navegador.
 */
function requireAdminSession(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.redirect('/admin/login');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    res.locals.admin = payload;
    return next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/admin/login');
  }
}

module.exports = { requireAuth, requireAdminSession, extractToken };
