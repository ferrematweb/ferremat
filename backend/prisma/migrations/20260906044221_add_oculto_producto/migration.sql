-- DropIndex
DROP INDEX "productos_descripcion_trgm_idx";

-- DropIndex
DROP INDEX "productos_nombre_trgm_idx";

-- DropIndex
DROP INDEX "productos_sku_trgm_idx";

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "oculto" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "productos_oculto_idx" ON "productos"("oculto");
