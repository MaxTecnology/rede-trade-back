-- AlterTable
ALTER TABLE "UsuarioPermissionGroup"
    ADD COLUMN "subcontaId" INTEGER,
    ALTER COLUMN "usuarioId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "UsuarioPermissionGroup_subcontaId_idx" ON "UsuarioPermissionGroup"("subcontaId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPermissionGroup_subcontaId_groupId_escopo_key" ON "UsuarioPermissionGroup"("subcontaId", "groupId", "escopo");

-- AddForeignKey
ALTER TABLE "UsuarioPermissionGroup"
    ADD CONSTRAINT "UsuarioPermissionGroup_subcontaId_fkey" FOREIGN KEY ("subcontaId") REFERENCES "SubContas"("idSubContas") ON DELETE CASCADE ON UPDATE CASCADE;
