// installment.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";

const prisma = new PrismaClient();
const installmentRouter = Router();

// Rota para criar um parcelamento
installmentRouter.post(
  "/criar-parcelamento/:transacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const transacaoId = parseInt(req.params.transacaoId, 10);
      const { numeroParcela, valorParcela, comissaoParcela } = req.body;

      // Verificar se a transação associada ao ID existe
      const transacaoExistente = await prisma.transacao.findUnique({
        where: { idTransacao: transacaoId },
      });

      if (!transacaoExistente) {
        return res.status(404).json({ error: "Transação não encontrada." });
      }

      // Criar o parcelamento associado à transação
      const novoParcelamento = await prisma.parcelamento.create({
        data: {
          numeroParcela,
          valorParcela,
          comissaoParcela,
          transacaoId,
        },
      });

      res.status(201).json(novoParcelamento);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar parcelamento." });
    }
  }
);
// Rota para listar todos os parcelamentos
installmentRouter.get("/listar-parcelamentos", async (req: Request, res: Response) => {
  try {
    const { pagina = 1, itensPorPagina = 10 } = req.query;
    const paginaInt = parseInt(pagina as string, 10);
    const itensPorPaginaInt = parseInt(itensPorPagina as string, 10);

    const parcelamentos = await prisma.parcelamento.findMany({
      take: itensPorPaginaInt,
      skip: (paginaInt - 1) * itensPorPaginaInt,
      include:{
        transacao: true,
      }
    });

    const totalParcelamentos = await prisma.parcelamento.count();

    const meta = {
      pagina: paginaInt,
      itensPorPagina: itensPorPaginaInt,
      totalItens: totalParcelamentos,
      totalPaginas: Math.ceil(totalParcelamentos / itensPorPaginaInt),
    };

    res.status(200).json({ parcelamentos, meta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar parcelamentos." });
  }
});
// Rota para editar um parcelamento
installmentRouter.put(
  "/editar-parcelamento/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { numeroParcela, valorParcela, comissaoParcela } = req.body;

      const parcelamentoAtualizado = await prisma.parcelamento.update({
        where: { idParcelamento: parseInt(id, 10) },
        data: {
          numeroParcela,
          valorParcela,
          comissaoParcela,
        },
        include: {
          transacao: true,
        },
      });

      res.status(200).json(parcelamentoAtualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao editar parcelamento." });
    }
  }
);

// Rota para deletar um parcelamento
installmentRouter.delete(
  "/deletar-parcelamento/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.parcelamento.delete({
        where: { idParcelamento: parseInt(id, 10) },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar parcelamento." });
    }
  }
);

export default installmentRouter;
