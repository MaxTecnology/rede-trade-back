-- Remove foreign keys and columns added para relacionamento com usuario_base
ALTER TABLE "Conta" DROP CONSTRAINT IF EXISTS "Conta_clienteBaseId_fkey";
ALTER TABLE "Conta" DROP CONSTRAINT IF EXISTS "Conta_filialBaseId_fkey";
ALTER TABLE "Conta" DROP CONSTRAINT IF EXISTS "Conta_matrizBaseId_fkey";

DROP INDEX IF EXISTS "Conta_clienteBaseId_idx";
DROP INDEX IF EXISTS "Conta_filialBaseId_idx";
DROP INDEX IF EXISTS "Conta_matrizBaseId_idx";

ALTER TABLE "Conta"
  DROP COLUMN IF EXISTS "clienteBaseId",
  DROP COLUMN IF EXISTS "filialBaseId",
  DROP COLUMN IF EXISTS "matrizBaseId";

-- Remover tabelas de perfis criadas anteriormente
DROP TABLE IF EXISTS "cliente_perfil";
DROP TABLE IF EXISTS "filial_perfil";
DROP TABLE IF EXISTS "matriz_perfil";
DROP TABLE IF EXISTS "usuario_base";

-- Remover tipos ENUM auxiliares
DROP TYPE IF EXISTS "FilialTipo";
DROP TYPE IF EXISTS "UsuarioBaseTipo";
