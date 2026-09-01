// Cliente Prisma único para toda la aplicación (evita abrir múltiples
// conexiones en desarrollo con nodemon/hot-reload).
const { PrismaClient } = require('@prisma/client');

const prisma =
  global.__ferremat_prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  global.__ferremat_prisma = prisma;
}

module.exports = prisma;
