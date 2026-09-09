const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { inyectarSeo } = require('./middleware/seo');

const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const menuRoutes = require('./routes/menu.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.disable('x-powered-by');

// ------------------------------------------------------------
// Configuración básica
// ------------------------------------------------------------
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // necesario para los <form> del panel admin
app.use(cookieParser());
// helmet aporta cabeceras de seguridad (nosniff, X-Frame-Options, etc.).
// La plantilla del panel admin (login.ejs) y varias vistas usan <script>
// inline, por lo que se permite 'unsafe-inline' en script-src; el resto de
// directivas se mantienen estrictas.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: null
      }
    }
  })
);

// CORS: permite que el sitio público (que puede vivir en otro dominio/puerto)
// consuma la API. CORS_ORIGIN acepta una lista separada por comas.
// Si no se define ningún origen permitido se bloquean las peticiones
// cross-origin en lugar de permitir cualquiera.
const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenesPermitidos.length ? origenesPermitidos : false,
    credentials: true
  })
);

// Límite de peticiones de login para mitigar ataques de fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 intentos de login por IP en esa ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos.' }
});

app.post('/api/auth/login', loginLimiter);

// ------------------------------------------------------------
// Vistas del panel admin (EJS)
// ------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../admin/views'));

// Inyección de datos SEO (JSON-LD de productos + keywords) en la página
// principal: hace visible el catálogo para Google y los crawlers de IA,
// que no ejecutan JavaScript. Se conecta antes de servir el estático.
app.use(inyectarSeo);

// Assets estáticos propios del panel admin (css/js del admin, no del sitio público)
app.use('/admin/assets', express.static(path.join(__dirname, '../../admin/public')));

// ------------------------------------------------------------
// Archivos subidos (imágenes de productos/categorías)
// ------------------------------------------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
  setHeaders: function (res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
}));

// ------------------------------------------------------------
// Sitio público estático (opcional, útil en desarrollo).
// En producción normalmente se sirve por separado (Nginx, Netlify, etc.),
// solo necesita apuntar su config.js al BACKEND_URL correcto.
// ------------------------------------------------------------
if (process.env.SERVE_FRONTEND !== 'false') {
  app.use('/', express.static(path.join(__dirname, '../../frontend')));
}

// ------------------------------------------------------------
// API REST
// ------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/uploads', uploadsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'ferremat-backend' }));

// ------------------------------------------------------------
// Panel admin (vistas EJS server-side)
// ------------------------------------------------------------
app.use('/admin', adminRoutes);

// ------------------------------------------------------------
// 404 para rutas de API no encontradas
// ------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado: ' + req.originalUrl });
});

// ------------------------------------------------------------
// Manejador de errores centralizado
// ------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const mensaje = (status >= 500 && isProd)
    ? 'Error interno del servidor.'
    : (err.message || 'Error interno del servidor.');
  res.status(status).json({ error: mensaje });
});

module.exports = app;

