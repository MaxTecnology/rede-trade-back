import { PermissionGrantType, PrismaClient } from "@prisma/client";
import { logger } from "./logger";

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

export async function seedPermissionCatalog(prisma: PrismaClient) {
  logger.info("⬇️  Inicializando catálogo de permissões...");
  const permissionMap = new Map<string, { id: number }>();

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

  logger.success("✅ Permissões base atualizadas");

  const groups: Array<{ definition: (typeof groupDefinitions)[number]; id: number }> = [];

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

    groups.push({ definition, id: group.id });
  }

  logger.success("✅ Grupos padrão atualizados");

  for (const { definition, id } of groups) {
    await prisma.permissionGroupAssignment.deleteMany({
      where: { groupId: id },
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
          logger.warning(`⚠️ Permissão "${key}" não encontrada. Ignorando.`);
          return null;
        }
        return {
          groupId: id,
          permissionId: permission.id,
          valor: true,
          grantType: PermissionGrantType.ALLOW,
        };
      })
      .filter(Boolean) as Array<{ groupId: number; permissionId: number; valor: boolean; grantType: PermissionGrantType }>;

    if (data.length > 0) {
      await prisma.permissionGroupAssignment.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  logger.success("✅ Permissões atribuídas aos grupos padrão");
}

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export async function backfillPermissionGroups(prisma: PrismaClient) {
  logger.info("🔁 Aplicando grupos padrão aos usuários existentes...");
  const groups = await prisma.permissionGroup.findMany({
    where: {
      defaultForTipo: {
        not: null,
      },
    },
  });

  const groupByTipo = new Map<string, (typeof groups)[number]>();
  groups.forEach((group) => {
    if (!group.defaultForTipo) return;
    groupByTipo.set(normalize(group.defaultForTipo), group);
  });

  if (groupByTipo.size === 0) {
    logger.warning("⚠️ Nenhum grupo padrão com defaultForTipo definido.");
    return 0;
  }

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

    if (!tipo && usuario.matrizId === null) {
      tipo = "Matriz";
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

  logger.success(`✅ Grupos aplicados em ${associados} usuários.`);
  return associados;
}
