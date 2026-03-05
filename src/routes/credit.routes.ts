import { Router, Request, Response } from "express";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import prisma from "../lib/prisma";

const creditRouter = Router();

type CreditRole = "MATRIZ" | "AGENCIA" | "ASSOCIADO" | "OUTRO";

const CREDIT_STATUS = {
  PENDING: "PENDENTE",
  FORWARDED: "ENCAMINHADO_PARA_MATRIZ",
  APPROVED: "APROVADO",
  DENIED: "NEGADO",
} as const;

type CreditStatus = (typeof CREDIT_STATUS)[keyof typeof CREDIT_STATUS];

const FINAL_CREDIT_STATUSES = new Set<CreditStatus>([
  CREDIT_STATUS.APPROVED,
  CREDIT_STATUS.DENIED,
]);

type RequesterContext = {
  idUsuario: number;
  nome: string;
  matrizId: number | null;
  usuarioCriadorId: number | null;
  role: CreditRole;
};

const creditUserSelect = {
  idUsuario: true,
  nome: true,
  email: true,
  telefone: true,
  cpf: true,
  cidade: true,
  bairro: true,
  numero: true,
  complemento: true,
  conta: true,
} as const;

const creditInclude = {
  usuarioCriador: { select: creditUserSelect },
  matriz: { select: creditUserSelect },
  usuarioSolicitante: { select: creditUserSelect },
} as const;

const normalizeText = (value?: string | null) =>
  value
    ?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";

const resolveRole = (tipoConta?: string | null): CreditRole => {
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

const normalizeCreditStatus = (value: unknown): CreditStatus | null => {
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

const isFinalStatus = (status: CreditStatus | null) =>
  Boolean(status && FINAL_CREDIT_STATUSES.has(status));

const parseValorSolicitado = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d.,-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getRequesterContext = async (
  requesterId: number
): Promise<RequesterContext | null> => {
  const requester = await prisma.usuarios.findUnique({
    where: { idUsuario: requesterId },
    select: {
      idUsuario: true,
      nome: true,
      matrizId: true,
      usuarioCriadorId: true,
      tipo: true,
      conta: {
        select: {
          tipoDaConta: {
            select: {
              tipoDaConta: true,
            },
          },
        },
      },
    },
  });

  if (!requester) return null;

  const roleSource =
    requester.conta?.tipoDaConta?.tipoDaConta ?? requester.tipo ?? null;

  return {
    idUsuario: requester.idUsuario,
    nome: requester.nome,
    matrizId: requester.matrizId ?? null,
    usuarioCriadorId: requester.usuarioCriadorId ?? null,
    role: resolveRole(roleSource),
  };
};

const canAccessUserCredits = (
  requester: RequesterContext,
  targetUserId: number,
  targetUserCreatorId: number | null
) => {
  if (requester.role === "MATRIZ") return true;
  if (requester.idUsuario === targetUserId) return true;
  if (requester.role === "AGENCIA" && targetUserCreatorId === requester.idUsuario)
    return true;
  return false;
};

const canManageSolicitacao = (
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

const canFinalizeFromStatus = (currentStatus: CreditStatus | null) =>
  currentStatus === CREDIT_STATUS.PENDING ||
  currentStatus === CREDIT_STATUS.FORWARDED;

const canAgencyForwardFromStatus = (currentStatus: CreditStatus | null) =>
  currentStatus === CREDIT_STATUS.PENDING;

const toBooleanMatrizAprovacao = (status: CreditStatus) =>
  status === CREDIT_STATUS.APPROVED;

creditRouter.post(
  "/solicitar",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { valorSolicitado, descricaoSolicitante } = req.body;
      const usuarioId = Number(res.locals.userId);
      const valorSolicitadoParsed = parseValorSolicitado(valorSolicitado);

      if (!usuarioId || !valorSolicitadoParsed || valorSolicitadoParsed <= 0) {
        return res
          .status(400)
          .json({ error: "Dados de solicitação inválidos" });
      }

      const requester = await getRequesterContext(usuarioId);
      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioId },
        select: {
          idUsuario: true,
          usuarioCriadorId: true,
          matrizId: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      let matrizId = usuario.matrizId ?? null;
      if (!matrizId && usuario.usuarioCriadorId) {
        const criador = await prisma.usuarios.findUnique({
          where: { idUsuario: usuario.usuarioCriadorId },
          select: { matrizId: true },
        });
        matrizId = criador?.matrizId ?? null;
      }
      if (!matrizId && requester.role === "MATRIZ") {
        matrizId = requester.idUsuario;
      }

      const solicitacaoCredito = await prisma.solicitacaoCredito.create({
        data: {
          valorSolicitado: valorSolicitadoParsed,
          matrizId,
          status: CREDIT_STATUS.PENDING,
          descricaoSolicitante,
          usuarioSolicitanteId: usuarioId,
          usuarioCriadorId: usuario.usuarioCriadorId ?? usuarioId,
        },
        include: creditInclude,
      });

      return res.status(200).json({
        message: "Solicitação de crédito enviada com sucesso",
        solicitacaoCredito,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.put(
  "/editar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { valorSolicitado, descricaoSolicitante } = req.body;
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);
      const valorSolicitadoParsed = parseValorSolicitado(valorSolicitado);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      if (!valorSolicitadoParsed || valorSolicitadoParsed <= 0) {
        return res.status(400).json({ error: "Dados de edição inválidos" });
      }

      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        select: {
          idSolicitacaoCredito: true,
          status: true,
          usuarioSolicitanteId: true,
        },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      if (
        requester.role !== "MATRIZ" &&
        solicitacaoCredito.usuarioSolicitanteId !== requester.idUsuario
      ) {
        return res.status(403).json({
          error: "Você não possui permissão para editar esta solicitação.",
        });
      }

      const statusAtual = normalizeCreditStatus(solicitacaoCredito.status);
      if (statusAtual !== CREDIT_STATUS.PENDING) {
        return res.status(409).json({
          error:
            "Apenas solicitações pendentes podem ser editadas antes da análise.",
        });
      }

      const solicitacaoAtualizada = await prisma.solicitacaoCredito.update({
        where: { idSolicitacaoCredito: solicitacaoId },
        data: {
          valorSolicitado: valorSolicitadoParsed,
          descricaoSolicitante,
        },
      });

      return res.status(200).json({
        message: "Solicitação de crédito atualizada com sucesso",
        solicitacaoAtualizada,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.get(
  "/listar/:usuarioId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const usuarioId = parseInt(req.params.usuarioId, 10);
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioId },
        select: {
          idUsuario: true,
          usuarioCriadorId: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (
        !canAccessUserCredits(
          requester,
          usuario.idUsuario,
          usuario.usuarioCriadorId ?? null
        )
      ) {
        return res.status(403).json({
          error: "Você não possui permissão para visualizar estes créditos.",
        });
      }

      const solicitacoesCredito = await prisma.solicitacaoCredito.findMany({
        where: { usuarioSolicitanteId: usuarioId },
        include: creditInclude,
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({ solicitacoesCredito });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.get(
  "/listar-todos",
  verifyToken,
  checkBlocked,
  async (_req: Request, res: Response) => {
    try {
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      if (requester.role !== "MATRIZ") {
        return res.status(403).json({
          error: "Apenas a Matriz pode listar todos os créditos.",
        });
      }

      const todasSolicitacoes = await prisma.solicitacaoCredito.findMany({
        include: creditInclude,
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({ todasSolicitacoes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.get(
  "/listar-filhos/:usuarioCriadorId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const usuarioCriadorId = parseInt(req.params.usuarioCriadorId, 10);
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      const isRequesterInOwnScope =
        requester.idUsuario === usuarioCriadorId ||
        requester.usuarioCriadorId === usuarioCriadorId;

      if (
        requester.role !== "MATRIZ" &&
        !(requester.role === "AGENCIA" && isRequesterInOwnScope)
      ) {
        return res.status(403).json({
          error: "Você não possui permissão para listar créditos deste escopo.",
        });
      }

      const usuarioCriador = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioCriadorId },
        select: { idUsuario: true },
      });

      if (!usuarioCriador) {
        return res
          .status(404)
          .json({ error: "Usuário criador não encontrado" });
      }

      const usuariosFilhos = await prisma.usuarios.findMany({
        where: { usuarioCriadorId },
        select: { idUsuario: true },
      });

      const idsUsuariosFilhos = usuariosFilhos.map((usuario) => usuario.idUsuario);

      const solicitacoesDosFilhos =
        idsUsuariosFilhos.length > 0
          ? await prisma.solicitacaoCredito.findMany({
              where: { usuarioSolicitanteId: { in: idsUsuariosFilhos } },
              include: creditInclude,
              orderBy: { createdAt: "desc" },
            })
          : [];

      return res.status(200).json({ solicitacoesDosFilhos });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.put(
  "/encaminhar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { status, comentarioAgencia } = req.body;
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);
      const novoStatus = normalizeCreditStatus(status);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      if (
        novoStatus !== CREDIT_STATUS.FORWARDED &&
        novoStatus !== CREDIT_STATUS.DENIED
      ) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        select: {
          idSolicitacaoCredito: true,
          status: true,
          usuarioCriadorId: true,
          matrizId: true,
          usuarioCriador: {
            select: {
              idUsuario: true,
              matrizId: true,
              usuarioCriadorId: true,
            },
          },
        },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      if (!canManageSolicitacao(requester, solicitacaoCredito.usuarioCriadorId)) {
        return res.status(403).json({
          error: "Você não possui permissão para encaminhar esta solicitação.",
        });
      }

      const statusAtual = normalizeCreditStatus(solicitacaoCredito.status);
      if (isFinalStatus(statusAtual)) {
        return res.status(409).json({
          error: "Solicitação finalizada não permite novo encaminhamento.",
        });
      }

      if (
        requester.role === "AGENCIA" &&
        !canAgencyForwardFromStatus(statusAtual)
      ) {
        return res.status(409).json({
          error:
            "A agência só pode encaminhar ou negar solicitações pendentes.",
        });
      }

      if (requester.role === "MATRIZ" && novoStatus === CREDIT_STATUS.DENIED) {
        return res.status(400).json({
          error:
            "A Matriz deve usar a rota de finalizar análise para aprovar ou negar.",
        });
      }

      const resolvedMatrizId =
        solicitacaoCredito.matrizId ??
        solicitacaoCredito.usuarioCriador?.matrizId ??
        solicitacaoCredito.usuarioCriador?.usuarioCriadorId ??
        requester.matrizId ??
        (requester.role === "MATRIZ" ? requester.idUsuario : null);

      if (!resolvedMatrizId) {
        return res.status(400).json({
          error: "Não foi possível resolver a matriz da solicitação.",
        });
      }

      const solicitacaoAtualizada = await prisma.solicitacaoCredito.update({
        where: { idSolicitacaoCredito: solicitacaoId },
        data: {
          status: novoStatus,
          matrizId: resolvedMatrizId,
          comentarioAgencia: comentarioAgencia ?? null,
          encaminhadoPorId: requester.idUsuario,
          encaminhadoEm: new Date(),
        },
        include: creditInclude,
      });

      return res.status(200).json({
        message: `Solicitação ${solicitacaoId} atualizada com sucesso`,
        solicitacaoAtualizada,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.get(
  "/matriz/analisar",
  verifyToken,
  checkBlocked,
  async (_req: Request, res: Response) => {
    try {
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      if (requester.role !== "MATRIZ") {
        return res.status(403).json({
          error: "Apenas a Matriz pode acessar créditos para análise global.",
        });
      }

      const solicitacoesEmAnalise = await prisma.solicitacaoCredito.findMany({
        where: {
          status: {
            in: [CREDIT_STATUS.FORWARDED, CREDIT_STATUS.PENDING],
          },
        },
        include: creditInclude,
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({
        message: "Lista de créditos enviados para análise da matriz",
        solicitacoesEmAnalise,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

creditRouter.put(
  "/finalizar-analise/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { status, comentarioMatriz } = req.body;
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);
      const novoStatus = normalizeCreditStatus(status);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      if (requester.role !== "MATRIZ") {
        return res.status(403).json({
          error: "Apenas a Matriz pode finalizar análise de crédito.",
        });
      }

      if (
        novoStatus !== CREDIT_STATUS.APPROVED &&
        novoStatus !== CREDIT_STATUS.DENIED
      ) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        include: {
          usuarioSolicitante: {
            select: {
              idUsuario: true,
              conta: {
                select: {
                  idConta: true,
                  limiteCredito: true,
                  limiteUtilizado: true,
                  limiteDisponivel: true,
                },
              },
            },
          },
        },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      const statusAtual = normalizeCreditStatus(solicitacaoCredito.status);
      if (isFinalStatus(statusAtual)) {
        return res.status(409).json({
          error: "Solicitação já foi finalizada e não pode ser reanalisada.",
        });
      }

      if (!canFinalizeFromStatus(statusAtual)) {
        return res.status(409).json({
          error: "Transição de status inválida para finalização.",
        });
      }

      const limiteCreditoAntes =
        solicitacaoCredito.usuarioSolicitante?.conta?.limiteCredito ?? 0;
      let limiteCreditoDepois = limiteCreditoAntes;

      const resultado = await prisma.$transaction(async (tx) => {
        const solicitacaoAtualizada = await tx.solicitacaoCredito.update({
          where: { idSolicitacaoCredito: solicitacaoId },
          data: {
            status: novoStatus,
            matrizAprovacao: toBooleanMatrizAprovacao(novoStatus),
            comentarioMatriz: comentarioMatriz ?? null,
            analisadoPorId: requester.idUsuario,
            analisadoEm: new Date(),
            matrizId: solicitacaoCredito.matrizId ?? requester.idUsuario,
          },
          include: creditInclude,
        });

        if (novoStatus === CREDIT_STATUS.APPROVED) {
          const contaSolicitante = solicitacaoCredito.usuarioSolicitante?.conta;
          if (!contaSolicitante) {
            throw new Error("Conta não encontrada para aprovação do crédito.");
          }

          const limiteCreditoAtual = contaSolicitante.limiteCredito ?? 0;
          const limiteUtilizadoAtual = contaSolicitante.limiteUtilizado ?? 0;
          limiteCreditoDepois =
            limiteCreditoAtual + solicitacaoCredito.valorSolicitado;
          const limiteDisponivelDepois =
            limiteCreditoDepois - limiteUtilizadoAtual;

          await tx.conta.update({
            where: { idConta: contaSolicitante.idConta },
            data: {
              limiteCredito: limiteCreditoDepois,
              limiteDisponivel: limiteDisponivelDepois,
            },
          });

          await tx.fundoPermuta.create({
            data: {
              valor: solicitacaoCredito.valorSolicitado,
              usuarioId: solicitacaoCredito.usuarioSolicitante.idUsuario,
            },
          });
        }

        await tx.auditoriaFinanceira.create({
          data: {
            usuarioId: requester.idUsuario,
            usuarioExecutor: requester.nome,
            acao:
              novoStatus === CREDIT_STATUS.APPROVED
                ? "CREDITO_APROVADO"
                : "CREDITO_NEGADO",
            entidade: "SOLICITACAO_CREDITO",
            entidadeId: solicitacaoCredito.idSolicitacaoCredito,
            dadosAnteriores: {
              status: solicitacaoCredito.status,
              limiteCredito: limiteCreditoAntes,
            },
            dadosNovos: {
              status: novoStatus,
              limiteCredito: limiteCreditoDepois,
            },
            valorOperacao: solicitacaoCredito.valorSolicitado,
            contasAfetadas: solicitacaoCredito.usuarioSolicitante?.conta
              ? [solicitacaoCredito.usuarioSolicitante.conta.idConta]
              : [],
            detalhesOperacao: `Análise de crédito finalizada pela matriz para solicitação ${solicitacaoId}.`,
            resultado: "SUCESSO",
          },
        });

        return solicitacaoAtualizada;
      });

      return res.status(200).json({
        message: `Solicitação ${solicitacaoId} analisada pela matriz`,
        limiteCreditoAntes,
        limiteCreditoDepois,
        solicitacaoAtualizada: resultado,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no servidor",
      });
    }
  }
);

creditRouter.delete(
  "/apagar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const requesterId = Number(res.locals.userId);
      const requester = await getRequesterContext(requesterId);

      if (!requester) {
        return res.status(401).json({ error: "Usuário autenticado inválido." });
      }

      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        select: {
          idSolicitacaoCredito: true,
          status: true,
          usuarioSolicitanteId: true,
        },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      if (
        requester.role !== "MATRIZ" &&
        solicitacaoCredito.usuarioSolicitanteId !== requester.idUsuario
      ) {
        return res.status(403).json({
          error: "Você não possui permissão para apagar esta solicitação.",
        });
      }

      const statusAtual = normalizeCreditStatus(solicitacaoCredito.status);
      if (statusAtual !== CREDIT_STATUS.PENDING) {
        return res.status(409).json({
          error: "Apenas solicitações pendentes podem ser apagadas.",
        });
      }

      await prisma.solicitacaoCredito.delete({
        where: { idSolicitacaoCredito: solicitacaoId },
      });

      return res.status(200).json({
        message: "Solicitação de crédito apagada com sucesso",
        solicitacaoCredito,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

export default creditRouter;
