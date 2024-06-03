import { PrismaClient } from "@prisma/client";
import { Router, Request, Response } from "express";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";

const creditRouter = Router();

const prisma = new PrismaClient();
// Rota para o usuário solicitar crédito
creditRouter.post(
  "/solicitar",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { usuarioId, valorSolicitado, descricaoSolicitante, matrizId } =
        req.body;

      // Valide os dados da solicitação (adapte conforme necessário)
      if (!usuarioId || !valorSolicitado) {
        return res
          .status(400)
          .json({ error: "Dados de solicitação inválidos" });
      }

      // Verifique se o usuário existe
      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioId },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Crie a solicitação de crédito no banco de dados
      const solicitacaoCredito = await prisma.solicitacaoCredito.create({
        data: {
          valorSolicitado,
          matrizId: matrizId || null, // Defina matrizId como null se não fornecido
          status: "Pendente",
          descricaoSolicitante,
          usuarioSolicitanteId: usuarioId,
          usuarioCriadorId: usuario.usuarioCriadorId || 0, // Adiciona o id do usuário criador
        },
        include: {
          usuarioCriador: {
            select: {
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
            },
          },
          matriz: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
            },
          },
          usuarioSolicitante: {
            select: {
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
            },
          },
        },
      });

      res.status(200).json({
        message: "Solicitação de crédito enviada com sucesso",
        solicitacaoCredito,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

// Rota para editar uma solicitação de crédito
creditRouter.put(
  "/editar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { valorSolicitado, descricaoSolicitante } = req.body;

      // Valide os dados da edição (adapte conforme necessário)
      if (!valorSolicitado) {
        return res.status(400).json({ error: "Dados de edição inválidos" });
      }

      // Verifique se a solicitação de crédito existe
      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      // Atualize os dados da solicitação de crédito no banco de dados
      const solicitacaoAtualizada = await prisma.solicitacaoCredito.update({
        where: { idSolicitacaoCredito: solicitacaoId },
        data: {
          valorSolicitado,
          descricaoSolicitante,
        },
      });

      res.status(200).json({
        message: "Solicitação de crédito atualizada com sucesso",
        solicitacaoAtualizada,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);
// Rota para listar os créditos solicitados por um usuário
creditRouter.get("/listar/:usuarioId", async (req: Request, res: Response) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId, 10);

    // Verifique se o usuário existe
    const usuario = await prisma.usuarios.findUnique({
      where: { idUsuario: usuarioId },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Consulte as solicitações de crédito para o usuário
    const solicitacoesCredito = await prisma.solicitacaoCredito.findMany({
      where: { usuarioSolicitanteId: usuarioId },
      include: {
        usuarioCriador: {
          select: {
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
          },
        },
        matriz: {
          select: {
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
          },
        },
        usuarioSolicitante: {
          select: {
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
          },
        },
      },
    });

    res.status(200).json({ solicitacoesCredito });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota para listar todos os créditos solicitados
creditRouter.get("/listar-todos", async (req: Request, res: Response) => {
  try {
    // Consulte todas as solicitações de crédito no banco de dados
    const todasSolicitacoes = await prisma.solicitacaoCredito.findMany({
      include: {
        usuarioCriador: {
          select: {
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
          },
        },
        matriz: {
          select: {
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
          },
        },
        usuarioSolicitante: {
          select: {
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
          },
        },
      },
    });

    res.status(200).json({ todasSolicitacoes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota para o usuário criador listar os créditos solicitados por seus usuários filhos
creditRouter.get(
  "/listar-filhos/:usuarioCriadorId",
  async (req: Request, res: Response) => {
    try {
      const usuarioCriadorId = parseInt(req.params.usuarioCriadorId, 10);

      // Verifique se o usuário criador existe
      const usuarioCriador = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioCriadorId },
      });

      if (!usuarioCriador) {
        return res
          .status(404)
          .json({ error: "Usuário criador não encontrado" });
      }

      // Consulte os usuários filhos do usuário criador
      const usuariosFilhos = await prisma.usuarios.findMany({
        where: { usuarioCriadorId: usuarioCriadorId },
      });

      // Coleta os IDs dos usuários filhos
      const idsUsuariosFilhos = usuariosFilhos.map(
        (usuario) => usuario.idUsuario
      );

      // Consulte as solicitações de crédito para os usuários filhos
      const solicitacoesDosFilhos = await prisma.solicitacaoCredito.findMany({
        where: { usuarioSolicitanteId: { in: idsUsuariosFilhos } },
        include: {
          usuarioCriador: {
            select: {
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
            },
          },
          matriz: {
            select: {
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
            },
          },
          usuarioSolicitante: {
            select: {
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
            },
          },
        },
      });

      res.status(200).json({ solicitacoesDosFilhos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);


// Rota para o usuário criador encaminhar a aprovação para a matriz ou negar o crédito
creditRouter.put(
  "/encaminhar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { status, comentarioAgencia, matrizId } = req.body;

      // Verifique se a solicitação de crédito existe
      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        include: { usuarioCriador: true }, // Inclua informações sobre o usuário criador
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      // Verifique se o status fornecido é válido
      if (status !== "Encaminhado para a matriz" && status !== "Negado") {
        return res.status(400).json({ error: "Status inválido" });
      }
      // Utiliza o usuarioCriadorId diretamente como matrizId
      const providedMatrizId =
        matrizId || solicitacaoCredito.usuarioCriador?.usuarioCriadorId;

      if (!providedMatrizId) {
        return res
          .status(400)
          .json({ error: "matrizId não fornecido ou não disponível" });
      }
      // Atualize o status da solicitação de crédito
      const solicitacaoAtualizada = await prisma.solicitacaoCredito.update({
        where: { idSolicitacaoCredito: solicitacaoId },
        data: {
          status,
          matrizId: providedMatrizId,
          comentarioAgencia:
            status === "Encaminhado para a matriz" ? comentarioAgencia : null,
        },
        include: {
          usuarioCriador: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
            },
          },
          matriz: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
            },
          },
          usuarioSolicitante: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
            },
          },
        },
      });

      res.status(200).json({
        message: `Solicitação ${solicitacaoId} ${status.toLowerCase()} com sucesso`,
        solicitacaoAtualizada,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);

// Rota para a matriz ver todos os créditos enviados para análise
creditRouter.get("/matriz/analisar", async (req: Request, res: Response) => {
  try {
    // Consulta todas as solicitações de crédito com status "Encaminhado para a matriz"
    const solicitacoesEmAnalise = await prisma.solicitacaoCredito.findMany({
      where: {
        status: "Encaminhado para a matriz" || "Pendente",
      },
      include: {
        usuarioCriador: {
          select: {
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
          },
        },
        matriz: {
          select: {
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
          },
        },
        usuarioSolicitante: {
          select: {
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
          },
        },
      },
    });
    res.status(200).json({
      message: "Lista de créditos enviados para análise da matriz",
      solicitacoesEmAnalise,
      // solicitacoesRelacionadasAoMatriz,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota para a matriz aprovar ou negar um crédito
creditRouter.put(
  "/finalizar-analise/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);
      const { status, comentarioMatriz } = req.body;

      // Verifique se a solicitação de crédito existe
      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
        include: {
          usuarioSolicitante: { include: { conta: true } },
          matriz: true,
        },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }
      // Obtenha o limiteCredito antes da aprovação
      const limiteCreditoAntes =
        solicitacaoCredito.usuarioSolicitante?.conta?.limiteCredito || 0;

      // Verifique se o status fornecido é válido
      if (status !== "Aprovado" && status !== "Negado") {
        return res.status(400).json({ error: "Status inválido" });
      }

      // Atualize o status da solicitação de crédito
      const solicitacaoAtualizada = await prisma.solicitacaoCredito.update({
        where: { idSolicitacaoCredito: solicitacaoId },
        data: {
          status,
          matrizAprovacao: status === "Aprovado",
          comentarioMatriz: status === "Aprovado" ? comentarioMatriz : null,
        },
        include: {
          usuarioCriador: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
              conta: {
                select: {
                  limiteCredito: true,
                },
              },
            },
          },
          matriz: true,
          usuarioSolicitante: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
              cpf: true,
              cidade: true,
              bairro: true,
              numero: true,
              complemento: true,
            },
          },
        },
      });

      // Se o status for "Aprovado", aumente o limiteCredito da conta associada ao usuário solicitante
      if (status === "Aprovado") {
        const novoLimiteCredito =
          limiteCreditoAntes + solicitacaoCredito.valorSolicitado;

        // Atualize o limiteCredito na base de dados
        if (solicitacaoCredito.usuarioSolicitante?.conta) {
          await prisma.conta.update({
            where: {
              idConta: solicitacaoCredito.usuarioSolicitante.conta.idConta,
            },
            data: {
              limiteCredito: novoLimiteCredito,
            },
          });
          // Registre o valor no FundoPermuta
          const fundoPermutaData = {
            valor: solicitacaoCredito.valorSolicitado,
            usuarioId: solicitacaoCredito.usuarioSolicitante.idUsuario,
          };

          await prisma.fundoPermuta.create({
            data: fundoPermutaData,
          });
        } else {
          console.error("Conta não encontrada para a solicitação de crédito.");
          // Trate conforme necessário (lançar exceção, retornar erro, etc.)
        }

        // Obtenha o limiteCredito depois da aprovação
        const limiteCreditoDepois = novoLimiteCredito;

        res.status(200).json({
          message: `Solicitação ${solicitacaoId} analisada pela matriz`,
          limiteCreditoAntes,
          limiteCreditoDepois,
          solicitacaoAtualizada,
        });
      } else {
        // Se o status não for "Aprovado", não há alteração no limiteCredito
        res.status(200).json({
          message: `Solicitação ${solicitacaoId} analisada pela matriz`,
          limiteCreditoAntes,
          solicitacaoAtualizada,
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);



// Rota para apagar uma solicitação de crédito
creditRouter.delete(
  "/apagar/:solicitacaoId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const solicitacaoId = parseInt(req.params.solicitacaoId, 10);

      // Verifique se a solicitação de crédito existe
      const solicitacaoCredito = await prisma.solicitacaoCredito.findUnique({
        where: { idSolicitacaoCredito: solicitacaoId },
      });

      if (!solicitacaoCredito) {
        return res
          .status(404)
          .json({ error: "Solicitação de crédito não encontrada" });
      }

      // Apague a solicitação de crédito do banco de dados
      await prisma.solicitacaoCredito.delete({
        where: { idSolicitacaoCredito: solicitacaoId },
      });

      res.status(200).json({
        message: "Solicitação de crédito apagada com sucesso",
        solicitacaoCredito,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  }
);
export default creditRouter;
