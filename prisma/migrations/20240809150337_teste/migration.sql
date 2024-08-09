-- Ajuste os valores NULL para um valor padrão, como 0.0
UPDATE "Conta" SET "saldoDinheiro" = 0.0 WHERE "saldoDinheiro" IS NULL;

-- Agora, altere a coluna para NOT NULL
ALTER TABLE "Conta" ALTER COLUMN "saldoDinheiro" SET NOT NULL;
