const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_BUCKETS = new Set(['productos', 'categorias']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

/**
 * POST /api/uploads/presign
 * Protegido. Genera una URL firmada para subida directa del navegador a Supabase Storage
 * sin pasar por Render (evita doble salto y acelera 5-10x en móvil).
 * Body: { bucket: "productos"|"categorias", contentType: "image/jpeg" }
 * Retorna: { path, signedUrl, token, publicUrl }
 */
router.post('/presign', requireAuth, async (req, res) => {
  try {
    const { bucket, contentType } = req.body || {};
    const b = String(bucket || '').trim();
    const ct = String(contentType || 'image/jpeg').trim();

    if (!ALLOWED_BUCKETS.has(b)) {
      return res.status(400).json({ error: 'Bucket no permitido. Usa productos o categorias.' });
    }
    if (!EXT_BY_MIME[ct]) {
      return res.status(400).json({ error: 'Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF.' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Storage no configurado en el servidor.' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const ext = EXT_BY_MIME[ct];
    const path = crypto.randomBytes(16).toString('hex') + ext;

    const { data, error } = await supabase.storage.from(b).createSignedUploadUrl(path);
    if (error || !data) {
      return res.status(500).json({ error: 'No se pudo generar URL firmada: ' + (error && error.message ? error.message : 'desconocido') });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${b}/${path}`;

    // data contiene { signedUrl, path, token }
    return res.json({
      path,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error al generar presign.' });
  }
});

module.exports = router;
