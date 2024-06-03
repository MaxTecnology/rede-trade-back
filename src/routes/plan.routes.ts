import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";


const planRouter = Router();
const prisma = new PrismaClient();

// Rota para criar um novo plano
planRouter.post(
  "/criar-plano",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const {
        nomePlano,
        tipoDoPlano,
        taxaInscricao,
        taxaComissao,
        taxaManutencaoAnual,
      } = req.body;
      // Verificar se já existe um plano com o mesmo nome
      const planoExistente = await prisma.plano.findFirst({
        where: { nomePlano },
      });

      if (planoExistente) {
        return res.status(400).json({
          error: "Já existe um plano com o mesmo nome.",
        });
      }
      const novoPlano = await prisma.plano.create({
        data: {
          nomePlano,
          tipoDoPlano,
          taxaInscricao,
          taxaComissao,
          taxaManutencaoAnual,
        },
      });

      return res.status(201).json(novoPlano);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para listar todos os planos com paginação
planRouter.get('/listar-planos', async (req: Request, res: Response) => {
  try {
  const { page = 1, pageSize = 10 } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const itemsPerPage = parseInt(pageSize as string, 10);

  const totalItems = await prisma.plano.count(); // Conta o total de planos

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const planos = await prisma.plano.findMany({
    include: {
      contas: true,
    },
    skip: (pageNumber - 1) * itemsPerPage,
    take: itemsPerPage,
  });

  const metadata = {
    page: pageNumber,
    pageSize: itemsPerPage,
    totalItems,
    totalPages,
  };

  return res.status(200).json({ planos, metadata });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});
  // Rota para atribuir um plano a uma conta
  planRouter.post(
    "/atribuir-plano/:idConta/:idPlano",
    verifyToken,
    checkBlocked,
    async (req: Request, res: Response) => {
      try {
        const { idConta, idPlano } = req.params;

        // Verificar se a conta e o plano existem
        const conta = await prisma.conta.findUnique({
          where: { idConta: parseInt(idConta, 10) },
        });

        const plano = await prisma.plano.findUnique({
          where: { idPlano: parseInt(idPlano, 10) },
        });

        if (!conta || !plano) {
          return res
            .status(404)
            .json({ error: "Conta ou plano não encontrados." });
        }

        // Atualizar a conta com o plano associado
        const contaAtualizada = await prisma.conta.update({
          where: { idConta: parseInt(idConta, 10) },
          data: {
            planoId: parseInt(idPlano, 10),
          },
          include: {
            usuario: {
              select: {
                idUsuario: true,
                nome: true,
                cpf: true,
                // Adicione outros campos do usuário que deseja incluir
              },
            },
            plano: true,
          },
        });

        return res.status(200).json(contaAtualizada);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
      }
    }
  );
// Rota para remover o plano de uma conta
planRouter.post(
  "/remover-plano/:idConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idConta } = req.params;

      // Verificar se a conta existe
      const conta = await prisma.conta.findUnique({
        where: { idConta: parseInt(idConta, 10) },
      });

      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Remover o plano associado da conta
      const contaAtualizada = await prisma.conta.update({
        where: { idConta: parseInt(idConta, 10) },
        data: {
          planoId: null, // Remover o plano associado, atribuindo null ao campo planoId
        },
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nome: true,
              cpf: true,
              // Adicione outros campos do usuário que deseja incluir
            },
          },
        },
      });

      return res.status(200).json(contaAtualizada);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para atualizar um plano pelo ID
planRouter.put(
  "/atualizar-plano/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dadosAtualizados = req.body;

      // Atualizar o plano pelo ID
      const planoAtualizado = await prisma.plano.update({
        where: { idPlano: parseInt(id, 10) },
        data: dadosAtualizados,
      });

      return res.status(200).json(planoAtualizado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para deletar um plano pelo ID
planRouter.delete(
  "/deletar-plano/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Verificar se o plano está associado a alguma conta
      const contasComPlano = await prisma.conta.findMany({
        where: { planoId: parseInt(id, 10) },
      });

      if (contasComPlano.length > 0) {
        return res.status(400).json({
          error: "Não é possível deletar o plano. Está associado a contas.",
        });
      }

      // Deletar o plano pelo ID
      const planoDeletado = await prisma.plano.delete({
        where: { idPlano: parseInt(id, 10) },
      });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
export default planRouter;