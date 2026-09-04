-- Habilita pg_trgm para búsquedas rápidas con ILIKE/CONTAINS y crea índices GIN trigram
-- Usado por productController.listar ?q= (búsqueda en nombre/descripcion/sku)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "productos_nombre_trgm_idx" ON "productos" USING GIN ("nombre" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "productos_descripcion_trgm_idx" ON "productos" USING GIN ("descripcion" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "productos_sku_trgm_idx" ON "productos" USING GIN ("sku" gin_trgm_ops);
