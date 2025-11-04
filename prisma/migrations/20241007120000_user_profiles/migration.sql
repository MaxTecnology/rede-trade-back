-- Create enums
CREATE TYPE "UsuarioBaseTipo" AS ENUM ('MATRIZ', 'FILIAL_MASTER', 'FILIAL', 'CLIENTE', 'SUBCONTA');
CREATE TYPE "FilialTipo" AS ENUM ('MASTER', 'COMUM');

-- Create main table for base users
CREATE TABLE "usuario_base" (
    "id" SERIAL PRIMARY KEY,
    "tipo" "UsuarioBaseTipo" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT UNIQUE,
    "senhaHash" TEXT,
    "legacyUsuarioId" INTEGER UNIQUE,
    "usuarioCriadorId" INTEGER,
    "matrizId" INTEGER,
    "permissoes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create matriz profile table
CREATE TABLE "matriz_perfil" (
    "usuarioId" INTEGER PRIMARY KEY,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "descricao" TEXT,
    "telefone" TEXT,
    "emailPrincipal" TEXT,
    "site" TEXT,
    "endereco" JSONB,
    CONSTRAINT "matriz_perfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario_base"("id") ON DELETE CASCADE
);

-- Create filial profile table
CREATE TABLE "filial_perfil" (
    "usuarioId" INTEGER PRIMARY KEY,
    "matrizId" INTEGER NOT NULL,
    "filialPaiId" INTEGER,
    "tipo" "FilialTipo" NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "telefone" TEXT,
    "emailPrincipal" TEXT,
    "endereco" JSONB,
    CONSTRAINT "filial_perfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario_base"("id") ON DELETE CASCADE,
    CONSTRAINT "filial_perfil_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "usuario_base"("id") ON DELETE CASCADE,
    CONSTRAINT "filial_perfil_filialPaiId_fkey" FOREIGN KEY ("filialPaiId") REFERENCES "filial_perfil"("usuarioId") ON DELETE SET NULL
);

-- Create cliente profile table
CREATE TABLE "cliente_perfil" (
    "usuarioId" INTEGER PRIMARY KEY,
    "filialId" INTEGER NOT NULL,
    "matrizId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "emailContato" TEXT,
    "telefoneContato" TEXT,
    "endereco" JSONB,
    CONSTRAINT "cliente_perfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario_base"("id") ON DELETE CASCADE,
    CONSTRAINT "cliente_perfil_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "filial_perfil"("usuarioId") ON DELETE CASCADE,
    CONSTRAINT "cliente_perfil_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "usuario_base"("id") ON DELETE CASCADE
);

-- Indices to assist filtering
CREATE INDEX "usuario_base_matrizId_idx" ON "usuario_base" ("matrizId");
CREATE INDEX "usuario_base_usuarioCriadorId_idx" ON "usuario_base" ("usuarioCriadorId");
CREATE INDEX "filial_perfil_matrizId_idx" ON "filial_perfil" ("matrizId");
CREATE INDEX "filial_perfil_filialPaiId_idx" ON "filial_perfil" ("filialPaiId");
CREATE INDEX "cliente_perfil_filialId_idx" ON "cliente_perfil" ("filialId");
CREATE INDEX "cliente_perfil_matrizId_idx" ON "cliente_perfil" ("matrizId");
