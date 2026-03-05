-- FASE 4 - Evolução do modelo de Solicitação de Crédito
-- 1) Status em enum
-- 2) Campos operacionais de análise/encaminhamento
-- 3) Índices de escopo e desempenho

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SolicitacaoCreditoStatus'
  ) THEN
    CREATE TYPE "SolicitacaoCreditoStatus" AS ENUM (
      'Pendente',
      'Encaminhado para a matriz',
      'Aprovado',
      'Negado'
    );
  END IF;
END $$;

ALTER TABLE "SolicitacaoCredito"
  ADD COLUMN IF NOT EXISTS "analisadoPorId" INTEGER,
  ADD COLUMN IF NOT EXISTS "analisadoEm" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "encaminhadoPorId" INTEGER,
  ADD COLUMN IF NOT EXISTS "encaminhadoEm" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SolicitacaoCredito'
      AND column_name = 'status'
      AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE "SolicitacaoCredito"
      ALTER COLUMN "status" TYPE "SolicitacaoCreditoStatus"
      USING (
        CASE
          WHEN "status" IN ('Pendente', 'PENDENTE') THEN 'Pendente'::"SolicitacaoCreditoStatus"
          WHEN "status" IN ('Encaminhado para a matriz', 'ENCAMINHADO_PARA_MATRIZ') THEN 'Encaminhado para a matriz'::"SolicitacaoCreditoStatus"
          WHEN "status" IN ('Aprovado', 'APROVADO') THEN 'Aprovado'::"SolicitacaoCreditoStatus"
          WHEN "status" IN ('Negado', 'NEGADO') THEN 'Negado'::"SolicitacaoCreditoStatus"
          ELSE 'Pendente'::"SolicitacaoCreditoStatus"
        END
      );
  END IF;
END $$;

UPDATE "SolicitacaoCredito"
SET "status" = 'Pendente'
WHERE "status" IS NULL;

ALTER TABLE "SolicitacaoCredito"
  ALTER COLUMN "status" SET DEFAULT 'Pendente'::"SolicitacaoCreditoStatus",
  ALTER COLUMN "status" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SolicitacaoCredito_analisadoPorId_fkey'
  ) THEN
    ALTER TABLE "SolicitacaoCredito"
      ADD CONSTRAINT "SolicitacaoCredito_analisadoPorId_fkey"
      FOREIGN KEY ("analisadoPorId")
      REFERENCES "Usuarios"("idUsuario")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SolicitacaoCredito_encaminhadoPorId_fkey'
  ) THEN
    ALTER TABLE "SolicitacaoCredito"
      ADD CONSTRAINT "SolicitacaoCredito_encaminhadoPorId_fkey"
      FOREIGN KEY ("encaminhadoPorId")
      REFERENCES "Usuarios"("idUsuario")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_status_idx"
  ON "SolicitacaoCredito"("status");

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_matrizId_status_idx"
  ON "SolicitacaoCredito"("matrizId", "status");

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_usuarioCriadorId_status_idx"
  ON "SolicitacaoCredito"("usuarioCriadorId", "status");

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_usuarioSolicitanteId_status_idx"
  ON "SolicitacaoCredito"("usuarioSolicitanteId", "status");

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_analisadoPorId_idx"
  ON "SolicitacaoCredito"("analisadoPorId");

CREATE INDEX IF NOT EXISTS "SolicitacaoCredito_encaminhadoPorId_idx"
  ON "SolicitacaoCredito"("encaminhadoPorId");
