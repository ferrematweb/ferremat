/**
 * Convierte un texto en un slug simple y estable (sin tildes, minúsculas,
 * espacios y símbolos convertidos en guiones). Se usa para generar el
 * "slug" de una categoría a partir de su nombre cuando el admin no
 * especifica uno manualmente.
 */
function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes/diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

module.exports = { slugify };
