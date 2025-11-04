import prisma from "../src/lib/prisma";

async function main() {
  console.log("🔧 Ajustando estrutura da tabela Conta...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Conta"
    ADD COLUMN IF NOT EXISTS "valorPlanoPermuta" DOUBLE PRECISION DEFAULT 0;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Conta"
    ADD COLUMN IF NOT EXISTS "valorPlanoDinheiro" DOUBLE PRECISION DEFAULT 0;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Conta"
    ADD COLUMN IF NOT EXISTS "formaPagamentoPlano" TEXT DEFAULT '0';
  `);

  console.log("✅ Colunas garantidas com sucesso.");
}

main()
  .catch((error) => {
    console.error("❌ Erro ao ajustar colunas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
