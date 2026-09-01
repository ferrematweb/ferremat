const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const usaSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let supabase = null;
function getSupabase() {
  if (!usaSupabase) return null;
  if (!supabase) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

/**
 * ¿Este valor de imagen guardado en BD hace referencia a Supabase Storage?
 * Detecta URLs públicas de Supabase del tipo ...supabase.co/storage/v1/object/public/...
 */
function esSupabaseUrl(imagen) {
  return Boolean(imagen) && /supabase\.co\/storage\/v1\/object\/public\//.test(imagen);
}

/**
 * Decide el valor a persistir en la BD a partir de un archivo subido.
 *  - En modo Supabase: devuelve la URL pública completa de Supabase Storage.
 *  - En modo local: devuelve la ruta relativa /uploads/<folder>/<file>.
 */
function imagePath(file, folder) {
  if (!file) return null;
  if (file.supabaseUrl) return file.supabaseUrl;
  return '/uploads/' + folder + '/' + file.filename;
}

/**
 * Borra una imagen del almacenamiento (Supabase Storage si es URL de Supabase,
 * o disco local si es ruta /uploads/...). best-effort, nunca lanza.
 */
async function borrarImagen(imagen) {
  if (!imagen) return;
  const client = getSupabase();
  if (esSupabaseUrl(imagen) && client) {
    try {
      // path.PARAMS.project/storage/v1/object/public/<bucket>/<ruta>
      const despues = imagen.split('/storage/v1/object/public/')[1]; // "<bucket>/<ruta>"
      if (!despues) return;
      const bucket = despues.split('/')[0];
      const ruta = despues.slice(bucket.length + 1);
      await client.storage.from(bucket).remove([ruta]);
    } catch (e) {
      console.error('No se pudo borrar la imagen en Supabase:', e.message);
    }
    return;
  }
  if (!imagen.startsWith('/uploads/')) return;
  const ruta = path.join(__dirname, '..', imagen.replace(/^\/uploads\//, 'uploads/'));
  fs.unlink(ruta, () => {});
}

/**
 * Borra un conjunto de imágenes (array de strings o de objetos con .url).
 */
async function borrarImagenes(lista) {
  await Promise.all((lista || []).map(function (img) {
    return borrarImagen(typeof img === 'string' ? img : (img && img.url));
  }));
}

/**
 * Middleware de multer personalizado que guarda la imagen en Supabase Storage
 * si SUPABASE_URL + SUPABASE_SERVICE_KEY están configurados; si no, la guarda
 * en disco local (fallback para `npm run dev`). En ambos casos conserva la
 * validación de tipo MIME y el nombre seguro.
 */
function buildUploader(carpeta) {
  const { MIME_TO_EXT, ALLOWED_MIME, MAX_SIZE } = require('../middleware/uploadConfig');

  const fileFilter = function (req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  };

  const client = getSupabase();
  const useDisk = !client;

  const storage = useDisk
    ? multer.diskStorage({
        destination: function (req, file, cb) {
          const destino = path.join(UPLOADS_ROOT, carpeta);
          fs.mkdirSync(destino, { recursive: true });
          cb(null, destino);
        },
        filename: function (req, file, cb) {
          const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
          cb(null, crypto.randomBytes(16).toString('hex') + ext);
        }
      })
    : multer.memoryStorage();

  const multerInstance = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE }
  });

  // En modo Supabase, tras subir el buffer hay que guardarlo en Storage y
  // reescribir req.file con la URL pública. Como multer no nos deja rehacerlo
  // en el storage engine fácilmente, interceptamos tras la subida a memoria.
  const _single = multerInstance.single.bind(multerInstance);
  const _array = multerInstance.array.bind(multerInstance);

  const subirBufferASupabase = async function (file) {
    if (!client || !file || !file.buffer) return file;
    const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
    const nombre = crypto.randomBytes(16).toString('hex') + ext;
    const { error } = await client.storage.from(carpeta).upload(nombre, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
    if (error) {
      const e = new Error('No se pudo subir la imagen a Supabase Storage: ' + error.message);
      e.status = 400;
      throw e;
    }
    const { data } = client.storage.from(carpeta).getPublicUrl(nombre);
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      filename: data.publicUrl,
      path: data.publicUrl,
      supabaseUrl: data.publicUrl,
      folder: carpeta
    };
  };

  if (!client) {
    return {
      single: _single,
      array: _array
    };
  }

  return {
    single: function (field) {
      const mid = _single(field);
      return function (req, res, next) {
        mid(req, res, async function (err) {
          if (err) return next(err);
          try {
            if (req.file) req.file = await subirBufferASupabase(req.file);
            next();
          } catch (e) {
            next(e);
          }
        });
      };
    },
    array: function (field, max) {
      const mid = _array(field, max);
      return function (req, res, next) {
        mid(req, res, async function (err) {
          if (err) return next(err);
          try {
            if (req.files && req.files.length) {
              req.files = await Promise.all(req.files.map(function (f) {
                return subirBufferASupabase(f);
              }));
            }
            next();
          } catch (e) {
            next(e);
          }
        });
      };
    }
  };
}

module.exports = {
  usaSupabase,
  borrarImagen,
  borrarImagenes,
  imagePath,
  esSupabaseUrl,
  buildUploader,
  UPLOADS_ROOT
};
