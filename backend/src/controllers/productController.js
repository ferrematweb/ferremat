const prisma = require('../config/db');
const { resolveImageUrl } = require('../utils/urls');
const { imagePath, borrarImagen, borrarImagenes } = require('../utils/storage');

function serialize(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    sku: producto.sku,
    marca: producto.marca,
    categoriaId: producto.categoriaId,
    categoria: producto.categoria
      ? { id: producto.categoria.id, slug: producto.categoria.slug, nombre: producto.categoria.nombre }
      : undefined,
    precio: producto.precio,
    precioAnterior: producto.precioAnterior,
    precioMayorista: producto.precioMayorista,
    cantidadMayorista: producto.cantidadMayorista,
    imagen: resolveImageUrl(producto.imagen),
    // Galería de fotos adicionales (para el efecto hover en el frontend).
    // La primera normalmente coincide con "imagen".
    imagenes: (producto.imagenes || [])
      .slice()
      .sort(function (a, b) { return a.orden - b.orden; })
      .map(function (i) { return resolveImageUrl(i.url); }),
    disponible: producto.disponible,
    destacado: producto.destacado,
    nuevo: producto.nuevo,
    actualizadoEn: producto.actualizadoEn
  };
}

function parseBooleanQuery(valor) {
  if (valor === undefined) return undefined;
  return valor === 'true' || valor === '1';
}

/**
 * GET /api/productos
 * Pública. Filtros opcionales por query string:
 *   ?categoria=<slug>       filtra por categoría
 *   ?nuevo=true             solo "nuevos ingresos"
 *   ?destacado=true         solo destacados
 *   ?disponible=true|false  disponibilidad
 *   ?q=texto                búsqueda en nombre/descripción/sku
 */
async function listar(req, res) {
  const { categoria, nuevo, destacado, disponible, q } = req.query;

  const where = {};
  if (categoria) where.categoria = { slug: String(categoria) };
  if (parseBooleanQuery(nuevo) !== undefined) where.nuevo = parseBooleanQuery(nuevo);
  if (parseBooleanQuery(destacado) !== undefined) where.destacado = parseBooleanQuery(destacado);
  if (parseBooleanQuery(disponible) !== undefined) where.disponible = parseBooleanQuery(disponible);

  if (q && String(q).trim()) {
    const texto = String(q).trim();
    where.OR = [
      { nombre: { contains: texto, mode: 'insensitive' } },
      { descripcion: { contains: texto, mode: 'insensitive' } },
      { sku: { contains: texto, mode: 'insensitive' } }
    ];
  }

  const productos = await prisma.producto.findMany({
    where,
    include: {
      categoria: true,
      imagenes: { orderBy: { orden: 'asc' } }
    },
    orderBy: [{ destacado: 'desc' }, { creadoEn: 'desc' }]
  });

  return res.json(productos.map(serialize));
}

/**
 * GET /api/productos/:id
 * Pública.
 */
async function obtener(req, res) {
  const id = Number(req.params.id);
  const producto = await prisma.producto.findUnique({ where: { id }, include: { categoria: true, imagenes: { orderBy: { orden: 'asc' } } } });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
  return res.json(serialize(producto));
}

function numeroOpcional(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

/**
 * Arma la lista final de URLs de la galería a partir de:
 *  - req.files: archivos subidos por el campo "imagenes"  -> /uploads/productos/<file>
 *  - imagenesUrl: arreglo de URLs (JSON string), que puede contener URLs manuales
 *    pegadas por el usuario en el panel.
 * Devuelve un array plano de URLs (sin duplicados) o [].
 */
function parseGalerias(req, imagenesUrl) {
  const urls = [];

  if (req.files && Array.isArray(req.files) && req.files.length) {
    req.files.forEach(function (f) { const u = imagePath(f, 'productos'); if (u) urls.push(u); });
  }

  if (imagenesUrl) {
    let lista = imagenesUrl;
    if (typeof imagenesUrl === 'string') {
      try {
        lista = JSON.parse(imagenesUrl);
      } catch (e) {
        lista = [];
      }
    }
    if (Array.isArray(lista)) {
      lista.forEach(function (u) {
        if (u && String(u).trim()) urls.push(String(u).trim());
      });
    }
  }

  // Sin duplicados, en orden.
  const seen = new Set();
  return urls.filter(function (u) { if (seen.has(u)) return false; seen.add(u); return true; });
}

/**
 * Borra los archivos (Supabase o disco) de la galería de un producto.
 */
async function borrarGaleriasLocales(imagenes) {
  await borrarImagenes(imagenes);
}

/**
 * POST /api/productos
 * Protegida. Crea un producto.
 * Body (multipart/form-data o JSON): nombre, descripcion, categoriaId,
 *   precio?, precioAnterior?, precioMayorista?, cantidadMayorista?,
 *   sku?, marca?, disponible?, destacado?, nuevo?, imagenUrl?
 * Archivo opcional: campo "imagen"
 */
async function crear(req, res) {
  const {
    nombre,
    descripcion,
    categoriaId,
    precio,
    precioAnterior,
    precioMayorista,
    cantidadMayorista,
    sku,
    marca,
    disponible,
    destacado,
    nuevo,
    imagenUrl
  } = req.body || {};

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
  }
  if (!categoriaId) {
    return res.status(400).json({ error: 'Debes indicar la categoría del producto.' });
  }

  const categoria = await prisma.categoria.findUnique({ where: { id: Number(categoriaId) } });
  if (!categoria) {
    return res.status(400).json({ error: 'La categoría indicada no existe.' });
  }

  let imagen = null;
  if (req.file) {
    imagen = imagePath(req.file, 'productos');
  } else if (imagenUrl && String(imagenUrl).trim()) {
    imagen = String(imagenUrl).trim();
  }

  const galeria = parseGalerias(req, req.body && req.body.imagenesUrl);

  const producto = await prisma.producto.create({
    data: {
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      categoriaId: Number(categoriaId),
      precio: numeroOpcional(precio),
      precioAnterior: numeroOpcional(precioAnterior),
      precioMayorista: numeroOpcional(precioMayorista),
      cantidadMayorista: cantidadMayorista !== undefined && cantidadMayorista !== '' ? Math.trunc(Number(cantidadMayorista)) : null,
      sku: sku ? String(sku).trim() : null,
      marca: marca ? String(marca).trim() : null,
      disponible: disponible === undefined ? true : disponible === 'true' || disponible === true,
      destacado: destacado === 'true' || destacado === true,
      nuevo: nuevo === 'true' || nuevo === true,
      imagen
    }
  });

  // Galería: si hay más de una imagen, guarda la "imagen principal" como la
  // primera de la lista ordenada (así el hover también la incluye).
  const listaGaleria = galeria.length ? galeria : [];
  if (imagen && listaGaleria.indexOf(imagen) === -1) listaGaleria.unshift(imagen);

  if (listaGaleria.length) {
    await prisma.imagenProducto.createMany({
      data: listaGaleria.map(function (u, idx) {
        return { productoId: producto.id, url: u, orden: idx };
      })
    });
  }

  const productoFinal = await prisma.producto.findUnique({
    where: { id: producto.id },
    include: { categoria: true, imagenes: { orderBy: { orden: 'asc' } } }
  });

  return res.status(201).json(serialize(productoFinal));
}

/**
 * PUT /api/productos/:id
 * Protegida. Actualiza un producto existente (actualización parcial).
 */
async function actualizar(req, res) {
  const id = Number(req.params.id);
  const productoActual = await prisma.producto.findUnique({ where: { id }, include: { imagenes: { orderBy: { orden: 'asc' } } } });
  if (!productoActual) return res.status(404).json({ error: 'Producto no encontrado.' });

  const {
    nombre,
    descripcion,
    categoriaId,
    precio,
    precioAnterior,
    precioMayorista,
    cantidadMayorista,
    sku,
    marca,
    disponible,
    destacado,
    nuevo,
    imagenUrl,
    eliminarImagen,
    eliminarPrecio
  } = req.body || {};

  const data = {};

  if (nombre !== undefined && String(nombre).trim()) data.nombre = String(nombre).trim();
  if (descripcion !== undefined) data.descripcion = descripcion ? String(descripcion).trim() : null;

  if (categoriaId !== undefined && categoriaId !== '') {
    const categoria = await prisma.categoria.findUnique({ where: { id: Number(categoriaId) } });
    if (!categoria) return res.status(400).json({ error: 'La categoría indicada no existe.' });
    data.categoriaId = Number(categoriaId);
  }

  if (eliminarPrecio === 'true' || eliminarPrecio === true) {
    data.precio = null;
    data.precioAnterior = null;
    data.precioMayorista = null;
    data.cantidadMayorista = null;
  } else {
    if (precio !== undefined) data.precio = numeroOpcional(precio);
    if (precioAnterior !== undefined) data.precioAnterior = numeroOpcional(precioAnterior);
    if (precioMayorista !== undefined) data.precioMayorista = numeroOpcional(precioMayorista);
    if (cantidadMayorista !== undefined) {
      data.cantidadMayorista = cantidadMayorista !== '' ? Math.trunc(Number(cantidadMayorista)) : null;
    }
  }

  if (sku !== undefined) data.sku = sku ? String(sku).trim() : null;
  if (marca !== undefined) data.marca = marca ? String(marca).trim() : null;
  if (disponible !== undefined) data.disponible = disponible === 'true' || disponible === true;
  if (destacado !== undefined) data.destacado = destacado === 'true' || destacado === true;
  if (nuevo !== undefined) data.nuevo = nuevo === 'true' || nuevo === true;

  let imagenAnterior = null;
  if (req.file) {
    data.imagen = imagePath(req.file, 'productos');
    imagenAnterior = productoActual.imagen;
  } else if (imagenUrl !== undefined && String(imagenUrl).trim()) {
    data.imagen = String(imagenUrl).trim();
    imagenAnterior = productoActual.imagen;
  } else if (eliminarImagen === 'true' || eliminarImagen === true) {
    data.imagen = null;
    imagenAnterior = productoActual.imagen;
  }

  const producto = await prisma.producto.update({
    where: { id },
    data,
    include: { categoria: true, imagenes: { orderBy: { orden: 'asc' } } }
  });

  // Galería: si llegan archivos nuevos o la lista de URLs, se reemplaza toda la galería.
  const imagenesUrlBody = req.body && req.body.imagenesUrl;
  const hayNuevaGaleria = (req.files && req.files.length > 0) ||
    (imagenesUrlBody !== undefined && imagenesUrlBody !== '');

  // La imagen principal vieja solo se borrará del disco si la nueva galería
  // no la vuelve a referenciar (una misma URL puede seguir usándose).
  let conservaImagenAnterior = false;

  if (hayNuevaGaleria) {
    const galeriaAntigua = productoActual.imagenes || [];
    const listaNueva = parseGalerias(req, imagenesUrlBody).slice();
    if (data.imagen && listaNueva.indexOf(data.imagen) === -1) listaNueva.unshift(data.imagen);
    if (imagenAnterior && listaNueva.indexOf(imagenAnterior) !== -1) conservaImagenAnterior = true;

    // Borra de Supabase/disco solo los archivos que ya no se usan
    // (las URLs que se mantienen iguales no deben eliminarse).
    const enNueva = new Set(listaNueva);
    for (const img of (galeriaAntigua || [])) {
      if (!enNueva.has(img.url)) await borrarImagen(img.url);
    }

    await prisma.imagenProducto.deleteMany({ where: { productoId: id } });
    if (listaNueva.length) {
      await prisma.imagenProducto.createMany({
        data: listaNueva.map(function (u, idx) { return { productoId: id, url: u, orden: idx }; })
      });
    }
  }

  const productoFinal = await prisma.producto.findUnique({
    where: { id },
    include: { categoria: true, imagenes: { orderBy: { orden: 'asc' } } }
  });

  if (imagenAnterior && !conservaImagenAnterior) await borrarImagen(imagenAnterior);

  return res.json(serialize(productoFinal));
}

/**
 * DELETE /api/productos/:id
 * Protegida.
 */
async function eliminar(req, res) {
  const id = Number(req.params.id);
  const producto = await prisma.producto.findUnique({ where: { id }, include: { imagenes: true } });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });

  await prisma.producto.delete({ where: { id } });
  if (producto.imagen) await borrarImagen(producto.imagen);
  await borrarGaleriasLocales(producto.imagenes);

  return res.json({ ok: true });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
