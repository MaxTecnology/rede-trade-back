// transaction.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import * as QRCode from "qrcode";
import fs from "fs";
import path from "path";

import { encaminharEstorno, encaminharSolicitacaoEstornoMatriz, estornarTransacao, insertTransaction, visualizarTransacoesEstorno, visualizarTransacoesEstornoMatriz } from "../controllers/transactions.controller";
import { enviarEmail } from "../utils/utils";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";

const prisma = new PrismaClient();
const transactionRouter = Router();

// Rota para cadastrar uma nova transação
transactionRouter.post("/inserir-transacao",   verifyToken,
  checkBlocked,insertTransaction);
transactionRouter.post("/encaminhar-estorno/:idTransacao",  verifyToken,
  checkBlocked, encaminharEstorno);
transactionRouter.post("/listar-encaminhadas-estorno/:idTransacao",  verifyToken,
  checkBlocked,visualizarTransacoesEstorno);
transactionRouter.post("/encaminhar-estorno-matriz/:idTransacao",  verifyToken,
  checkBlocked,encaminharSolicitacaoEstornoMatriz);
transactionRouter.post("/visualizar-estornos-encaminhados-matriz/:idMatriz",  verifyToken,
  checkBlocked, visualizarTransacoesEstornoMatriz);
transactionRouter.post("/estornar-transacao/:idTransacao",  verifyToken,
  checkBlocked, estornarTransacao);

// Rota para listar todas as transações com suporte à paginação
transactionRouter.get(
  "/listar-transacoes",
  async (req: Request, res: Response) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const transacoes = await prisma.transacao.findMany({
        take: Number(pageSize),
        skip: (Number(page) - 1) * Number(pageSize),
        include: {
          comprador: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          vendedor: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          subContaComprador: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          subContaVendedor: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          parcelamento: true,
          cobrancas: true,
        },
      });

      const totalItems = await prisma.transacao.count();

      return res.status(200).json({
        transacoes,
        meta: {
          totalItems,
          page: Number(page),
          pageSize: Number(pageSize),
          totalPages: Math.ceil(totalItems / Number(pageSize)),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao listar transações." });
    }
  }
);
// Rota para obter uma transação pelo ID
transactionRouter.get(
  "/buscar-transacao/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const transacao = await prisma.transacao.findUnique({
        where: { idTransacao: parseInt(id, 10) },
        include: {
          comprador: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          vendedor: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          subContaComprador: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          subContaVendedor: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          parcelamento: true,
          cobrancas: true,
          voucher: true,
        },
      });

      if (!transacao) {
        return res.status(404).json({ error: "Transação não encontrada." });
      }

      res.status(200).json(transacao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao obter transação." });
    }
  }
);
// Rota para atualizar uma transação
transactionRouter.put(
  "/atualizar-transacao/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        nomeComprador,
        nomeVendedor,
        compradorId,
        vendedorId,
        valorRt,
        valorAdicional,
        saldoAnteriorComprador,
        saldoAnteriorVendedor,
        saldoAposComprador,
        saldoAposVendedor,
        numeroParcelas,
        descricao,
        notaAtendimento,
        status,
        emiteVoucher,
        ofertaId,
        subContaCompradorId,
        subContaVendedorId,
        comissao,
        comissaoParcelada,
      } = req.body;

      const transacaoAtualizada = await prisma.transacao.update({
        where: { idTransacao: parseInt(id, 10) },
        data: {
          nomeComprador,
          nomeVendedor,
          compradorId,
          vendedorId,
          valorRt,
          valorAdicional,
          saldoAnteriorComprador,
          saldoAnteriorVendedor,
          saldoAposComprador,
          saldoAposVendedor,
          numeroParcelas,
          descricao,
          notaAtendimento,
          status,
          emiteVoucher,
          ofertaId,
          subContaCompradorId,
          subContaVendedorId,
          comissao,
          comissaoParcelada,
        },
        include: {
          comprador: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          vendedor: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
            },
          },
          subContaComprador: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          subContaVendedor: {
            select: {
              idSubContas: true,
              nome: true,
              email: true,
            },
          },
          parcelamento: true,
          cobrancas: true,
        },
      });

      res.status(200).json(transacaoAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar transação." });
    }
  }
);
// Rota para deletar uma transação
transactionRouter.delete(
  "/deletar-transacao/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verifique se há parcelamentos vinculados à transação
      const parcelamentos = await prisma.parcelamento.findMany({
        where: { transacaoId: parseInt(id, 10) },
      });

      if (parcelamentos.length > 0) {
        return res.status(400).json({
          error:
            "Não é possível excluir uma transação com parcelamentos vinculados.",
        });
      }

      // Exclua a transação
      await prisma.transacao.delete({
        where: { idTransacao: parseInt(id, 10) },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao excluir transação." });
    }
  }
);

// Rota para excluir um voucher pelo ID do voucher
transactionRouter.delete(
  "/excluir-voucher/:idVoucher",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      // Extraia o ID do voucher dos parâmetros da solicitação
      const idVoucher = parseInt(req.params.idVoucher, 10);

      // Verifica se o voucher existe
      const voucher = await prisma.voucher.findUnique({
        where: { idVoucher },
      });

      if (!voucher) {
        return res.status(404).json({ error: "Voucher não encontrado" });
      }

      // Exclua o voucher
      await prisma.voucher.delete({
        where: { idVoucher },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao excluir o voucher." });
    }
  }
);

transactionRouter.post(
  "/criar-voucher/:idTransacao",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const idTransacao = parseInt(req.params.idTransacao, 10);

      // Verifica se a transação existe
      const transacao = await prisma.transacao.findUnique({
        where: { idTransacao },
      });

      if (!transacao) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      // Cria o Voucher associado à transação
      const novoVoucher = await prisma.voucher.create({
        data: {
          transacaoId: idTransacao,
        },
        include: {
          transacao: true,
        },
      });

      // Gere o QR Code a partir do conteúdo do voucher
      const conteudoQRCode = JSON.stringify(novoVoucher);

      // Verifique se o diretório qrcodes existe. Se não existir, crie-o.
      const qrcodesDir = path.join(__dirname, "qrcodes");
      if (!fs.existsSync(qrcodesDir)) {
        fs.mkdirSync(qrcodesDir);
      }

      // Especifique o caminho do arquivo QR Code
      const qrCodeImagePath = path.join(
        qrcodesDir,
        `qrcode_${novoVoucher.codigo}.png`
      );

      // Gere o QR Code e salve a imagem
      await QRCode.toFile(qrCodeImagePath, conteudoQRCode);
      const { codigo, createdAt, status } = novoVoucher;

      // Antes de retornar, envie o email com o QR Code anexado
      const assuntoEmail = "Seu Voucher RedeTrade!";
      const corpoEmail =
        `Olá ${transacao.nomeComprador},\n\n` +
        `Obrigado por sua transação na plataforma RedeTrade. Abaixo estão os detalhes da transação e Voucher:\n` +
        `Código do Voucher: ${codigo}\n` +
        `Data de Criação: ${new Date(createdAt).toLocaleString()}\n` + // Formata a data
        `Status: ${status}\n\n` +
        `Código da transação: ${transacao.codigo}\n` +
        `Valor da transação: R$ ${transacao.valorRt.toFixed(2)}\n` +
        `Número de Parcelas: ${transacao.numeroParcelas}\n` +
        `Descrição: ${transacao.descricao}\n` +
        `Nome do Vendedor: ${transacao.nomeVendedor}\n` +
        `Nota de Atendimento: ${transacao.notaAtendimento}\n` +
        `Observações: ${transacao.observacaoNota}\n` +
        `Status: ${transacao.status}\n` +
        `Agradecemos por usar a RedeTrade!\n\n` +
        `Aqui está o QR Code do seu Voucher:\n`;

      // Obtenha o e-mail do comprador usando o compradorId
      const comprador = await prisma.usuarios.findUnique({
        where: { idUsuario: transacao.compradorId! },
      });
      // Verifique se o comprador foi encontrado antes de prosseguir
      if (!comprador) {
        console.error("Comprador não encontrado.");
        return res.status(404).json({ error: "Comprador não encontrado." });
      }
      // Envie o e-mail com o anexo do QR Code
      await enviarEmail(comprador.email, assuntoEmail, corpoEmail, [
        {
          filename: `qrcode_${novoVoucher.codigo}.png`,
          content: fs.readFileSync(qrCodeImagePath),
        },
      ]);
      res.status(201).json({ voucher: novoVoucher, qrCode: qrCodeImagePath });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar o voucher." });
    }
  }
);

export default transactionRouter;
