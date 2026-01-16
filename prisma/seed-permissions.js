const { PrismaClient, PermissionGrantType } = require("@prisma/client");

const prisma = new PrismaClient();

const permissionDefinitions = [
  { categoria: "inicio", chave: "inicio.ver", descricao: "Acessar painel inicial" },
  { categoria: "associados", chave: "associados.ver", descricao: "Abrir módulo de associados" },
  { categoria: "associados", chave: "associados.listar", descricao: "Listar associados" },
  { categoria: "associados", chave: "associados.criar", descricao: "Cadastrar novo associado" },
  { categoria: "agencias", chave: "agencias.ver", descricao: "Visualizar agências" },
  { categoria: "agencias", chave: "agencias.criar", descricao: "Cadastrar agências" },
  { categoria: "transacoes", chave: "transacoes.listar", descricao: "Listar transações" },
  { categoria: "transacoes", chave: "transacoes.minhas", descricao: "Ver minhas transações" },
  { categoria: "transacoes", chave: "transacoes.criar", descricao: "Criar transações" },
  { categoria: "transacoes", chave: "transacoes.estornar", descricao: "Estornar transações" },
  { categoria: "ofertas", chave: "ofertas.ver", descricao: "Visualizar ofertas" },
  { categoria: "ofertas", chave: "ofertas.minhas", descricao: "Ver minhas ofertas" },
  { categoria: "ofertas", chave: "ofertas.excluir", descricao: "Excluir ofertas" },
  { categoria: "ofertas", chave: "ofertas.criar", descricao: "Criar ofertas" },
  { categoria: "vouchers", chave: "vouchers.gerenciar", descricao: "Gerenciar vouchers" },
  { categoria: "vouchers", chave: "vouchers.meus", descricao: "Ver meus vouchers" },
  { categoria: "vouchers", chave: "vouchers.solicitar", descricao: "Solicitar voucher" },
  { categoria: "vouchers", chave: "vouchers.cancelar", descricao: "Cancelar voucher" },
  { categoria: "creditos", chave: "creditos.meus", descricao: "Ver meus créditos" },
  { categoria: "creditos", chave: "creditos.solicitar", descricao: "Solicitar crédito" },
  { categoria: "creditos", chave: "creditos.listar", descricao: "Listar créditos" },
  { categoria: "creditos", chave: "creditos.analisar", descricao: "Analisar créditos" },
  { categoria: "creditos", chave: "creditos.aprovar", descricao: "Aprovar créditos" },
  { categoria: "extratos", chave: "extratos.ver", descricao: "Visualizar extratos" },
  { categoria: "extratos", chave: "extratos.meu", descricao: "Ver meu extrato" },
  { categoria: "extratos", chave: "extratos.estorno", descricao: "Estornar extratos" },
  { categoria: "financeiro", chave: "financeiro.contasReceber", descricao: "Contas a receber" },
  { categoria: "financeiro", chave: "financeiro.contasPagar", descricao: "Contas a pagar" },
  { categoria: "planos", chave: "planos.associados", descricao: "Planos de associados" },
  { categoria: "planos", chave: "planos.agencias", descricao: "Planos de agências" },
  { categoria: "planos", chave: "planos.gerentes", descricao: "Planos de gerentes" },
  { categoria: "categorias", chave: "categorias.ver", descricao: "Gerenciar categorias" },
  { categoria: "categorias", chave: "categorias.sub", descricao: "Gerenciar subcategorias" },
  { categoria: "gerentes", chave: "gerentes.criar", descricao: "Cadastrar gerentes" },
  { categoria: "gerentes", chave: "gerentes.lista", descricao: "Listar gerentes" },
  { categoria: "usuarios", chave: "usuarios.meusDados", descricao: "Ver meus dados" },
  { categoria: "usuarios", chave: "usuarios.listar", descricao: "Listar usuários" },
  { categoria: "usuarios", chave: "usuarios.editar", descricao: "Gerenciar subcontas" },
  { categoria: "usuarios", chave: "usuarios.criar", descricao: "Criar subcontas" },
  { categoria: "usuarios", chave: "usuarios.permissoes", descricao: "Gerenciar grupos de permissões" },
];

const groupDefinitions = [
  {
    nome: "Matriz",
    descricao: "Acesso completo ao sistema",
    isDefault: true,
    defaultForTipo: "Matriz",
    grantAll: true,
  },
  {
    nome: "Franquia Master",
    descricao: "Grupo padrão para franquias master",
    defaultForTipo: "Franquia Master",
    permissions: [],
  },
  {
    nome: "Franquia",
    descricao: "Grupo padrão para franquias",
    defaultForTipo: "Franquia",
    permissions: [],
  },
  {
    nome: "Agência Master",
    descricao: "Grupo padrão para agências master",
    defaultForTipo: "Agencia Master",
    permissions: [],
  },
  {
    nome: "Agência",
    descricao: "Grupo padrão para agências",
    defaultForTipo: "Agencia",
    permissions: [],
  },
  {
    nome: "Gerente",
    descricao: "Grupo padrão para gerentes",
    defaultForTipo: "Gerente",
    permissions: [],
  },
  {
    nome: "Associado",
    descricao: "Grupo padrão para associados",
    defaultForTipo: "Associado",
    permissions: [],
  },
  {
    nome: "Subconta",
    descricao: "Grupo padrão para subcontas",
    defaultForTipo: "Subconta",
    permissions: [],
  },
];

async function upsertPermissions() {
  const permissionMap = new Map();

  for (const [index, definition] of permissionDefinitions.entries()) {
    const permission = await prisma.permission.upsert({
      where: {
        categoria_chave: {
          categoria: definition.categoria,
          chave: definition.chave,
        },
      },
      update: {
        descricao: definition.descricao,
        ordem: index + 1,
      },
      create: {
        categoria: definition.categoria,
        chave: definition.chave,
        descricao: definition.descricao,
        ordem: index + 1,
      },
    });

    permissionMap.set(definition.chave, permission);
  }

  return permissionMap;
}

async function upsertGroups() {
  const groups = [];

  for (const definition of groupDefinitions) {
    const group = await prisma.permissionGroup.upsert({
      where: { nome: definition.nome },
      update: {
        descricao: definition.descricao,
        isDefault: Boolean(definition.isDefault),
        defaultForTipo: definition.defaultForTipo || null,
      },
      create: {
        nome: definition.nome,
        descricao: definition.descricao,
        isDefault: Boolean(definition.isDefault),
        defaultForTipo: definition.defaultForTipo || null,
      },
    });

    groups.push({ definition, group });
  }

  return groups;
}

async function assignPermissions(groups, permissionMap) {
  for (const { definition, group } of groups) {
    await prisma.permissionGroupAssignment.deleteMany({
      where: { groupId: group.id },
    });

    const keys = definition.grantAll
      ? Array.from(permissionMap.keys())
      : definition.permissions || [];

    if (keys.length === 0) {
      continue;
    }

    const data = keys
      .map((key) => {
        const permission = permissionMap.get(key);
        if (!permission) {
          console.warn(`⚠️  Permissão "${key}" não encontrada. Ignorando.`);
          return null;
        }
        return {
          groupId: group.id,
          permissionId: permission.id,
          valor: true,
          grantType: PermissionGrantType.ALLOW,
        };
      })
      .filter(Boolean);

    if (data.length > 0) {
      await prisma.permissionGroupAssignment.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  console.log("⬇️  Inicializando catálogo de permissões...");
  const permissionMap = await upsertPermissions();

  console.log("⬇️  Criando grupos padrão...");
  const groups = await upsertGroups();

  console.log("⬇️  Atribuindo permissões aos grupos...");
  await assignPermissions(groups, permissionMap);

  console.log("✅ Catálogo de permissões configurado com sucesso.");
}

main()
  .catch((error) => {
    console.error("❌ Erro ao seedar permissões:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
