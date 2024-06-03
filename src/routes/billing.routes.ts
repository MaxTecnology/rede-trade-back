// billing.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";

const prisma = new PrismaClient();
const billingRouter = Router();

// Rota para criar uma cobrança associada a uma transação
billingRouter.post(
  "/criar-cobranca",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const {
        valorFatura,
        status,
        transacaoId,
        contaId,
        vencimentoFatura,
        subContaId,
        usuarioId,
        referencia,
      } = req.body;

      // Crie a nova cobrança associada ao usuário, conta ou subconta
      const novaCobranca = await prisma.cobranca.create({
        data: {
          valorFatura,
          status,
          transacaoId,
          usuarioId,
          contaId,
          vencimentoFatura,
          subContaId,
          referencia,
        },
        include: {
          transacao: true,
          conta: true,
          subConta: true,
        },
      });

      res.status(201).json(novaCobranca);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao adicionar cobrança." });
    }
  }
);

// Rota para listar proxima fatura de um usuário
billingRouter.get("/listar-proxima-fatura/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Encontrar todas as cobranças do usuário
    const cobrancas = await prisma.cobranca.findMany({
      where: { usuarioId: parseInt(id, 10) },
      include: {
        transacao: {
          include: {
            voucher: true,
          },
        },
        usuario: {
          select: {
            nome: true,
            nomeFantasia: true,
            email: true,
            telefone: true,
            conta: true,
          },
        },
      },
      orderBy: { vencimentoFatura: "asc" }, // Ordenar por data de vencimento ascendente
    });

    if (cobrancas.length === 0) {
      return res.json({ error: "Nenhuma cobrança encontrada para o usuário." });
    }

    // Encontrar a data de vencimento da última cobrança
    const ultimaCobranca = cobrancas[cobrancas.length - 1];
    const dataUltimaCobranca = ultimaCobranca.vencimentoFatura;

    // Encontrar a próxima cobrança após a última
    const proximaCobranca = cobrancas.find((cobranca) => {
      return (
        cobranca.vencimentoFatura !== null &&
        dataUltimaCobranca !== null &&
        cobranca.vencimentoFatura >= dataUltimaCobranca
      );
    });

    // Filtrar cobranças com o mesmo vencimento da última cobrança
    const cobrancasMesmoVencimento = cobrancas.filter(
      (cobranca) => cobranca.vencimentoFatura === dataUltimaCobranca
    );

    const resposta = {
      proximaFatura: proximaCobranca ? proximaCobranca.vencimentoFatura : null,
      cobrancas: cobrancasMesmoVencimento,
    };

    return res.status(200).json(resposta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar cobranças." });
  }
});

// Rota para listar cobranças de um usuário
billingRouter.get(
  "/listar-cobrancas/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Tentar encontrar um usuário pelo ID
      const cobrancas = await prisma.cobranca.findMany({
        where: {
          usuarioId: parseInt(id, 10),
          status: {
            not: "Quitado",
          },
        },
        include: {
          transacao: {
            include: {
              voucher: true,
            },
          },
          usuario: {
            select: {
              nome: true,
              nomeFantasia: true,
              email: true,
              telefone: true,
              conta: true,
            },
          },
        },
      });

      if (cobrancas) {
        return res.status(200).json(cobrancas);
      }

      // Se o usuário não for encontrado, tentar encontrar uma subconta pelo ID
      const subConta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(id, 10) },
        include: { cobrancas: true },
      });

      if (subConta) {
        return res.status(200).json(subConta.cobrancas);
      }

      // Se nem usuário nem subconta for encontrada, retornar erro
      return res
        .status(404)
        .json({ error: "Usuário ou subconta não encontrado." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao listar cobranças." });
    }
  }
);
// Rota para listar todas as cobranças
billingRouter.get(
  "/listar-todas-cobrancas",
  async (req: Request, res: Response) => {
    try {
      // Listar todas as cobranças com informações relacionadas
      const todasCobrancas = await prisma.cobranca.findMany({
        include: {
          transacao: true,
          conta: true,
          subConta: true,
        },
      });

      res.status(200).json(todasCobrancas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao listar todas as cobranças." });
    }
  }
);
// Rota para atualizar dados de uma cobrança
billingRouter.put(
  "/atualizar-cobranca/:idCobranca",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idCobranca } = req.params;

      // Verificar se a cobrança existe
      const cobrancaExistente = await prisma.cobranca.findUnique({
        where: { idCobranca: parseInt(idCobranca, 10) },
      });

      if (!cobrancaExistente) {
        return res.status(404).json({ error: "Cobrança não encontrada." });
      }

      // Obter os dados a serem atualizados do corpo da requisição
      const {
        valorFatura,
        status,
        transacaoId,
        contaId,
        vencimentoFatura,
        subContaId,
      } = req.body;

      // Atualizar os dados da cobrança
      const cobrancaAtualizada = await prisma.cobranca.update({
        where: { idCobranca: parseInt(idCobranca, 10) },
        data: {
          valorFatura,
          status,
          transacaoId,
          contaId,
          vencimentoFatura,
          subContaId,
        },
      });

      res.status(200).json(cobrancaAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar cobrança." });
    }
  }
);
// Rota para deletar uma cobrança
billingRouter.delete(
  "/deletar-cobranca/:idCobranca",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idCobranca } = req.params;

      // Verificar se a cobrança existe
      const cobrancaExistente = await prisma.cobranca.findUnique({
        where: { idCobranca: parseInt(idCobranca, 10) },
      });

      if (!cobrancaExistente) {
        return res.status(404).json({ error: "Cobrança não encontrada." });
      }

      // Deletar a cobrança
      await prisma.cobranca.delete({
        where: { idCobranca: parseInt(idCobranca, 10) },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar cobrança." });
    }
  }
);
export default billingRouter;
