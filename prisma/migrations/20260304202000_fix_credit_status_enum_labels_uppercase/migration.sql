-- Ajuste de compatibilidade: alinhar labels do enum SolicitacaoCreditoStatus
-- com os valores usados pelo Prisma Client (UPPERCASE).
-- Este script é idempotente e só renomeia quando os valores legados existem.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'SolicitacaoCreditoStatus'
      AND e.enumlabel = 'Pendente'
  ) THEN
    ALTER TYPE "SolicitacaoCreditoStatus" RENAME VALUE 'Pendente' TO 'PENDENTE';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'SolicitacaoCreditoStatus'
      AND e.enumlabel = 'Encaminhado para a matriz'
  ) THEN
    ALTER TYPE "SolicitacaoCreditoStatus"
      RENAME VALUE 'Encaminhado para a matriz' TO 'ENCAMINHADO_PARA_MATRIZ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'SolicitacaoCreditoStatus'
      AND e.enumlabel = 'Aprovado'
  ) THEN
    ALTER TYPE "SolicitacaoCreditoStatus" RENAME VALUE 'Aprovado' TO 'APROVADO';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'SolicitacaoCreditoStatus'
      AND e.enumlabel = 'Negado'
  ) THEN
    ALTER TYPE "SolicitacaoCreditoStatus" RENAME VALUE 'Negado' TO 'NEGADO';
  END IF;
END $$;
