export type CreditRole = "MATRIZ" | "AGENCIA" | "ASSOCIADO" | "OUTRO";

export const CREDIT_STATUS = {
  PENDING: "PENDENTE",
  FORWARDED: "ENCAMINHADO_PARA_MATRIZ",
  APPROVED: "APROVADO",
  DENIED: "NEGADO",
} as const;

export type CreditStatus = (typeof CREDIT_STATUS)[keyof typeof CREDIT_STATUS];

export type RequesterContext = {
  idUsuario: number;
  nome: string;
  matrizId: number | null;
  usuarioCriadorId: number | null;
  role: CreditRole;
};

const FINAL_CREDIT_STATUSES = new Set<CreditStatus>([
  CREDIT_STATUS.APPROVED,
  CREDIT_STATUS.DENIED,
]);

const normalizeText = (value?: string | null) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

export const resolveCreditRole = (tipoConta?: string | null): CreditRole => {
  const normalized = normalizeText(tipoConta);

  if (normalized === "matriz") return "MATRIZ";
  if (normalized.includes("associado")) return "ASSOCIADO";
  if (
    normalized.includes("franquia") ||
    normalized.includes("agencia") ||
    normalized.includes("gerente") ||
    normalized.includes("master")
  ) {
    return "AGENCIA";
  }

  return "OUTRO";
};

export const normalizeCreditStatus = (value: unknown): CreditStatus | null => {
  if (typeof value !== "string") return null;

  const normalized = normalizeText(value);

  if (normalized === "pendente") return CREDIT_STATUS.PENDING;
  if (
    normalized === "encaminhado para a matriz" ||
    normalized === "encaminhado para matriz" ||
    normalized === "encaminhado_para_matriz"
  ) {
    return CREDIT_STATUS.FORWARDED;
  }
  if (normalized === "aprovado") return CREDIT_STATUS.APPROVED;
  if (normalized === "negado") return CREDIT_STATUS.DENIED;

  return null;
};

export const isFinalCreditStatus = (status: CreditStatus | null) =>
  Boolean(status && FINAL_CREDIT_STATUSES.has(status));

export const canAccessUserCredits = (
  requester: RequesterContext,
  targetUserId: number,
  targetUserCreatorId: number | null
) => {
  if (requester.role === "MATRIZ") return true;
  if (requester.idUsuario === targetUserId) return true;
  if (requester.role === "AGENCIA" && targetUserCreatorId === requester.idUsuario) {
    return true;
  }
  return false;
};

export const canManageSolicitacao = (
  requester: RequesterContext,
  solicitacaoUsuarioCriadorId: number
) => {
  if (requester.role === "MATRIZ") return true;
  if (
    requester.role === "AGENCIA" &&
    requester.idUsuario === solicitacaoUsuarioCriadorId
  ) {
    return true;
  }
  return false;
};

export const canFinalizeFromStatus = (currentStatus: CreditStatus | null) =>
  currentStatus === CREDIT_STATUS.PENDING ||
  currentStatus === CREDIT_STATUS.FORWARDED;

export const canAgencyForwardFromStatus = (
  currentStatus: CreditStatus | null
) => currentStatus === CREDIT_STATUS.PENDING;

export const toBooleanMatrizAprovacao = (status: CreditStatus) =>
  status === CREDIT_STATUS.APPROVED;

