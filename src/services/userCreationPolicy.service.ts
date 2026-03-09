import { FilialTipo } from "@prisma/client";

type CreatorRoleInput = {
  tipo?: string | null;
  tipoConta?: string | null;
  filialTipo?: FilialTipo | null;
};

type CreationPolicyInput = {
  targetTipo?: string | null;
  creatorRole: ReturnType<typeof resolveCreatorRole>;
};

type PolicyResult = {
  allowed: boolean;
  httpStatus?: number;
  error?: string;
};

const normalize = (value?: string | null) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() || "";

const isAgenciaLike = (normalizedTipo: string) =>
  normalizedTipo.includes("agencia") || normalizedTipo.includes("franquia");

export const validateCreatorIdPayload = (
  authenticatedUserId: number,
  creatorIdFromBody: number | null
): PolicyResult => {
  if (creatorIdFromBody === null) {
    return { allowed: true };
  }

  if (!Number.isInteger(creatorIdFromBody) || creatorIdFromBody <= 0) {
    return {
      allowed: false,
      httpStatus: 400,
      error: "usuarioCriadorId informado é inválido.",
    };
  }

  if (creatorIdFromBody !== authenticatedUserId) {
    return {
      allowed: false,
      httpStatus: 403,
      error:
        "Não é permitido informar um usuário criador diferente do usuário autenticado.",
    };
  }

  return { allowed: true };
};

export const resolveCreatorRole = ({
  tipo,
  tipoConta,
  filialTipo,
}: CreatorRoleInput) => {
  const tipoNormalizado = normalize(tipo);
  const tipoContaNormalizado = normalize(tipoConta);

  const isMatriz =
    tipoNormalizado === "matriz" || tipoContaNormalizado === "matriz";

  const agenciaByTipo = isAgenciaLike(tipoNormalizado);
  const agenciaByConta =
    tipoContaNormalizado === "franquia" ||
    tipoContaNormalizado === "franquia master";
  const isAgencia = agenciaByTipo || agenciaByConta;

  const hasMasterHint =
    tipoNormalizado.includes("master") || tipoContaNormalizado.includes("master");
  const hasComumHint = tipoNormalizado.includes("comum");

  const isAgenciaMaster =
    isAgencia &&
    (filialTipo === FilialTipo.MASTER ||
      (filialTipo !== FilialTipo.COMUM && hasMasterHint));

  const isAgenciaComum =
    isAgencia &&
    !isAgenciaMaster &&
    (filialTipo === FilialTipo.COMUM ||
      hasComumHint ||
      (!hasMasterHint && filialTipo !== FilialTipo.MASTER));

  return {
    isMatriz,
    isAgencia,
    isAgenciaMaster,
    isAgenciaComum,
    tipoNormalizado,
    tipoContaNormalizado,
  };
};

export const evaluateUserCreationPolicy = ({
  targetTipo,
  creatorRole,
}: CreationPolicyInput): PolicyResult => {
  const target = normalize(targetTipo);
  const creatorCanCreateUsers = creatorRole.isMatriz || creatorRole.isAgencia;

  if (!target) {
    return {
      allowed: false,
      httpStatus: 400,
      error: "Tipo de usuário não informado para criação.",
    };
  }

  if (!creatorCanCreateUsers) {
    return {
      allowed: false,
      httpStatus: 403,
      error:
        "Somente usuários Matriz ou Agência podem cadastrar novos usuários.",
    };
  }

  const targetIsAgencia = isAgenciaLike(target);
  const targetIsMatriz = target === "matriz";

  if (targetIsAgencia && !creatorRole.isMatriz && !creatorRole.isAgenciaMaster) {
    return {
      allowed: false,
      httpStatus: 403,
      error:
        "Somente Matriz ou Agência Master podem cadastrar novas agências.",
    };
  }

  if (targetIsMatriz && !creatorRole.isMatriz) {
    return {
      allowed: false,
      httpStatus: 403,
      error: "Somente usuários Matriz podem cadastrar uma nova Matriz.",
    };
  }

  return { allowed: true };
};
