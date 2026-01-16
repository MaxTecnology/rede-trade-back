-- CreateEnum
CREATE TYPE "PermissionGrantType" AS ENUM ('ALLOW', 'DENY');

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultForTipo" TEXT,
    "herdaDoGrupoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroupAssignment" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "valor" BOOLEAN NOT NULL DEFAULT false,
    "grantType" "PermissionGrantType" NOT NULL DEFAULT 'ALLOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioPermissionGroup" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "escopo" TEXT NOT NULL DEFAULT 'DEFAULT',
    "permissoesExtras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PermissionGroup_herdaDoGrupoId_idx" ON "PermissionGroup"("herdaDoGrupoId");

-- CreateIndex
CREATE INDEX "PermissionGroup_defaultForTipo_idx" ON "PermissionGroup"("defaultForTipo");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_nome_key" ON "PermissionGroup"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_categoria_chave_key" ON "Permission"("categoria", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroupAssignment_groupId_permissionId_key" ON "PermissionGroupAssignment"("groupId", "permissionId");

-- CreateIndex
CREATE INDEX "PermissionGroupAssignment_permissionId_idx" ON "PermissionGroupAssignment"("permissionId");

-- CreateIndex
CREATE INDEX "UsuarioPermissionGroup_usuarioId_idx" ON "UsuarioPermissionGroup"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioPermissionGroup_groupId_idx" ON "UsuarioPermissionGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPermissionGroup_usuarioId_groupId_escopo_key" ON "UsuarioPermissionGroup"("usuarioId", "groupId", "escopo");

-- AddForeignKey
ALTER TABLE "PermissionGroup" ADD CONSTRAINT "PermissionGroup_herdaDoGrupoId_fkey" FOREIGN KEY ("herdaDoGrupoId") REFERENCES "PermissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupAssignment" ADD CONSTRAINT "PermissionGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupAssignment" ADD CONSTRAINT "PermissionGroupAssignment_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPermissionGroup" ADD CONSTRAINT "UsuarioPermissionGroup_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPermissionGroup" ADD CONSTRAINT "UsuarioPermissionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
