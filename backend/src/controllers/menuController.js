const prisma = require('../config/db');

function serialize(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    enlace: item.enlace,
    orden: item.orden,
    visible: item.visible
  };
}

/**
 * GET /api/menu
 * Pública. Devuelve los ítems visibles ordenados, tal como debe
 * pintarse la navegación en el sitio público.
 * Con ?todos=true (uso interno del panel admin) devuelve también los
 * ítems ocultos, para poder gestionarlos.
 */
async function listar(req, res) {
  const incluirOcultos = req.query.todos === 'true';
  const items = await prisma.itemMenu.findMany({
    where: incluirOcultos ? {} : { visible: true },
    orderBy: { orden: 'asc' }
  });
  return res.json(items.map(serialize));
}

/**
 * GET /api/menu/:id
 * Protegida (uso del panel admin).
 */
async function obtener(req, res) {
  const id = Number(req.params.id);
  const item = await prisma.itemMenu.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Ítem de menú no encontrado.' });
  return res.json(serialize(item));
}

/**
 * POST /api/menu
 * Protegida. Body: { nombre, enlace, orden?, visible? }
 */
async function crear(req, res) {
  const { nombre, enlace, orden, visible } = req.body || {};

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre del ítem de menú es obligatorio.' });
  }
  if (!enlace || !String(enlace).trim()) {
    return res.status(400).json({ error: 'El enlace (ej. "#productos" o una URL) es obligatorio.' });
  }

  const item = await prisma.itemMenu.create({
    data: {
      nombre: String(nombre).trim(),
      enlace: String(enlace).trim(),
      orden: orden !== undefined && orden !== '' ? Number(orden) : 0,
      visible: visible === undefined ? true : visible === 'true' || visible === true
    }
  });

  return res.status(201).json(serialize(item));
}

/**
 * PUT /api/menu/:id
 * Protegida.
 */
async function actualizar(req, res) {
  const id = Number(req.params.id);
  const actual = await prisma.itemMenu.findUnique({ where: { id } });
  if (!actual) return res.status(404).json({ error: 'Ítem de menú no encontrado.' });

  const { nombre, enlace, orden, visible } = req.body || {};

  const data = {};
  if (nombre !== undefined && String(nombre).trim()) data.nombre = String(nombre).trim();
  if (enlace !== undefined && String(enlace).trim()) data.enlace = String(enlace).trim();
  if (orden !== undefined && orden !== '') data.orden = Number(orden);
  if (visible !== undefined) data.visible = visible === 'true' || visible === true;

  const item = await prisma.itemMenu.update({ where: { id }, data });
  return res.json(serialize(item));
}

/**
 * DELETE /api/menu/:id
 * Protegida.
 */
async function eliminar(req, res) {
  const id = Number(req.params.id);
  const actual = await prisma.itemMenu.findUnique({ where: { id } });
  if (!actual) return res.status(404).json({ error: 'Ítem de menú no encontrado.' });

  await prisma.itemMenu.delete({ where: { id } });
  return res.json({ ok: true });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
