// offer.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";

const prisma = new PrismaClient();
const offerRouter = Router();

// Rota para cadastrar uma nova oferta
offerRouter.post(
  "/criar-oferta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      // Obter dados da oferta do corpo da requisição
      const {
        idFranquia,
        nomeFranquia,
        titulo,
        tipo,
        status,
        descricao,
        quantidade,
        valor,
        limiteCompra,
        vencimento,
        cidade,
        estado,
        retirada,
        obs,
        imagens,
        usuarioId,
        nomeUsuario,
        categoriaId,
        subcontaId,
      } = req.body;
      // Verificar se já existe uma oferta com o mesmo nome e mesmo valor
      const ofertaExistente = await prisma.oferta.findFirst({
        where: { titulo, valor },
      });

      if (ofertaExistente) {
        return res.status(400).json({
          error: "Já existe uma oferta com o mesmo nome e valor.",
        });
      }

      const novaOferta = await prisma.oferta.create({
        data: {
          idFranquia,
          nomeFranquia,
          titulo,
          tipo,
          status,
          descricao,
          quantidade,
          valor,
          limiteCompra,
          vencimento,
          cidade,
          estado,
          retirada,
          obs,
          imagens,
          usuarioId,
          nomeUsuario,
          categoriaId,
          subcontaId,
        },
      });

      res.status(201).json(novaOferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao cadastrar oferta." });
    }
  }
);
// Rota para listar todas as ofertas
offerRouter.get('/listar-ofertas', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ofertas = await prisma.oferta.findMany({
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      include: {
        categoria: true,
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        subconta: {
          select: {
            idSubContas: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
    });

    const totalOfertas = await prisma.oferta.count();

    const totalPages = Math.ceil(totalOfertas / Number(limit));

    const meta = {
      totalOfertas,
      totalPages,
      currentPage: Number(page),
    };

    res.status(200).json({ ofertas, meta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar ofertas.' });
  }
});
// Rota para atualizar uma oferta
offerRouter.put(
  "/atualizar-oferta/:ofertaId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const ofertaId = parseInt(req.params.ofertaId, 10);
      const {
        titulo,
        descricao,
        quantidade,
        valor,
        limiteCompra,
        vencimento,
        cidade,
        estado,
        retirada,
        obs,
      } = req.body;

      const ofertaAtualizada = await prisma.oferta.update({
        where: { idOferta: ofertaId },
        data: {
          titulo,
          descricao,
          quantidade,
          valor,
          limiteCompra,
          vencimento,
          cidade,
          estado,
          retirada,
          obs,
        },
      });

      res.status(200).json(ofertaAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar oferta." });
    }
  }
);
// Rota para deletar uma oferta
offerRouter.delete(
  "/deletar-oferta/:ofertaId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const ofertaId = parseInt(req.params.ofertaId, 10);

      // Verifica se há transações relacionadas à oferta
      const transacoesRelacionadas = await prisma.transacao.findMany({
        where: { ofertaId },
      });

      if (transacoesRelacionadas.length > 0) {
        return res
          .status(400)
          .json({
            error:
              "Não é possível excluir a oferta devido a transações relacionadas.",
          });
      }

      // Deleta a oferta se não houver transações relacionadas
      const ofertaDeletada = await prisma.oferta.delete({
        where: { idOferta: ofertaId },
      });

      res.status(200).json({ message: "Oferta deletada!", ofertaDeletada });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar oferta." });
    }
  }
);
// Rota para buscar uma oferta pelo ID
offerRouter.get('/buscar-oferta/:ofertaId', async (req: Request, res: Response) => {
  try {
    const ofertaId = parseInt(req.params.ofertaId, 10);

    const oferta = await prisma.oferta.findUnique({
      where: { idOferta: ofertaId },
      include: {
        categoria: true,
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        subconta: {
          select: {
            idSubContas: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        transacoes: true,
      },
    });

    if (!oferta) {
      return res.status(404).json({ error: 'Oferta não encontrada.' });
    }
    res.status(200).json(oferta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar oferta.' });
  }
});
// Rota para exibir todas as transações de uma oferta pelo ID
offerRouter.get('/listar-transacoes/:ofertaId', async (req: Request, res: Response) => {
  try {
    const ofertaId = parseInt(req.params.ofertaId, 10);

    const oferta = await prisma.oferta.findUnique({
      where: { idOferta: ofertaId },
      include: {
        transacoes: true,
      },
    });

    if (!oferta) {
      return res.status(404).json({ error: 'Oferta não encontrada.' });
    }

    res.status(200).json(oferta.transacoes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar transações da oferta.' });
  }
});


export default offerRouter;
