/**
 * Generador de SEO estático para Netlify.
 * Lee los productos REALES de la BD, genera el JSON-LD (ItemList + BreadcrumbList)
 * y lo inyecta automáticamente en frontend/index.html antes de </head>.
 *
 * Uso (desde backend/):
 *   npm run seo:estatico
 *
 * Si cambia el catálogo (agregas/quitas productos), ejecuta este script
 * una vez para que Google e IA vean los productos actualizados.
 */
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/db');
const { resolveImageUrl } = require('../src/utils/urls');

const SITE_URL = process.env.SEO_SITE_URL || 'https://ferremat.pages.dev';
const INDEX_PATH = path.join(__dirname, '../../frontend/index.html');

const KEYWORDS_BASE = [
  'ferretería Chiclayo', 'herramientas', 'herramientas eléctricas', 'herramientas manuales',
  'taladro', 'taladros', 'taladro percutor', 'taladros Total', 'amoladora', 'amoladora angular',
  'herramientas Total', 'Taladro Total', 'sierra circular', 'atornillador inalámbrico', 'nivel láser',
  'línea cerámica', 'enchapados', 'cortadora de cerámica', 'materiales de construcción',
  'gasfitería', 'electricidad', 'pinturas', 'implementos de seguridad', 'herramientas para maestros'
];

const MARCAS_CONOCIDAS = [
  'TOTAL', 'Mi Delfín', 'WADFOW', 'REDBO', 'KAILI', 'FMC', 'CORTAG', 'NEW MASTER', 'MEGA', 'PRIME'
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
      availability: p.disponible === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: SITE_URL + '/#productos'
    };
  }
  return { '@type': 'ListItem', position: index + 1, item };
}

function generar(productos) {
  const marcas = detectarMarcas(productos);
  const keywords = Array.from(
    new Set([].concat(KEYWORDS_BASE, marcas, productos.map(function (p) { return p.nombre; })))
  )
    .filter(Boolean)
    .slice(0, 80)
    .join(', ');

  // Solo productos con precio + imagen válidos para que Google los marque como válidos en rich results.
  // Los productos con precio=null ("Consultar precio") se siguen viendo en la tienda, solo no entran al ItemList SEO.
  const productosValidos = productos.filter(function (p) {
    return typeof p.precio === 'number' && p.precio !== null && !!resolveImageUrl(p.imagen);
  });

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Productos de FERREMAT CIX',
    numberOfItems: productosValidos.length,
    itemListElement: productosValidos.map(aProductoJsonLd)
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Productos y Herramientas', item: SITE_URL + '/#productos' },
      { '@type': 'ListItem', position: 3, name: 'Marcas: ' + (marcas.slice(0, 5).join(', ') || 'importación'), item: SITE_URL + '/#categorias' }
    ]
  };

  const escapeHtml = function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const seo = [
    '<meta name="keywords" content="' + escapeHtml(keywords) + '">',
    '<script type="application/ld+json">' + JSON.stringify(itemList) + '</script>',
    '<script type="application/ld+json">' + JSON.stringify(breadcrumb) + '</script>'
  ].join('\n  ');

  return '<!-- __SEOFERREMAT_START__ -->\n  ' + seo + '\n  <!-- __SEOFERREMAT_END__ -->';
}

async function main() {
  try {
    const productos = await prisma.producto.findMany({
      where: { oculto: false },
      include: { categoria: true },
      orderBy: [{ destacado: 'desc' }, { creadoEn: 'desc' }]
    });
    const fragmento = generar(productos) + '\n';

    let html = fs.readFileSync(INDEX_PATH, 'utf8');
    // Idempotente: elimina cualquier versión previa inyectada.
    html = html.replace(/<!-- __SEOFERREMAT_START__ -->[\s\S]*?<!-- __SEOFERREMAT_END__ -->/, '');
    if (html.indexOf('</head>') !== -1) {
      html = html.replace('</head>', fragmento + '</head>');
    } else {
      html += fragmento;
    }
    fs.writeFileSync(INDEX_PATH, html, 'utf8');

    console.log('SEO estático actualizado correctamente:');
    console.log('  Productos :', productos.length);
    console.log('  index.html:', INDEX_PATH);
    console.log('  (keywords + JSON-LD ItemList/BreadcrumbList inyectados antes de </head>)');
  } catch (e) {
    console.error('Error generando SEO:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(function () {});
  }
}

main();
