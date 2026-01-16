const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

async function main() {
  console.log("🔁 Carregando grupos padrão...");
  const groups = await prisma.permissionGroup.findMany({
    where: {
      defaultForTipo: {
        not: null,
      },
    },
  });

  const groupByTipo = new Map();
  groups.forEach((group) => {
    if (!group.defaultForTipo) return;
    groupByTipo.set(normalize(group.defaultForTipo), group);
  });

  if (groupByTipo.size === 0) {
    console.warn("⚠️  Nenhum grupo padrão com defaultForTipo definido.");
  }

  console.log("🔁 Buscando usuários...");
  const usuarios = await prisma.usuarios.findMany({
    select: {
      idUsuario: true,
      tipo: true,
      matrizId: true,
    },
  });

  let associados = 0;
  for (const usuario of usuarios) {
    let tipo = usuario.tipo || "";

    if (!tipo) {
      if (usuario.matrizId === null) {
        tipo = "Matriz";
      }
    }

    const group = groupByTipo.get(normalize(tipo));
    if (!group) continue;

    await prisma.usuarioPermissionGroup.upsert({
      where: {
        usuarioId_groupId_escopo: {
          usuarioId: usuario.idUsuario,
          groupId: group.id,
          escopo: "DEFAULT",
        },
      },
      update: {},
      create: {
        usuarioId: usuario.idUsuario,
        groupId: group.id,
        escopo: "DEFAULT",
      },
    });
    associados++;
  }

  console.log(`✅ Grupos aplicados em ${associados} usuários.`);
}

main()
  .catch((error) => {
    console.error("❌ Erro ao aplicar grupos padrão:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
