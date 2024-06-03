import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";

const prisma = new PrismaClient();
const voucherRouters = Router();

voucherRouters.get("/vouchers-do-usuario/:idUsuario", async (req: Request, res: Response) => {
    try {
      const idUsuario = parseInt(req.params.idUsuario, 10);

      // Busca todas as transações do usuário que possuem vouchers associados
      const transacoesDoUsuario = await prisma.transacao.findMany({
        where: {
          OR: [{ compradorId: idUsuario }, { vendedorId: idUsuario }],
          voucher: {
            some: {},
          },
        },

        include: {
          voucher: true,
          comprador: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
          vendedor: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
        },
      });
      // Use a função select para escolher os campos desejados
      const transacoesDoUsuarioComSelect = transacoesDoUsuario.map(
        (transacao) => ({
          idTransacao: transacao.idTransacao,
          codigo: transacao.codigo,
          createdAt: transacao.createdAt,
          valorRt: transacao.valorRt,
          compradorId : transacao.compradorId,
          vendedorId: transacao.vendedorId,
          voucher: transacao.voucher,
          comprador: transacao.comprador,
          vendedor: transacao.vendedor,
          descricao: transacao.descricao,
          status: transacao.status
        })
      );
      // Separa as transações em que o usuário foi comprador e vendedor
      const transacoesComprador = transacoesDoUsuarioComSelect.filter(
        (transacao) => transacao.compradorId === idUsuario
      );
      const transacoesVendedor = transacoesDoUsuarioComSelect.filter(
        (transacao) => transacao.vendedorId === idUsuario
      );

     res.status(200).json({
       transacoesComprador: transacoesComprador.map((transacao) => ({
         transacao,
       })),
       transacoesVendedor: transacoesVendedor.map((transacao) => ({
         transacao,
       })),
     });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar os vouchers do usuário." });
    }
  }
);
voucherRouters.get(
  "/transacoes-com-voucher",
  async (req: Request, res: Response) => {
    try {
      // Busca todas as transações que possuem vouchers associados
      const transacoesComVoucher = await prisma.transacao.findMany({
        where: {
          voucher: {
            some: {},
          },
        },
        include: {
          voucher: true,
          comprador: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
          vendedor: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
        },
      });

      // Use a função select para escolher os campos desejados
      const transacoesComVoucherComSelect = transacoesComVoucher.map(
        (transacao) => ({
          idTransacao: transacao.idTransacao,
          status: transacao.status,
          codigo: transacao.codigo,
          createdAt: transacao.createdAt,
          valorRt: transacao.valorRt,
          descricao: transacao.descricao,
          voucher: transacao.voucher,
          comprador: transacao.comprador,
          vendedor: transacao.vendedor,
        })
      );

      res
        .status(200)
        .json({ transacoesComVoucher: transacoesComVoucherComSelect });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao buscar as transações com voucher." });
    }
  }
);
voucherRouters.get(
  "/transacoes-com-voucher-por-unidade/:idFranquia",
  async (req: Request, res: Response) => {
    try {
      const idFranquia = parseInt(req.params.idFranquia, 10);

      // Busca todos os usuários associados à franquia
      const usuariosAssociados = await prisma.usuarios.findMany({
        where: {
          usuarioCriadorId: idFranquia,
          conta: {
            tipoDaConta: {
              tipoDaConta: "Associado",
            },
          },
        },
      });

      // Obtém os IDs dos usuários associados
      const idsUsuariosAssociados = usuariosAssociados.map(
        (usuario) => usuario.idUsuario
      );

      // Busca todas as transações que possuem vouchers associados e foram criadas pelos usuários associados
      const transacoesPorUnidade = await prisma.transacao.findMany({
        where: {
          OR: [
            { compradorId: { in: idsUsuariosAssociados } },
            { vendedorId: { in: idsUsuariosAssociados } },
          ],
          voucher: {
            some: {},
          },
        },
        include: {
          voucher: true,

          comprador: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
          vendedor: {
            select: {
              nome: true,
              idUsuario: true,
              email: true,
              telefone: true,
              nomeFantasia: true,
              conta: {
                select: {
                  idConta: true,
                  nomeFranquia: true,
                  numeroConta: true,
                },
              },
            },
          },
        },
      });

      // Use a função select para escolher os campos desejados
      const transacoesCompradorComSelect = transacoesPorUnidade
        .filter((transacao) =>
          idsUsuariosAssociados.includes(transacao.compradorId || idFranquia)
        )
        .map((transacao) => ({
          idTransacao: transacao.idTransacao,
          status: transacao.status,
          codigo: transacao.codigo,
          createdAt: transacao.createdAt,
          valorRt: transacao.valorRt,
          descricao: transacao.descricao,
          voucher: transacao.voucher,
          comprador: transacao.comprador,
          vendedor: transacao.vendedor,
        }));

      const transacoesVendedorComSelect = transacoesPorUnidade
        .filter((transacao) =>
          idsUsuariosAssociados.includes(transacao.vendedorId || idFranquia)
        )
        .map((transacao) => ({
          idTransacao: transacao.idTransacao,
          codigo: transacao.codigo,
          createdAt: transacao.createdAt,
          valorRt: transacao.valorRt,
         descricao: transacao.descricao,
          voucher: transacao.voucher,
          comprador: transacao.comprador,
          vendedor: transacao.vendedor,
        }));

      res.status(200).json({
        transacoesComprador: transacoesCompradorComSelect,
        transacoesVendedor: transacoesVendedorComSelect,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({
          error: "Erro ao buscar as transações com voucher por unidade.",
        });
    }
  }
);
export default voucherRouters;
