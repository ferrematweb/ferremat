-- CreateIndex
CREATE INDEX "categorias_orden_idx" ON "categorias"("orden");

-- CreateIndex
CREATE INDEX "productos_disponible_idx" ON "productos"("disponible");

-- CreateIndex
CREATE INDEX "productos_creadoEn_idx" ON "productos"("creadoEn");

-- CreateIndex
CREATE INDEX "productos_sku_idx" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_categoriaId_disponible_idx" ON "productos"("categoriaId", "disponible");

-- CreateIndex
CREATE INDEX "productos_categoriaId_destacado_idx" ON "productos"("categoriaId", "destacado");
