/*
  Warnings:

  - Made the column `saldoPermuta` on table `Conta` required. This step will fail if there are existing NULL values in that column.
  - Made the column `saldoDinheiro` on table `Conta` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Conta" ALTER COLUMN "saldoPermuta" SET NOT NULL,
ALTER COLUMN "saldoPermuta" SET DEFAULT 0.0,
ALTER COLUMN "saldoDinheiro" SET NOT NULL,
ALTER COLUMN "saldoDinheiro" SET DEFAULT 0.0;
