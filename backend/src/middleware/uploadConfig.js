const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// La extensión del archivo se deriva SIEMPRE del tipo MIME real (no del
// nombre original), para impedir que un atacante suba contenido que luego
// se sirva como HTML/JS (stored XSS) o con una extensión engañosa.
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};
const MAX_SIZE = Number(process.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024); // 5MB por defecto

module.exports = { ALLOWED_MIME, MIME_TO_EXT, MAX_SIZE };
