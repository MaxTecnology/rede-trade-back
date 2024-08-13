import seedUsers from "./user.seed";

async function main() {
  await seedUsers();
  // Adicione outras seeds aqui se necessário
}

main()
  .then(async () => {
    console.log("Seed completed");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
