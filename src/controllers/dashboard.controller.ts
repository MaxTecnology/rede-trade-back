// dashboard.controller.ts

import { Request, Response } from "express";
import { PrismaClient, Transacao } from "@prisma/client";

const prisma = new PrismaClient();

export const getTotalValorRT = async (req: Request, res: Response) => {
  try {
    const { includeTransacoes } = req.query;

    let totalValorRT = 0;
    let transacoes: Transacao[] | undefined;

    // Se includeTransacoes for verdadeiro, obtenha também as transações
    if (includeTransacoes === "true") {
      transacoes = await prisma.transacao.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1
            ),
          },
        },
        include: {
          cobrancas: true,
        },
      });
      totalValorRT = transacoes.reduce(
        (total, transacao) => total + transacao.valorRt,
        0
      );
    } else {
      // Obtenha apenas a soma do valor RT de todas as transações
      const resultado = await prisma.transacao.aggregate({
        _sum: {
          valorRt: true,
        },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1
            ),
          },
        },
      });

      totalValorRT = resultado._sum?.valorRt || 0;
    }

    res.status(200).json({ totalValorRT, transacoes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};
export const getValorTotalPorUnidade = async (req: Request, res: Response) => {
  try {
    const { usuarioCriadorId } = req.params;
    const includeTransacoes = req.query.includeTransacoes === "true";

    // Verifique se o ID do usuário criador foi fornecido
    if (!usuarioCriadorId) {
      return res
        .status(400)
        .json({ error: "ID do usuário criador não fornecido" });
    }

    // Obtenha todos os usuários associados a um usuário criador específico
    const usuariosDaUnidade = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(usuarioCriadorId, 10),
      },
    });

    // Obtenha os IDs dos usuários da unidade
    const idsUsuariosDaUnidade = usuariosDaUnidade.map(
      (usuario) => usuario.idUsuario
    );

    // Obtenha todas as transações associadas aos usuários da unidade e ao próprio usuário criador
    const transacoes = await prisma.transacao.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
        OR: [
          {
            compradorId: { in: idsUsuariosDaUnidade },
          },
          {
            vendedorId: { in: idsUsuariosDaUnidade },
          },
          {
            compradorId: parseInt(usuarioCriadorId, 10), // Inclua também as transações do próprio usuário criador
          },
          {
            vendedorId: parseInt(usuarioCriadorId, 10), // Inclua também as transações do próprio usuário criador
          },
        ],
      },
    });

    // Calcule o valor total das transações
    const valorTotalTransacoes = transacoes.reduce(
      (total, transacao) => total + transacao.valorRt,
      0
    );

    res.status(200).json({
      valorTotalTransacoes,
      transacoes: includeTransacoes ? transacoes : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};
export const fundoPermutaGeralMatriz = async (req: Request, res: Response) => {
  try {
    const matrizId = parseInt(req.params.matrizId, 10);

    // Busque todos os registros no FundoPermuta que têm o campo matrizId igual ao id recebido
    const fundoPermuta = await prisma.fundoPermuta.findMany({
      where: { usuario: { matrizId } },
      include: { usuario: true },
    });
    // Calcular a soma dos campos 'valor'
    const total = fundoPermuta.reduce(
      (acc, fundo) => acc + (fundo.valor || 0),
      0
    );

    res.status(200).json({ valorFundoPermutaTotal: total, fundoPermuta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const getValorTotalCreditosAprovados = async (
  req: Request,
  res: Response
) => {
  try {
    const valorTotalCreditosAprovados =
      await prisma.solicitacaoCredito.aggregate({
        _sum: {
          valorSolicitado: true,
        },
        where: {
          status: "Aprovado",
        },
      });

    res.status(200).json({
      valorTotalCreditosAprovados:
        valorTotalCreditosAprovados._sum.valorSolicitado || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};
export const fundoPermutaUnidade = async (req: Request, res: Response) => {
  try {
    const idFranquia = parseInt(req.params.idFranquia, 10);

    // Verificar se o usuário identificado por idFranquia é realmente uma franquia
    const franquia = await prisma.usuarios.findFirst({
      where: { idUsuario: idFranquia },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });

    if (!franquia || !franquia.conta || !franquia.conta.tipoDaConta) {
      return res.status(404).json({ error: "Franquia não encontrada." });
    }



    // Buscar todos os associados da franquia com o tipo de conta "Associado"
    const associadosFranquia = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: idFranquia,
        conta: {
          tipoDaConta: {
            tipoDaConta: "Associado",
          },
        },
      },
    });

    // Buscar os fundos de permuta dos associados
    const fundoPermutaFranquia = await prisma.fundoPermuta.findMany({
      where: {
        usuarioId: {
          in: associadosFranquia.map((associado) => associado.idUsuario),
        },
      },
      include: {
        usuario: {
          select: {
            usuarioCriadorId: true,
            idUsuario: true,
            nome: true,
            matrizId: true,
          },
        },
      },
    });

    // Calcular a soma dos campos 'valor'
    const total = fundoPermutaFranquia.reduce(
      (acc, fundo) => acc + (fundo.valor || 0),
      0
    );

    res
      .status(200)
      .json({ valorFundoPermutaUnidade: total, fundoPermutaFranquia });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const calcularReceitaMatriz = async (req: Request, res: Response) => {
  try {
    const { matrizId } = req.params;

    // Verifique se o ID da matriz foi fornecido
    if (!matrizId) {
      return res.status(400).json({ error: "ID da matriz não fornecido" });
    }

    // Encontre todas as agências (usuários) que têm a matriz como criador
    const agencias = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(matrizId, 10),
      },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });

    // Inicialize os valores totais
    let valorTotalReceberMatriz = 0;
    const detalhesReceitaMatriz: any[] = [];
    let valorTotalCobrancas = 0;
    const detalhamentoDasCobrancas: any[] = [];
    // Itere sobre cada agência e calcule o valor a ser repassado à matriz
    for (const agencia of agencias) {
      const cobrancasAgenciasEAssociadosDaMatriz =
        await prisma.cobranca.findMany({
          where: {
            usuarioId: agencia.idUsuario,
          },
        });
      // Iterar sobre todas as cobranças
      for (const cobranca of cobrancasAgenciasEAssociadosDaMatriz) {
        // Somar o valor da fatura
        valorTotalCobrancas += cobranca.valorFatura;

        // Adicionar detalhes da cobrança ao array
        detalhamentoDasCobrancas.push({
          idCobranca: cobranca.idCobranca,
          valorFatura: cobranca.valorFatura,
          referencia: cobranca.referencia,
          createdAt: cobranca.createdAt,
          status: cobranca.status,
          transacaoId: cobranca.transacaoId,
          usuarioId: cobranca.usuarioId,
          contaId: cobranca.contaId,
          vencimentoFatura: cobranca.vencimentoFatura,
          subContaId: cobranca.subContaId,
          gerenteContaId: cobranca.gerenteContaId,
        });
      }

      // Verifique se é uma agência válida (Franquia ou Franquia Master)
      if (
        agencia.conta?.tipoDaConta?.tipoDaConta !== "Franquia" &&
        agencia.conta?.tipoDaConta?.tipoDaConta !== "Franquia Master"
      ) {
        continue; // Pule para a próxima iteração se não for uma agência válida
      }

      // Verifique se a agência tem o campo matrizId
      if (agencia.matrizId !== parseInt(matrizId, 10)) {
        continue; // Pule para a próxima iteração se não corresponder ao id da matriz
      }

      // Encontre todos os associados da agência
      const usuariosAssociadosDasAgencias = await prisma.usuarios.findMany({
        where: {
          usuarioCriadorId: agencia.idUsuario,
          conta: {
            tipoDaConta: {
              tipoDaConta: "Associado",
            },
          },
        },
      });

      for (const associado of usuariosAssociadosDasAgencias) {
        // Encontre todas as cobranças associadas ao associado dentro do mês
        const cobrancasAssociado = await prisma.cobranca.findMany({
          where: {
            usuarioId: associado.idUsuario,
          },
        });

        // Calcule o total das cobranças do associado
        const totalCobrancasAssociado = cobrancasAssociado.reduce(
          (total, cobranca) => {
            const valorRepassarMatriz =
              (cobranca.valorFatura * (agencia.conta?.taxaRepasseMatriz || 0)) /
              100;
            // Detalhes do repasse para o associado
            detalhesReceitaMatriz.push({
              agencia: {
                id: agencia.idUsuario,
                nome: agencia.nome,
              },
              associado: {
                id: associado.idUsuario,
                nome: associado.nome,
              },
              valorRepassarMatriz,
              cobranca: {
                id: cobranca.idCobranca,
                valorFatura: cobranca.valorFatura,
                referencia: cobranca.referencia,
                createdAt: cobranca.createdAt,
                status: cobranca.status,
                transacaoId: cobranca.transacaoId,
                usuarioId: cobranca.usuarioId,
                contaId: cobranca.contaId,
                vencimentoFatura: cobranca.vencimentoFatura,
                subContaId: cobranca.subContaId,
                gerenteContaId: cobranca.gerenteContaId,
              },
            });

            // Adicione ao valor total a receber pela matriz
            valorTotalReceberMatriz += valorRepassarMatriz;

            return total + cobranca.valorFatura;
          },
          0
        );
      }
    }

    const aReceberRepasses = {
      valorTotalReceberMatriz,
      detalhesReceitaMatriz,
    };
    // Criar o objeto desejado
    const aReceberCobrancas = {
      valorTotalCobrancas,
      detalhamentoDasCobrancas,
    };
    res.status(200).json({
      aReceberRepasses,
      aReceberCobrancas,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const valorTotalReceberAssociados = async (
  req: Request,
  res: Response
) => {
  try {
    const { agenciaId } = req.params;
    // Verifique se o ID da agência foi fornecido
    if (!agenciaId) {
      return res.status(400).json({ error: "ID da agência não fornecido" });
    }
    // Encontre todos os usuários associados à agência com tipo de conta "Associado"
    const associados = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(agenciaId, 10),

        conta: {
          tipoDaConta: {
            tipoDaConta: "Associado",
          },
        },
      },
    });
    // Obtenha os IDs dos usuários associados
    const idsAssociados = associados.map((usuario) => usuario.idUsuario);
    // Encontre todas as cobranças dos associados dentro do mês corrente
    // Encontre todas as cobranças dos associados dentro do mês corrente
    const cobrancasAssociados = await prisma.cobranca.findMany({
      where: {
        usuarioId: { in: idsAssociados },
        status: {
          not: "Quitado",
        },
      },
      include: {
        transacao: true,
      },
    });
    // Calcule o valor total a receber pela agência somando o valorFatura das cobranças
    const valorTotalReceber = cobrancasAssociados.reduce(
      (total, cobranca) => total + cobranca.valorFatura,
      0
    );
    res.status(200).json({
      valorTotalReceber,
      cobrancasAssociados,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const calcularPagamentoGerente = async (req: Request, res: Response) => {
  try {
    const { idGerente } = req.params;

    if (!idGerente) {
      return res.status(400).json({ error: "ID do gerente não fornecido" });
    }

    const cobrancas = await prisma.cobranca.findMany({
      where: {
        gerenteContaId: parseInt(idGerente, 10),
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
      include: {
        gerente: {
          select: {
            taxaComissaoGerente: true,
          },
        },
      },
    });
    const valorTotalPagamento = cobrancas.reduce((total, cobranca) => {
      const valorComissao =
        (cobranca.valorFatura * (cobranca.gerente?.taxaComissaoGerente || 0)) /
        100;
      return total + valorComissao;
    }, 0);

    res.status(200).json({ valorTotalPagamento });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const calcularPagamentoTodosGerentes = async (
  req: Request,
  res: Response
) => {
  try {
    const { idAgencia } = req.params;

    if (!idAgencia) {
      return res.status(400).json({ error: "ID da agência não fornecido" });
    }

    // Busca todos os gerentes associados à agência
    const gerentes = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(idAgencia, 10),
        contasGerenciadas: {
          some: {}, // Verifica se o gerente tem pelo menos uma conta
        },
      },
      include: {
        cobrancasGerenciadas: {
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1
              ),
            },
          },
        },
      },
    });

    // Calcula o valor total que a agência deve pagar a todos os gerentes
    const valorTotalPagamento = gerentes.reduce((total, gerente) => {
      // Calcula o valor total considerando a taxa de comissão do gerente
      const valorComissao = gerente.cobrancasGerenciadas.reduce(
        (subtotal, cobranca) => {
          return (
            subtotal +
            (cobranca.valorFatura * (gerente.taxaComissaoGerente || 0)) / 100
          );
        },
        0
      );

      return total + valorComissao;
    }, 0);

    res.status(200).json({ valorTotalPagamento });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};
