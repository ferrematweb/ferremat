/**
 * MIGRACIÓN COMPLETA del catálogo local (80 productos) a Supabase.
 * Lee la BD local, sube las imágenes a Supabase Storage y escribe en Supabase.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const LOCAL_DB_URL =
  process.env.LOCAL_DATABASE_URL ||
  'postgresql://usuario:password@localhost:5432/ferremat_db?schema=public';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'productos';
const UPLOADS_DIR = path.join(__dirname, '..', 'src', 'uploads', 'productos');

const prismaSupabase = new PrismaClient();
const prismaLocal = new PrismaClient({ datasources: { db: { url: LOCAL_DB_URL } } });

function supabaseFetch(pathname, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, SUPABASE_URL);
    const req = https.request(url, {
      method: (options && options.method) || 'GET',
      headers: Object.assign(
        { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        (options && options.headers) || {}
      )
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (options && options.body) req.write(options.body);
    req.end();
  });
}

async function subirImagen(nombreArchivo) {
  const ruta = path.join(UPLOADS_DIR, nombreArchivo);
  if (!fs.existsSync(ruta)) return { ok: false, motivo: 'no existe en disco' };
  const buffer = fs.readFileSync(ruta);
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${nombreArchivo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: buffer
  });
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
  if (res.status === 200 || res.status === 201) {
    return { ok: true, nombre: nombreArchivo, estado: 'subida', publicUrl };
  }
  return { ok: false, nombre: nombreArchivo, estado: 'error(' + res.status + '): ' + res.data.substr(0, 120) };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY. Asegurate de que .env apunte a Supabase.');
    process.exit(1);
  }
  try {
    const pLocal = await prismaLocal.producto.findMany({ include: { categoria: true } });
    console.log('Productos leidos de BD local:', pLocal.length);

    console.log('\n=== SUBIENDO IMAGENES A SUPABASE STORAGE ===');
    const mapaImagenes = {};
    for (const p of pLocal) {
      if (p.imagen && p.imagen.startsWith('/uploads/')) {
        const nombre = path.basename(p.imagen);
        if (!mapaImagenes[nombre]) {
          const r = await subirImagen(nombre);
          mapaImagenes[nombre] = r;
          console.log((r.ok ? 'OK ' : 'FALLO ') + r.nombre + ' -> ' + (r.estado || r.motivo || ''));
        }
      }
    }
    const conUploads = Object.keys(mapaImagenes).length;
    const okUploads = Object.values(mapaImagenes).filter(v => v.ok).length;
    console.log('Imagenes procesadas:', conUploads, '| OK:', okUploads, '| FAIL:', (conUploads - okUploads));

    console.log('\n=== SINCRONIZANDO CATEGORIAS ===');
    const catSet = new Set();
    for (const p of pLocal) if (p.categoria) catSet.add(p.categoria.nombre);
    for (const nombre of catSet) {
      const localCat = pLocal.find(p => p.categoria && p.categoria.nombre === nombre).categoria;
      await prismaSupabase.categoria.upsert({
        where: { slug: localCat.slug },
        update: {},
        create: { slug: localCat.slug, nombre: localCat.nombre, orden: localCat.orden || 0 }
      });
      console.log('Categoria ok:', nombre);
    }

    console.log('\n=== SINCRONIZANDO PRODUCTOS ===');
    let creados = 0, actualizados = 0;
    for (const p of pLocal) {
      let imagen = p.imagen;
      if (imagen && imagen.startsWith('/uploads/')) {
        const nombre = path.basename(imagen);
        if (mapaImagenes[nombre] && mapaImagenes[nombre].ok) imagen = mapaImagenes[nombre].publicUrl;
      }
      const cat = await prismaSupabase.categoria.findUnique({ where: { slug: p.categoria.slug } });
      const data = {
        nombre: p.nombre,
        descripcion: p.descripcion,
        marca: p.marca,
        precio: p.precio,
        disponible: p.disponible == null ? true : p.disponible,
        destacado: p.destacado == null ? false : p.destacado,
        nuevo: p.nuevo == null ? false : p.nuevo,
        categoriaId: cat ? cat.id : undefined,
        imagen
      };
      if (data.categoriaId === undefined) continue;
      const existe = await prismaSupabase.producto.findFirst({ where: { nombre: p.nombre, categoriaId: cat.id } });
      if (existe) {
        await prismaSupabase.producto.update({ where: { id: existe.id }, data: { ...data, sku: p.sku } });
        actualizados++;
      } else {
        await prismaSupabase.producto.create({ data: { ...data, sku: p.sku } });
        creados++;
      }
    }
    console.log('Productos creados:', creados, '| actualizados:', actualizados);
    console.log('\n=== MIGRACIÓN COMPLETADA ===');
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  } finally {
    await prismaSupabase.$disconnect();
    await prismaLocal.$disconnect();
  }
}

main();
