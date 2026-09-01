/**
 * SEO MIDDLEWARE
 * =====================================================================
 * El catálogo del sitio se carga con JavaScript desde la API (/api/productos),
 * y los buscadores (Google) y los crawlers de IA (GPT, Claude, Perplexity…)
 * NO ejecutan JavaScript. Por eso, aunque el sitio muestre productos, un
 * crawler solo vería la página vacía y no sabría qué vendes.
 *
 * Este middleware intercepta la petición a la página principal (/), lee los
 * productos REALES desde la base de datos y los inyecta en el HTML como:
 *
 *   1) JSON-LD Schema.org (ItemList de Productos)  -> para Google e IA.
 *   2) una lista de palabras clave (marcas + herramientas) en un <meta>.
 *
 * Resultado: cuando alguien busca "taladros", "herramientas TOTAL",
 * "amoladora", etc., los buscadores y la IA pueden asociar tu web con esos
 * términos, y siempre sincronizado con la base de datos (sin editar HTML).
 * =====================================================================
 */
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const { resolveImageUrl } = require('../utils/urls');

// Dominio público (mismo placeholder que en index.html/robots/sitemap).
// DOMINIO SEO (cambiar por https://tudominio.com)
const SITE_URL = process.env.SEO_SITE_URL || 'https://ferremat.pe';

const INDEX_PATH = path.join(__dirname, '../../../frontend/index.html');

// Palabras clave de herramientas y categorías que queremos posicionar,
// aunque el producto no sea necesariamente de esa marca. Se mezclan con
// las marcas reales detectadas y los nombres de categorías de la BD.
const KEYWORDS_BASE = [
  'ferretería Chiclayo',
  'herramientas',
  'herramientas eléctricas',
  'herramientas manuales',
  'taladro',
  'taladros',
  'taladro percutor',
  'taladros Total',
  'amoladora',
  'amoladora angular',
  'herramientas Total',
  'Taladro Total',
  'sierra circular',
  'atornillador inalámbrico',
  'nivel láser',
  'línea cerámica',
  'enchapados',
  'cortadora de cerámica',
  'materiales de construcción',
  'gasfitería',
  'electricidad',
  'pinturas',
  'implementos de seguridad',
  'herramientas para maestros'
];

// Marcas que identificamos por palabras clave dentro de los nombres de producto.
const MARCAS_CONOCIDAS = [
  'TOTAL',
  'Mi Delfín',
  'WADFOW',
  'REDBO',
  'KAILI',
  'FMC',
  'CORTAG',
  'NEW MASTER',
  'MEGA',
  'PRIME'
];

function detectarMarcas(productos) {
  const encontradas = new Set();
  productos.forEach(function (p) {
    const nombre = String(p.nombre || '').toUpperCase();
    MARCAS_CONOCIDAS.forEach(function (m) {
      if (nombre.indexOf(m.toUpperCase()) !== -1) encontradas.add(m);
    });
    if (p.marca && String(p.marca).trim()) encontradas.add(String(p.marca).trim());
  });
  return Array.from(encontradas);
}

/**
 * Construye un item Schema.org `Product` por producto real de la BD.
 * Si no tiene precio o imagen completa se omite esa parte (para no marcar
 * datos erróneos).
 */
function aProductoJsonLd(p, index) {
  const imagen = resolveImageUrl(p.imagen);
  const item = {
    '@type': 'Product',
    name: p.nombre,
    description: p.descripcion || undefined,
    sku: p.sku || undefined,
    category: p.categoria ? p.categoria.nombre : undefined,
    itemCondition: 'https://schema.org/NewCondition'
  };

  if (p.marca) item.brand = { '@type': 'Brand', name: p.marca };
  if (imagen) item.image = imagen;
  if (typeof p.precio === 'number' && p.precio !== null) {
    item.offers = {
      '@type': 'Offer',
      priceCurrency: 'PEN',
      price: p.precio,
      availability: p.disponible === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: SITE_URL + '/#productos'
    };
  }

  return {
    '@type': 'ListItem',
    position: index + 1,
    item
  };
}

/**
 * Genera el bloque <head> adicional (keywords + JSON-LD de productos).
 */
function generarSeo(productos) {
  const marcas = detectarMarcas(productos);

  const keywords = Array.from(
    new Set([].concat(KEYWORDS_BASE, marcas, productos.map(function (p) { return p.nombre; })))
  )
    .filter(Boolean)
    .slice(0, 80)
    .join(', ');

  // ItemList de todos los productos disponibles (para Google Shopping/rich results y IA).
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Productos de FERREMAT CIX',
    numberOfItems: productos.length,
    itemListElement: productos.map(aProductoJsonLd)
  };

  // Bloque de "soluciones/categorías" que ayuda a asociar la web con
  // búsquedas de herramientas aunque el nombre exacto no coincida.
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Productos y Herramientas', item: SITE_URL + '/#productos' },
      { '@type': 'ListItem', position: 3, name: 'Marcas: ' + (marcas.slice(0, 5).join(', ') || 'importación'), item: SITE_URL + '/#categorias' }
    ]
  };

  const seo = [
    '<meta name="keywords" content="' + escapeHtml(keywords) + '">',
    '<script type="application/ld+json">' + JSON.stringify(itemList) + '</script>',
    '<script type="application/ld+json">' + JSON.stringify(breadcrumb) + '</script>'
  ].join('\n  ');

  return seo;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let cacheHtml = null; // índice.html en bruto (un solo read en producción)
let lastTodos = NaN;  // para no re-listar productos en cada request si no cambiaron

/**
 * Middleware Express: intercepta GET / (la página principal), consulta los
 * productos y reemplaza la página con las etiquetas SEO inyectadas.
 */
async function inyectarSeo(req, res, next) {
  if (req.method !== 'GET') return next();
  // Solo aplica a la raíz o a la página principal (no a /admin, /api, assets…).
  if (req.path !== '/' && req.path !== '/index.html') return next();
  if (req.path === '/robots.txt' || req.path === '/sitemap.xml') return next();

  try {
    if (!cacheHtml) {
      cacheHtml = fs.readFileSync(INDEX_PATH, 'utf8');
    }

    const productos = await prisma.producto.findMany({
      where: { disponible: true !== false },
      include: { categoria: true },
      orderBy: [{ destacado: 'desc' }, { creadoEn: 'desc' }]
    });

    // Ruta del head adicional sin el cierre normal (para insertarlo antes de </head>).
    const bloqueSeo = generarSeo(productos);

    let html = cacheHtml;
    // Elimina cualquier versión previa inyectada (idempotente).
    html = html.replace(/<!-- __SEOFERREMAT_START__ -->[\s\S]*?<!-- __SEOFERREMAT_END__ -->/, '');
    const marcado =
      '<!-- __SEOFERREMAT_START__ -->\n  ' +
      bloqueSeo +
      '\n  <!-- __SEOFERREMAT_END__ -->';

    // Inserta justo antes de </head>.
    if (html.indexOf('</head>') !== -1) {
      html = html.replace('</head>', marcado + '\n</head>');
    } else {
      html += marcado;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[SEO] No se pudo inyectar datos estructurados:', err.message);
    return next(); // si falla, deja pasar el HTML normal
  }
}

module.exports = { inyectarSeo };
