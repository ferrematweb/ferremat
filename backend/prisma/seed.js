/**
 * Seed inicial de la base de datos.
 *
 * Hace dos cosas:
 *  1) Crea el usuario administrador inicial (a partir de ADMIN_USUARIO /
 *     ADMIN_PASSWORD en el .env). Si ya existe, actualiza su contraseña.
 *  2) Migra el catálogo que hoy vive hardcodeado en
 *     frontend/assets/js/products-data.js (categorías y productos) y el
 *     menú de navegación de index.html, para que el cliente arranque
 *     con el mismo contenido que ya tenía en el sitio estático.
 *
 * Ejecutar con: npm run seed
 * (Es seguro volver a ejecutarlo: usa upsert, no duplica datos.)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ------------------------------------------------------------
// Categorías (copiadas de products-data.js)
// ------------------------------------------------------------
const CATEGORIAS = [
  { slug: 'herramientas-electricas', nombre: 'Herramientas Eléctricas', orden: 1, destacada: true, imagen: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=900&q=80' },
  { slug: 'herramientas-manuales', nombre: 'Herramientas Manuales', orden: 2, destacada: false, imagen: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80' },
  { slug: 'construccion', nombre: 'Construcción', orden: 3, destacada: false, imagen: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80' },
  { slug: 'electricidad', nombre: 'Electricidad', orden: 4, destacada: false, imagen: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' },
  { slug: 'gasfiteria', nombre: 'Gasfitería', orden: 5, destacada: false, imagen: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80' },
  { slug: 'pinturas', nombre: 'Pinturas', orden: 6, destacada: false, imagen: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=600&q=80' },
  { slug: 'seguridad', nombre: 'Seguridad', orden: 7, destacada: false, imagen: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80' },
  { slug: 'accesorios', nombre: 'Accesorios', orden: 8, destacada: false, imagen: 'https://images.unsplash.com/photo-1530124566582-a45a7bc30783?auto=format&fit=crop&w=600&q=80' }
];

// ------------------------------------------------------------
// Ítems de menú (copiados del <nav> de index.html)
// ------------------------------------------------------------
const MENU = [
  { nombre: 'Inicio', enlace: '#inicio', orden: 1 },
  { nombre: 'Productos', enlace: '#productos', orden: 2 },
  { nombre: 'Categorías', enlace: '#categorias', orden: 3 },
  { nombre: 'Nosotros', enlace: '#nosotros', orden: 4 },
  { nombre: 'Contacto', enlace: '#contacto', orden: 5 }
];

// ------------------------------------------------------------
// Productos (copiados de products-data.js)
// ------------------------------------------------------------
const IMG = {
  taladro: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  amoladora: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80',
  llaves: 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?auto=format&fit=crop&w=600&q=80',
  caja: 'https://images.unsplash.com/photo-1507207611509-ec012433ff52?auto=format&fit=crop&w=600&q=80',
  martillo: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80',
  destornilladores: 'https://images.unsplash.com/photo-1426927308491-6380b6a9936f?auto=format&fit=crop&w=600&q=80',
  manuales: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
  construccion: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
  electricidad: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  gasfiteria: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
  pinturas: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=600&q=80',
  seguridad: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80',
  accesorios: 'https://images.unsplash.com/photo-1530124566582-a45a7bc30783?auto=format&fit=crop&w=600&q=80'
};

const PRODUCTOS = [
  { sku: 'FRM-001', nombre: 'Taladro Percutor', categoria: 'herramientas-electricas', descripcion: 'Potencia y precisión para trabajos en concreto, madera y metal.', imagen: IMG.taladro, disponible: true, destacado: true, nuevo: false, precio: 129, precioAnterior: 149, precioMayorista: 119, cantidadMayorista: 3 },
  { sku: 'FRM-002', nombre: 'Amoladora Angular', categoria: 'herramientas-electricas', descripcion: 'Ideal para corte y desbaste en metal, piedra y otros materiales.', imagen: IMG.amoladora, disponible: true, destacado: false, nuevo: false, precio: 249 },
  { sku: 'FRM-003', nombre: 'Sierra Circular Eléctrica', categoria: 'herramientas-electricas', descripcion: 'Cortes rectos y precisos en madera y tableros para carpintería.', imagen: IMG.amoladora, disponible: true, destacado: false, nuevo: true },
  { sku: 'FRM-004', nombre: 'Atornillador Inalámbrico', categoria: 'herramientas-electricas', descripcion: 'Batería recargable, ideal para instalaciones y ensamblajes rápidos.', imagen: IMG.taladro, disponible: true, destacado: false, nuevo: true },

  { sku: 'FRM-005', nombre: 'Juego de Llaves Combinadas', categoria: 'herramientas-manuales', descripcion: 'Set completo de llaves en acero cromado de alta resistencia.', imagen: IMG.llaves, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-006', nombre: 'Martillo Profesional', categoria: 'herramientas-manuales', descripcion: 'Mango ergonómico antivibración y cabeza de acero forjado.', imagen: IMG.martillo, disponible: true, destacado: true, nuevo: false, precio: 45 },
  { sku: 'FRM-007', nombre: 'Set de Destornilladores', categoria: 'herramientas-manuales', descripcion: 'Kit profesional con puntas intercambiables y mango de precisión.', imagen: IMG.destornilladores, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-008', nombre: 'Wincha / Cinta Métrica 5m', categoria: 'herramientas-manuales', descripcion: 'Medición precisa para obra, carpintería y acabados.', imagen: IMG.manuales, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-009', nombre: 'Cemento (bolsa)', categoria: 'construccion', descripcion: 'Cemento para uso general en obras de construcción.', imagen: IMG.construccion, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-010', nombre: 'Carretilla de Obra', categoria: 'construccion', descripcion: 'Resistente y de fácil maniobrabilidad para trabajo en obra.', imagen: IMG.construccion, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-011', nombre: 'Nivel de Burbuja', categoria: 'construccion', descripcion: 'Precisión para verificar horizontalidad y verticalidad en obra.', imagen: IMG.manuales, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-012', nombre: 'Mezcladora de Mortero (paleta)', categoria: 'construccion', descripcion: 'Accesorio para taladro, agiliza el mezclado de mortero y pastas.', imagen: IMG.taladro, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-013', nombre: 'Cable Eléctrico THW (rollo)', categoria: 'electricidad', descripcion: 'Cable para instalaciones eléctricas residenciales e industriales.', imagen: IMG.electricidad, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-014', nombre: 'Tablero Eléctrico', categoria: 'electricidad', descripcion: 'Tablero para distribución de circuitos con espacio para llaves térmicas.', imagen: IMG.electricidad, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-015', nombre: 'Multitester Digital', categoria: 'electricidad', descripcion: 'Mide voltaje, corriente y continuidad para diagnóstico eléctrico.', imagen: IMG.electricidad, disponible: true, destacado: true, nuevo: true, precio: 89, precioAnterior: 99 },
  { sku: 'FRM-016', nombre: 'Interruptores y Tomacorrientes', categoria: 'electricidad', descripcion: 'Línea de accesorios eléctricos para instalaciones domésticas.', imagen: IMG.accesorios, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-017', nombre: 'Tubería PVC para Agua', categoria: 'gasfiteria', descripcion: 'Tubería para instalaciones sanitarias, distintos diámetros.', imagen: IMG.gasfiteria, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-018', nombre: 'Llave de Paso', categoria: 'gasfiteria', descripcion: 'Control de flujo de agua para instalaciones residenciales.', imagen: IMG.gasfiteria, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-019', nombre: 'Juego de Conexiones PVC', categoria: 'gasfiteria', descripcion: 'Codos, uniones y accesorios para instalaciones de agua y desagüe.', imagen: IMG.gasfiteria, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-020', nombre: 'Cinta Teflón', categoria: 'gasfiteria', descripcion: 'Sellado hermético de roscas en instalaciones de gasfitería.', imagen: IMG.accesorios, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-021', nombre: 'Pintura Látex (galón)', categoria: 'pinturas', descripcion: 'Acabado mate para interiores y exteriores, alta cobertura.', imagen: IMG.pinturas, disponible: true, destacado: false, nuevo: true },
  { sku: 'FRM-022', nombre: 'Esmalte Sintético (galón)', categoria: 'pinturas', descripcion: 'Protección y acabado para superficies metálicas y de madera.', imagen: IMG.pinturas, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-023', nombre: 'Kit de Brochas y Rodillos', categoria: 'pinturas', descripcion: 'Set completo para trabajos de pintura de interiores y exteriores.', imagen: IMG.pinturas, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-024', nombre: 'Barniz para Madera', categoria: 'pinturas', descripcion: 'Protección y acabado brillante para enchapados y carpintería.', imagen: IMG.manuales, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-025', nombre: 'Casco de Seguridad', categoria: 'seguridad', descripcion: 'Protección para trabajos de construcción y obra.', imagen: IMG.seguridad, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-026', nombre: 'Guantes de Trabajo', categoria: 'seguridad', descripcion: 'Protección de manos para manipulación de materiales y herramientas.', imagen: IMG.seguridad, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-027', nombre: 'Lentes de Protección', categoria: 'seguridad', descripcion: 'Protección ocular para corte, esmerilado y trabajos de taller.', imagen: IMG.seguridad, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-028', nombre: 'Arnés de Seguridad', categoria: 'seguridad', descripcion: 'Equipo de protección para trabajos en altura.', imagen: IMG.seguridad, disponible: true, destacado: false, nuevo: false },

  { sku: 'FRM-029', nombre: 'Caja de Herramientas', categoria: 'accesorios', descripcion: 'Organización y transporte profesional para tus herramientas de trabajo.', imagen: IMG.caja, disponible: true, destacado: true, nuevo: false, precio: 159, precioMayorista: 149, cantidadMayorista: 2 },
  { sku: 'FRM-030', nombre: 'Juego de Brocas', categoria: 'accesorios', descripcion: 'Set de brocas para madera, metal y concreto, distintas medidas.', imagen: IMG.destornilladores, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-031', nombre: 'Extensión Eléctrica', categoria: 'accesorios', descripcion: 'Cable de extensión con tomacorrientes múltiples, uso en obra y taller.', imagen: IMG.accesorios, disponible: true, destacado: false, nuevo: false },
  { sku: 'FRM-032', nombre: 'Cinturón Porta Herramientas', categoria: 'accesorios', descripcion: 'Práctico y resistente, ideal para maestros y técnicos en obra.', imagen: IMG.caja, disponible: true, destacado: false, nuevo: true }
];

async function seedAdmin() {
  const usuario = process.env.ADMIN_USUARIO;
  const password = process.env.ADMIN_PASSWORD;
  if (!usuario || !password) {
    throw new Error('ADMIN_USUARIO y ADMIN_PASSWORD deben estar definidos en el archivo .env antes de ejecutar el seed.');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { usuario },
    update: { passwordHash },
    create: { usuario, passwordHash, nombre: 'Administrador' }
  });

  console.log('✔ Administrador listo -> usuario: "' + usuario + '" (contraseña definida por ADMIN_PASSWORD en .env)');
}

async function seedCategorias() {
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { slug: c.slug },
      update: { nombre: c.nombre, orden: c.orden, destacada: c.destacada, imagen: c.imagen },
      create: c
    });
  }
  console.log('✔ ' + CATEGORIAS.length + ' categorías sembradas/actualizadas.');
}

async function seedMenu() {
  const existentes = await prisma.itemMenu.count();
  if (existentes > 0) {
    console.log('— El menú ya tiene ítems, se omite la siembra inicial del menú.');
    return;
  }
  for (const item of MENU) {
    await prisma.itemMenu.create({ data: item });
  }
  console.log('✔ ' + MENU.length + ' ítems de menú sembrados.');
}

async function seedProductos() {
  const existentes = await prisma.producto.count();
  if (existentes > 0) {
    console.log('— Ya hay productos en la base de datos, se omite la siembra inicial del catálogo.');
    return;
  }

  const categoriasDb = await prisma.categoria.findMany();
  const idPorSlug = {};
  categoriasDb.forEach((c) => { idPorSlug[c.slug] = c.id; });

  for (const p of PRODUCTOS) {
    const categoriaId = idPorSlug[p.categoria];
    if (!categoriaId) {
      console.warn('⚠ Categoría no encontrada para el producto ' + p.sku + ' (' + p.categoria + '), se omite.');
      continue;
    }
    await prisma.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        sku: p.sku,
        marca: p.marca || null,
        categoriaId,
        imagen: p.imagen,
        disponible: p.disponible,
        destacado: p.destacado,
        nuevo: p.nuevo,
        precio: p.precio ?? null,
        precioAnterior: p.precioAnterior ?? null,
        precioMayorista: p.precioMayorista ?? null,
        cantidadMayorista: p.cantidadMayorista ?? null
      }
    });
  }
  console.log('✔ ' + PRODUCTOS.length + ' productos sembrados.');
}

async function main() {
  await seedAdmin();
  await seedCategorias();
  await seedMenu();
  await seedProductos();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
