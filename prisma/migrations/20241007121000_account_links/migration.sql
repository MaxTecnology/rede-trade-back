ALTER TABLE "Conta"
  ADD COLUMN "clienteBaseId" INTEGER,
  ADD COLUMN "filialBaseId" INTEGER,
  ADD COLUMN "matrizBaseId" INTEGER;

ALTER TABLE "Conta"
  ADD CONSTRAINT "Conta_clienteBaseId_fkey" FOREIGN KEY ("clienteBaseId") REFERENCES "usuario_base"("id") ON DELETE SET NULL;

ALTER TABLE "Conta"
  ADD CONSTRAINT "Conta_filialBaseId_fkey" FOREIGN KEY ("filialBaseId") REFERENCES "usuario_base"("id") ON DELETE SET NULL;

ALTER TABLE "Conta"
  ADD CONSTRAINT "Conta_matrizBaseId_fkey" FOREIGN KEY ("matrizBaseId") REFERENCES "usuario_base"("id") ON DELETE SET NULL;

CREATE INDEX "Conta_clienteBaseId_idx" ON "Conta"("clienteBaseId");
CREATE INDEX "Conta_filialBaseId_idx" ON "Conta"("filialBaseId");
CREATE INDEX "Conta_matrizBaseId_idx" ON "Conta"("matrizBaseId");
