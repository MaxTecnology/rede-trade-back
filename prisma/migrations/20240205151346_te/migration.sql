/*
  Warnings:

  - Made the column `bloqueado` on table `Usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Usuarios" ALTER COLUMN "bloqueado" SET NOT NULL,
ALTER COLUMN "bloqueado" SET DEFAULT false;
