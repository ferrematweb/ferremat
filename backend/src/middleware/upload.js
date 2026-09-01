const { buildUploader, UPLOADS_ROOT } = require('../utils/storage');

/**
 * Crea un middleware de subida de imagen ("imagen"/"imagenes") que guarda en
 * Supabase Storage si SUPABASE_URL + SUPABASE_SERVICE_KEY están configurados,
 * o en disco local (backend/src/uploads) como fallback. El nombre de archivo
 * se genera aleatoriamente y la extensión se deriva del MIME real para evitar
 * path traversal y stored XSS.
 */
const uploadProducto = buildUploader('productos');
const uploadCategoria = buildUploader('categorias');
const uploadProductoGaleria = buildUploader('productos');

/**
 * Envuelve un middleware de multer para convertir sus errores en un
 * JSON consistente en vez de dejar que exploten como HTML.
 */
function handleUpload(multerMiddleware) {
  return function (req, res, next) {
    multerMiddleware(req, res, function (err) {
      if (err) {
        return res.status(400).json({ error: err.message || 'Error al subir la imagen.' });
      }
      next();
    });
  };
}

module.exports = {
  uploadProducto: handleUpload(uploadProducto.single('imagen')),
  uploadCategoria: handleUpload(uploadCategoria.single('imagen')),
  uploadProductoGaleria: handleUpload(uploadProductoGaleria.array('imagenes', 10)),
  UPLOADS_ROOT
};
