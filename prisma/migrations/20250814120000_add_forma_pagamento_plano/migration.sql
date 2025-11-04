-- AlterTable
ALTER TABLE "Conta"
ADD COLUMN     "formaPagamentoPlano" TEXT DEFAULT '0',
ADD COLUMN     "valorPlanoPermuta" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "valorPlanoDinheiro" DOUBLE PRECISION DEFAULT 0;
