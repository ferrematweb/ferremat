const prisma = require('../config/db');
const { resolveImageUrl } = require('../utils/urls');
const { slugify } = require('../utils/slugify');
const { imagePath, borrarImagen } = require('../utils/storage');

function serialize(categoria) {
  return {
    id: categoria.id,
    slug: categoria.slug,
    nombre: categoria.nombre,
    orden: categoria.orden,
    imagen: resolveImageUrl(categoria.imagen),
    destacada: categoria.destacada,
    totalProductos: categoria._count ? categoria._count.productos : undefined
  };
}

/**
 * GET /api/categorias
 * Pública. Devuelve todas las categorías ordenadas por "orden".
 */
async function listar(req, res) {
  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: 'asc' },
    include: { _count: { select: { productos: true } } }
  });
  return res.json(categorias.map(serialize));
}

/**
 * GET /api/categorias/:id
 * Pública.
 */
async function obtener(req, res) {
  const id = Number(req.params.id);
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { productos: true } } }
  });
  if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
  return res.json(serialize(categoria));
}

/**
 * POST /api/categorias
 * Protegida. Crea una categoría nueva.
 * Body (multipart/form-data o JSON): nombre, slug? , orden?, destacada?, imagenUrl?
 * Archivo opcional: campo "imagen" (subida local, tiene prioridad sobre imagenUrl)
 */
async function crear(req, res) {
  const { nombre, slug, orden, destacada, imagenUrl } = req.body || {};

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
  }

  const slugFinal = slugify(slug || nombre);
  if (!slugFinal) {
    return res.status(400).json({ error: 'No se pudo generar un slug válido para esta categoría.' });
  }

  const existente = await prisma.categoria.findUnique({ where: { slug: slugFinal } });
  if (existente) {
    return res.status(409).json({ error: 'Ya existe una categoría con ese slug: ' + slugFinal });
  }

  let imagen = null;
  if (req.file) {
    imagen = imagePath(req.file, 'categorias');
  } else if (imagenUrl && String(imagenUrl).trim()) {
    imagen = String(imagenUrl).trim();
  }

  const categoria = await prisma.categoria.create({
    data: {
      nombre: String(nombre).trim(),
      slug: slugFinal,
      orden: orden !== undefined && orden !== '' ? Number(orden) : 0,
      destacada: destacada === 'true' || destacada === true,
      imagen
    }
  });

  return res.status(201).json(serialize(categoria));
}

/**
 * PUT /api/categorias/:id
 * Protegida. Actualiza una categoría existente.
 */
async function actualizar(req, res) {
  const id = Number(req.params.id);
  const categoriaActual = await prisma.categoria.findUnique({ where: { id } });
  if (!categoriaActual) return res.status(404).json({ error: 'Categoría no encontrada.' });

  const { nombre, slug, orden, destacada, imagenUrl, eliminarImagen } = req.body || {};

  const data = {};
  if (nombre !== undefined && String(nombre).trim()) data.nombre = String(nombre).trim();

  if (slug !== undefined && String(slug).trim()) {
    const slugFinal = slugify(slug);
    if (slugFinal !== categoriaActual.slug) {
      const choque = await prisma.categoria.findUnique({ where: { slug: slugFinal } });
      if (choque) return res.status(409).json({ error: 'Ya existe una categoría con ese slug: ' + slugFinal });
      data.slug = slugFinal;
    }
  }

  if (orden !== undefined && orden !== '') data.orden = Number(orden);
  if (destacada !== undefined) data.destacada = destacada === 'true' || destacada === true;

  let imagenAnterior = null;
  if (req.file) {
    data.imagen = imagePath(req.file, 'categorias');
    imagenAnterior = categoriaActual.imagen;
  } else if (imagenUrl !== undefined && String(imagenUrl).trim()) {
    data.imagen = String(imagenUrl).trim();
    imagenAnterior = categoriaActual.imagen;
  } else if (eliminarImagen === 'true' || eliminarImagen === true) {
    data.imagen = null;
    imagenAnterior = categoriaActual.imagen;
  }

  const categoria = await prisma.categoria.update({ where: { id }, data });

  if (imagenAnterior) await borrarImagen(imagenAnterior);

  return res.json(serialize(categoria));
}

/**
 * DELETE /api/categorias/:id
 * Protegida. Rechaza el borrado si la categoría tiene productos asociados
 * (evita huérfanos y evita romper el frontend público).
 */
async function eliminar(req, res) {
  const id = Number(req.params.id);
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { productos: true } } }
  });
  if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });

  if (categoria._count.productos > 0) {
    return res.status(409).json({
      error:
        'No se puede eliminar: hay ' +
        categoria._count.productos +
        ' producto(s) en esta categoría. Muévelos o elimínalos primero.'
    });
  }

  await prisma.categoria.delete({ where: { id } });
  if (categoria.imagen) await borrarImagen(categoria.imagen);

  return res.json({ ok: true });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
