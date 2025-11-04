-- Create enums
CREATE TYPE "UsuarioAuthTipo" AS ENUM ('CLIENTE', 'SUBCONTA', 'OPERACIONAL');
CREATE TYPE "FilialTipo" AS ENUM ('MASTER', 'COMUM');
CREATE TYPE "TipoDocumento" AS ENUM ('CPF', 'CNPJ');
CREATE TYPE "ClienteStatus" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');
CREATE TYPE "ContaStatus" AS ENUM ('ATIVA', 'SUSPENSA', 'ENCERRADA');

-- Add columns to Usuarios
ALTER TABLE "Usuarios"
  ADD COLUMN "tipoAuth" "UsuarioAuthTipo" NOT NULL DEFAULT 'OPERACIONAL',
  ADD COLUMN "clienteId" INTEGER,
  ADD COLUMN "filialId" INTEGER,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Usuarios_clienteId_idx" ON "Usuarios"("clienteId");
CREATE INDEX "Usuarios_filialId_idx" ON "Usuarios"("filialId");

-- Create Matriz table
CREATE TABLE "Matriz" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL UNIQUE,
    "descricao" TEXT,
    "contatos" JSONB,
    "endereco" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER UNIQUE
);

-- Create Filial table
CREATE TABLE "Filial" (
    "id" SERIAL PRIMARY KEY,
    "matrizId" INTEGER NOT NULL,
    "filialPaiId" INTEGER,
    "tipo" "FilialTipo" NOT NULL DEFAULT 'COMUM',
    "nomeFantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL UNIQUE,
    "contatos" JSONB,
    "endereco" JSONB,
    "configuracoes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER UNIQUE,
    CONSTRAINT "Filial_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Matriz"("id") ON DELETE CASCADE,
    CONSTRAINT "Filial_filialPaiId_fkey" FOREIGN KEY ("filialPaiId") REFERENCES "Filial"("id") ON DELETE SET NULL
);
CREATE INDEX "Filial_matrizId_idx" ON "Filial"("matrizId");
CREATE INDEX "Filial_filialPaiId_idx" ON "Filial"("filialPaiId");

-- Create Cliente table
CREATE TABLE "Cliente" (
    "id" SERIAL PRIMARY KEY,
    "matrizId" INTEGER NOT NULL,
    "filialId" INTEGER NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "documento" TEXT NOT NULL UNIQUE,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "situacao" "ClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "contatos" JSONB,
    "endereco" JSONB,
    "limitesPadrao" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cliente_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Matriz"("id") ON DELETE CASCADE,
    CONSTRAINT "Cliente_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE CASCADE
);
CREATE INDEX "Cliente_matrizId_idx" ON "Cliente"("matrizId");
CREATE INDEX "Cliente_filialId_idx" ON "Cliente"("filialId");

-- Add FKs from Usuarios to Cliente/Filial
ALTER TABLE "Usuarios"
  ADD CONSTRAINT "Usuarios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "Usuarios_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE SET NULL;

ALTER TABLE "Matriz"
  ADD CONSTRAINT "Matriz_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL;

ALTER TABLE "Filial"
  ADD CONSTRAINT "Filial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("idUsuario") ON DELETE SET NULL;

-- Add new columns/relations to Conta
ALTER TABLE "Conta"
  ADD COLUMN "clienteId" INTEGER,
  ADD COLUMN "filialId" INTEGER,
  ADD COLUMN "matrizId" INTEGER,
  ADD COLUMN "status" "ContaStatus" NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Conta_clienteId_idx" ON "Conta"("clienteId");
CREATE INDEX "Conta_filialId_idx" ON "Conta"("filialId");
CREATE INDEX "Conta_matrizId_idx" ON "Conta"("matrizId");

ALTER TABLE "Conta"
  ADD CONSTRAINT "Conta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "Conta_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "Conta_matrizId_fkey" FOREIGN KEY ("matrizId") REFERENCES "Matriz"("id") ON DELETE SET NULL;
