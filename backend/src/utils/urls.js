/**
 * Convierte una ruta de imagen guardada en la base de datos en una URL
 * absoluta y utilizable por el frontend.
 *
 * - Si "imagen" ya es una URL completa (http/https, ej. una imagen externa
 *   pegada por el admin), se devuelve tal cual.
 * - Si "imagen" es una ruta relativa de una subida local (ej.
 *   "/uploads/productos/archivo.jpg"), se le antepone la URL pública
 *   del backend (BACKEND_URL) para que el sitio público (que puede
 *   vivir en otro dominio/puerto) pueda mostrarla directamente.
 * - Si no hay imagen, se devuelve null.
 */
function resolveImageUrl(imagen) {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;
  const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  const rel = imagen.startsWith('/') ? imagen : '/' + imagen;
  return base + rel;
}

module.exports = { resolveImageUrl };
