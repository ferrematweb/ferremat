/**
 * FERREMAT — CATÁLOGO DE PRODUCTOS (vía API)
 * ============================================================
 * Este archivo YA NO contiene datos hardcodeados. En su lugar,
 * carga las categorías y productos desde el backend (ver /backend)
 * y los deja disponibles en `window.FERREMAT_CATALOG`, igual que
 * antes, para no tener que reescribir catalog.js desde cero.
 *
 * Flujo:
 *   1) Se hace fetch a GET /api/categorias y GET /api/productos
 *   2) Se guarda el resultado en window.FERREMAT_CATALOG
 *      (con la MISMA forma que tenía el catálogo hardcodeado:
 *       { CATEGORIES: [...], PRODUCTS: [...] })
 *   3) Se dispara el evento "ferremat:catalog-ready" en `document`
 *      para que catalog.js (y cualquier otro script) sepa que ya
 *      puede pintar la grilla de productos.
 *
 * Si la API no responde (backend caído, sin conexión, etc.), se
 * deja un catálogo vacío y se avisa por consola, para que el sitio
 * no se rompa aunque no pueda mostrar productos.
 * ============================================================
 */
(function (global) {
  'use strict';

  function apiUrl(path) {
    var base = (global.FERREMAT_CONFIG && global.FERREMAT_CONFIG.API_BASE_URL) || '';
    return base.replace(/\/$/, '') + path;
  }

  // Adapta la categoría que devuelve la API (id, slug, nombre, orden,
  // imagen, destacada) al formato mínimo que usa catalog.js
  // ({ slug, nombre }), conservando también los campos extra por si
  // se necesitan más adelante (ej. para pintar imágenes de categoría).
  function mapCategoria(c) {
    return {
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      orden: c.orden,
      imagen: c.imagen,
      destacada: c.destacada
    };
  }

  // Adapta el producto que devuelve la API al formato que espera
  // catalog.js: usa "categoria" como el SLUG (string), no como objeto.
  function mapProducto(p) {
    return {
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria ? p.categoria.slug : null,
      descripcion: p.descripcion || '',
      imagen: p.imagen || '',
      imagenes: Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes.slice() : [],
      sku: p.sku || '',
      marca: p.marca || '',
      disponible: !!p.disponible,
      destacado: !!p.destacado,
      nuevo: !!p.nuevo,
      precio: typeof p.precio === 'number' ? p.precio : undefined,
      precioAnterior: typeof p.precioAnterior === 'number' ? p.precioAnterior : undefined,
      precioMayorista: typeof p.precioMayorista === 'number' ? p.precioMayorista : undefined,
      cantidadMayorista: typeof p.cantidadMayorista === 'number' ? p.cantidadMayorista : undefined
    };
  }

  global.FERREMAT_CATALOG = {
    CATEGORIES: [],
    PRODUCTS: [],
    cargando: true
  };

  function anunciarListo() {
    global.FERREMAT_CATALOG.cargando = false;
    document.dispatchEvent(new CustomEvent('ferremat:catalog-ready'));
  }

  Promise.all([
    fetch(apiUrl('/api/categorias')).then(function (r) {
      if (!r.ok) throw new Error('No se pudieron cargar las categorías.');
      return r.json();
    }),
    fetch(apiUrl('/api/productos')).then(function (r) {
      if (!r.ok) throw new Error('No se pudieron cargar los productos.');
      return r.json();
    })
  ])
    .then(function (resultados) {
      var categorias = resultados[0];
      var productos = resultados[1];

      global.FERREMAT_CATALOG.CATEGORIES = categorias
        .slice()
        .sort(function (a, b) { return a.orden - b.orden; })
        .map(mapCategoria);

      global.FERREMAT_CATALOG.PRODUCTS = productos.map(mapProducto);

      anunciarListo();
    })
    .catch(function (err) {
      console.error('[FERREMAT] Error cargando el catálogo desde la API:', err);
      // Deja el catálogo vacío pero avisa igual, para que la UI
      // muestre "0 productos encontrados" en vez de quedarse colgada.
      anunciarListo();
    });
})(window);
