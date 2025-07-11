// routes/account.routes.ts
import { PrismaClient } from "@prisma/client";
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  calcularDataVencimento,
  enviarEmail,
  gerarToken,
} from "../utils/utils";
import { criarConta } from "../controllers/account.controller";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";

const accountRouter = Router();
const prisma = new PrismaClient();

// C -  Rota para criar  tipos de conta
accountRouter.post(
  "/criar-tipo-de-conta" /* verifyToken, checkBlocked,*/,
  async (req: Request, res: Response) => {
    try {
      const { tipoDaConta, prefixoConta, descricao, permissoes } = req.body;

      const novoTipoConta = await prisma.tipoConta.create({
        data: {
          tipoDaConta,
          prefixoConta,
          descricao,
          permissoes,
        },
      });
      return res.status(201).json(novoTipoConta);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// R - Rota para listar todos os tipos de conta
accountRouter.get(
  "/listar-tipos-de-conta",
  async (_req: Request, res: Response) => {
    try {
      const tiposDeConta = await prisma.tipoConta.findMany({
        orderBy: {
          idTipoConta: "asc",
        },
      });
      res.status(200).json(tiposDeConta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// U -  Rota para atualizar um tipo de conta pelo ID
accountRouter.put(
  "/atualizar-tipo-de-conta/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const tipoContaId = parseInt(req.params.id, 10);
      const { tipoDaConta, prefixoConta, descricao, permissoes } = req.body;

      const tipoContaAtualizado = await prisma.tipoConta.update({
        where: { idTipoConta: tipoContaId },
        data: {
          tipoDaConta,
          prefixoConta,
          descricao,
          permissoes,
        },
      });

      res.status(200).json(tipoContaAtualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// D-  Rota para deletar um tipo de conta pelo ID
accountRouter.delete(
  "/deletar-tipo-de-conta/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const tipoContaId = parseInt(req.params.id, 10);

      // Verifica se o tipo de conta existe
      const tipoContaExistente = await prisma.tipoConta.findUnique({
        where: { idTipoConta: tipoContaId },
      });

      if (!tipoContaExistente) {
        return res.status(404).json({ error: "Tipo de conta não encontrado." });
      }
      // Verifica se há contas associadas a este tipo de conta
      const contasAssociadas = await prisma.conta.findMany({
        where: { tipoContaId: tipoContaId },
      });

      if (contasAssociadas.length > 0) {
        return res.status(400).json({
          error:
            "Existem contas associadas a este tipo de conta. Não é possível excluir.",
        });
      }

      // Deleta o tipo de conta
      const tipoContaDeletado = await prisma.tipoConta.delete({
        where: { idTipoConta: tipoContaId },
      });

      res
        .status(200)
        .json({ "Deletado tipo de conta: ": tipoContaDeletado.tipoDaConta });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para criar uma conta para um usuário
accountRouter.post(
  "/criar-conta-para-usuario/:id",
  /*  verifyToken,
    checkBlocked,*/
  criarConta
);

// Rota para listar todas as contas com suporte a paginação
accountRouter.get("/listar-contas", async (req: Request, res: Response) => {
  try {
    // Parâmetros de paginação
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10; // Padrão: 10 contas por página

    // Calcular o índice inicial com base na página e no tamanho da página
    const startIndex = (page - 1) * pageSize;

    // Consultar contas com suporte a paginação
    const contas = await prisma.conta.findMany({
      // skip: startIndex,
      // skip: 1,
      // take: pageSize,
      // take: 100,
      include: {
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            cpf: true,
            email: true,
            permissoesDoUsuario: true,
          },
        },
        gerenteConta: {
          select: {
            nome: true,
            telefone: true,
            emailContato: true,
            celular: true,
          },
        },
        // plano: true,
        // subContas: true,
        // cobrancas: true,
        // tipoDaConta: true,
      },
    });

    // Contar o total de contas para calcular as informações de metadados
    const totalItems = await prisma.conta.count();
    const totalPages = Math.ceil(totalItems / pageSize);

    const metadata = {
      page,
      pageSize,
      totalItems,
      totalPages,
    };
    // Serializar a resposta omitindo a senha do usuário
    const contasSerialized = contas.map((conta) => ({
      ...conta,
      usuario: {
        ...conta.usuario,
        senha: undefined,
      },
    }));
    return res.status(200).json({ contas: contasSerialized, metadata });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});
// Rota para buscar uma conta pelo ID
accountRouter.get(
  "/buscar-conta-por-id/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const conta = await prisma.conta.findUnique({
        where: { idConta: parseInt(id, 10) },
        include: {
          // Adicione outros relacionamentos que deseja incluir
          usuario: {
            select: {
              idUsuario: true,
              nome: true,
              cpf: true,
              email: true,
              permissoesDoUsuario: true,
            },
          },
          plano: true,
          tipoDaConta: true,
          cobrancas: true,
          gerenteConta: {
            select: {
              nome: true,
              telefone: true,
              emailContato: true,
              celular: true,
            },
          },
          subContas: {
            select: {
              idSubContas: true,
              nome: true,
              cpf: true,
              email: true,
              permissoes: true,
            },
          },
        },
      });

      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Serializar a resposta omitindo a senha do usuário
      const contaSerialized = {
        ...conta,
        usuario: {
          ...conta.usuario,
          senha: undefined,
        },
      };

      return res.status(200).json(contaSerialized);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para buscar uma conta pelo número da conta
accountRouter.get(
  "/buscar-conta-por-numero/:numeroConta",
  async (req: Request, res: Response) => {
    try {
      const { numeroConta } = req.params;

      const conta = await prisma.conta.findUnique({
        where: { numeroConta },
        include: {
          // Adicione outros relacionamentos que deseja incluir
          usuario: {
            select: {
              idUsuario: true,
              nome: true,
              cpf: true,
              email: true,
              permissoesDoUsuario: true,
            },
          },
          plano: true,
          tipoDaConta: true,
          cobrancas: true,
          gerenteConta: {
            select: {
              idUsuario: true,
              nome: true,
              cpf: true,
              email: true,
              permissoesDoUsuario: true,
            },
          },
          subContas: {
            select: {
              idSubContas: true,
              nome: true,
              cpf: true,
              email: true,
              permissoes: true,
            },
          },
        },
      });

      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }
      // Serializar a resposta omitindo a senha do usuário
      const contaSerialized = {
        ...conta,
        usuario: {
          ...conta.usuario,
          senha: undefined,
        },
      };

      return res.status(200).json(contaSerialized);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
      await prisma.$disconnect();
    }
  }
);
// Rota para atualizar dados de uma conta
accountRouter.put(
  "/atualizar-conta/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        nomeFranquia,
        dataDeAfiliacao,
        saldoPermuta: saldoPermutaRequest,
        valorVendaTotalAtual,
        tipoContaId,
        gerenteContaId,
        limiteCredito,
        limiteUtilizado,
        limiteDisponivel,
        dataVencimentoFatura,
        diaFechamentoFatura,
        limiteVendaEmpresa,
        limiteVendaMensal,
        limiteVendaTotal,
        valorVendaMensalAtual,
        planoId,
        taxaRepasseMatriz,
        permissoesEspecificas,
      } = req.body;

      // Verificar se a conta existe
      const contaExistente = await prisma.conta.findUnique({
        where: { idConta: parseInt(id, 10) },
      });

      if (!contaExistente) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      const saldoPermuta = saldoPermutaRequest !== null ? saldoPermutaRequest : 0;

      // Atualizar os dados da conta
      const contaAtualizada = await prisma.conta.update({
        where: { idConta: parseInt(id, 10) },
        data: {
          nomeFranquia,
          dataDeAfiliacao,
          valorVendaTotalAtual,
          tipoContaId,
          gerenteContaId,
          limiteCredito,
          limiteUtilizado,
          limiteDisponivel,
          saldoPermuta,
          dataVencimentoFatura,
          diaFechamentoFatura,
          limiteVendaEmpresa,
          limiteVendaMensal,
          limiteVendaTotal,
          valorVendaMensalAtual,
          planoId,
          taxaRepasseMatriz,
          permissoesEspecificas,
        },
      });
      return res.status(200).json(contaAtualizada);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para deletar uma conta
accountRouter.delete(
  "/deletar-conta/:id",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verificar se a conta existe
      const contaExistente = await prisma.conta.findUnique({
        where: { idConta: parseInt(id, 10) },
      });

      if (!contaExistente) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Deletar a conta
      await prisma.conta.delete({
        where: { idConta: parseInt(id, 10) },
      });

      return res.status(204).json();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para adicionar um gerente para uma conta
accountRouter.post(
  "/adicionar-gerente/:idConta/:idGerente",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idConta, idGerente } = req.params;

      // Verificar se a conta e o gerente existem
      const contaExistente = await prisma.conta.findUnique({
        where: { idConta: parseInt(idConta, 10) },
      });

      const gerenteExistente = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idGerente, 10) },
      });

      if (!contaExistente || !gerenteExistente) {
        return res
          .status(404)
          .json({ error: "Conta ou gerente não encontrado." });
      }

      // Atualizar a conta com o gerente associado
      const contaAtualizada = await prisma.conta.update({
        where: { idConta: parseInt(idConta, 10) },
        data: {
          gerenteContaId: parseInt(idGerente, 10),
        },
        include: {
          gerenteConta: {
            select: {
              nome: true,
              telefone: true,
              emailContato: true,
              celular: true,
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
// Rota para remover o gerente de uma conta
accountRouter.put(
  "/remover-gerente/:idConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idConta } = req.params;
      // Remover o gerente associado à conta
      const contaAtualizada = await prisma.conta.update({
        where: { idConta: parseInt(idConta, 10) },
        data: {
          gerenteContaId: null,
        },
      });

      return res.status(200).json(contaAtualizada);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para listar contas gerenciadas por um usuário
accountRouter.get(
  "/contas-gerenciadas/:idUsuario",
  async (req: Request, res: Response) => {
    try {
      const { idUsuario } = req.params;

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idUsuario, 10) },
      });

      if (!usuarioExistente) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Consultar contas gerenciadas pelo usuário
      const contasGerenciadas = await prisma.conta.findMany({
        where: { gerenteContaId: parseInt(idUsuario, 10) },
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
        },
      });

      return res.status(200).json(contasGerenciadas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para criar uma subconta para a conta pai
accountRouter.post(
  "/criar-subconta/:idContaPai",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idContaPai } = req.params;
      const {
        nome,
        email,
        cpf,
        senha,
        imagem,
        statusConta,
        reputacao,
        telefone,
        celular,
        emailContato,
        logradouro,
        numero,
        cep,
        complemento,
        bairro,
        cidade,
        estado,
      } = req.body;

      // Verificar se o email já existe em usuários ou subcontas
      const existingEmail = await prisma.usuarios.findUnique({
        where: { email },
      });

      const existingSubContaEmail = await prisma.subContas.findUnique({
        where: { email },
      });

      // Verificar se o CPF já existe em usuários ou subcontas
      const existingCPF = await prisma.usuarios.findUnique({
        where: { cpf },
      });

      const existingSubContaCPF = await prisma.subContas.findUnique({
        where: { cpf },
      });

      if (existingEmail || existingCPF) {
        return res
          .status(400)
          .json({ error: "Email e/ou CPF já cadastrado para um usuário." });
      }

      if (existingSubContaEmail || existingSubContaCPF) {
        return res
          .status(400)
          .json({ error: "Email e/ou CPF já cadastrado para uma subconta" });
      }

      // Verificar o número atual de subcontas associadas à conta pai
      const numeroSubContas = await prisma.subContas.count({
        where: { contaPaiId: parseInt(idContaPai, 10) },
      });

      // Se a conta pai já tiver 4 subcontas, retornar um erro
      if (numeroSubContas >= 4) {
        return res.status(400).json({
          error: "Não é possível adicionar mais subcontas a esta conta.",
        });
      }

      // Buscar o número da conta pai
      const contaPai = await prisma.conta.findUnique({
        where: { idConta: parseInt(idContaPai, 10) },
        select: { numeroConta: true },
      });
      if (!contaPai) {
        return res.status(404).json({ error: "Conta pai não encontrada." });
      }

      // Buscar a última subconta relacionada à conta pai
      const ultimaSubConta = await prisma.subContas.findFirst({
        where: { contaPaiId: parseInt(idContaPai, 10) },
        orderBy: { numeroSubConta: "desc" },
        select: { numeroSubConta: true },
      });

      // Calcular o próximo número da subconta
      let proximoNumeroSubConta = 1;
      if (ultimaSubConta) {
        const ultimoNumero = ultimaSubConta.numeroSubConta.split("-")[1];
        proximoNumeroSubConta = parseInt(ultimoNumero, 10) + 1;
      }

      const numeroSubConta = `${contaPai.numeroConta}-${proximoNumeroSubConta}`;
      // Criptografar a senha antes de salvar no banco
      const senhaCriptografada = await bcrypt.hash(senha, 10);

      // Criar a subconta
      const novaSubConta = await prisma.subContas.create({
        data: {
          nome,
          email,
          cpf,
          imagem,
          statusConta,
          reputacao,
          emailContato,
          senha: senhaCriptografada,
          numeroSubConta,
          contaPaiId: parseInt(idContaPai, 10),
          telefone,
          celular,
          logradouro,
          numero,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
        },
        include: {
          contaPai: {
            select: {
              idConta: true,
              dataVencimentoFatura: true,
              diaFechamentoFatura: true,
              limiteCredito: true,
              permissoesEspecificas: true,
              numeroConta: true,
              saldoPermuta: true,
              limiteVendaEmpresa: true,
              limiteVendaMensal: true,
              nomeFranquia: true,
              taxaRepasseMatriz: true,
              valorVendaMensalAtual: true,
              valorVendaTotalAtual: true,
              cobrancas: true,
            },
          },
        },
      });

      // Desestruture a subconta, omitindo a senha
      const { senha: senhaSubConta, ...subContaSemSenha } = novaSubConta;

      // Retorne a subconta sem a senha
      return res.status(201).json(subContaSemSenha);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para deletar uma subconta
accountRouter.delete(
  "/deletar-subconta/:idSubConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;

      // Verificar se a subconta existe
      const subConta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta, 10) },
      });

      if (!subConta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Deletar a subconta
      await prisma.subContas.delete({
        where: { idSubContas: parseInt(idSubConta, 10) },
      });

      return res
        .status(200)
        .json({ message: "Subconta deletada com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para listar todas as subcontas com suporte a paginação
accountRouter.get(
  "/listar-subcontas/:idContaPai",
  async (req: Request, res: Response) => {
    try {
      const { idContaPai } = req.params;
      const { page, pageSize } = req.query;

      // Configurações padrão de paginação
      const paginaAtual = parseInt(page as string, 10) || 1;
      const itensPorPagina = parseInt(pageSize as string, 10) || 10;

      // Calcular o índice de início com base na página atual
      const indiceInicio = (paginaAtual - 1) * itensPorPagina;

      // Buscar subcontas com suporte a paginação e contar o total de subcontas
      const [subcontas, totalSubcontas] = await Promise.all([
        prisma.subContas.findMany({
          where: { contaPaiId: parseInt(idContaPai, 10) },
          include: {
            contaPai: {
              select: {
                idConta: true,
                dataVencimentoFatura: true,
                diaFechamentoFatura: true,
                limiteCredito: true,
                permissoesEspecificas: true,
                numeroConta: true,
                saldoPermuta: true,
                limiteVendaEmpresa: true,
                limiteVendaMensal: true,
                nomeFranquia: true,
                taxaRepasseMatriz: true,
                valorVendaMensalAtual: true,
                valorVendaTotalAtual: true,
                cobrancas: true,
              },
            },
          },
          skip: indiceInicio,
          take: itensPorPagina,
        }),
        prisma.subContas.count({
          where: { contaPaiId: parseInt(idContaPai, 10) },
        }),
      ]);

      // Calcular o número total de páginas
      const totalPages = Math.ceil(totalSubcontas / itensPorPagina);

      // Omitir senha da lista de subcontas
      const subcontasSemSenha = subcontas.map(
        ({ senha, ...subcontaSemSenha }) => subcontaSemSenha
      );

      // Metadados de paginação
      const paginationMeta = {
        currentPage: paginaAtual,
        pageSize: itensPorPagina,
        totalItems: totalSubcontas,
        totalPages: totalPages,
      };

      // Retornar a lista de subcontas com metadados de paginação e sem senha
      return res
        .status(200)
        .json({ subcontas: subcontasSemSenha, meta: paginationMeta });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para buscar uma subconta pelo ID
accountRouter.get(
  "/buscar-subconta/:idSubConta",
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;

      // Buscar a subconta pelo ID, incluindo os relacionamentos desejados
      const subconta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta, 10) },
        include: {
          contaPai: {
            select: {
              idConta: true,
              dataVencimentoFatura: true,
              diaFechamentoFatura: true,
              limiteCredito: true,
              permissoesEspecificas: true,
              numeroConta: true,
              saldoPermuta: true,
              limiteVendaEmpresa: true,
              limiteVendaMensal: true,
              nomeFranquia: true,
              taxaRepasseMatriz: true,
              valorVendaMensalAtual: true,
              valorVendaTotalAtual: true,
              cobrancas: true,
            },
          },
        },
      });

      // Se a subconta não for encontrada, retorne um erro 404
      if (!subconta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Omitir senha da subconta
      const { senha, ...subcontaSemSenha } = subconta;

      // Retornar a subconta com os relacionamentos
      return res.status(200).json(subcontaSemSenha);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota para atualizar os dados de uma subconta
accountRouter.patch(
  "/atualizar-subconta/:idSubConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;
      const {
        nome,
        email,
        cpf,
        imagem,
        telefone,
        celular,
        logradouro,
        numero,
        cep,
        complemento,
        bairro,
        cidade,
        estado,
        reputacao, // Adicione os campos que você deseja permitir a atualização
      } = req.body;

      // Verificar se a subconta existe
      const subConta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta, 10) },
      });

      if (!subConta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Atualizar os dados da subconta
      const subContaAtualizada = await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta, 10) },
        data: {
          nome,
          email,
          cpf,
          imagem,
          telefone,
          celular,
          logradouro,
          numero,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
          reputacao,
          // Adicione outros campos que você deseja permitir a atualização
        },
      });

      // Omitir a senha da subconta atualizada
      const { senha, ...subContaSemSenha } = subContaAtualizada;

      // Retornar a subconta atualizada
      return res.status(200).json(subContaSemSenha);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para solicitar o envio do token de redefinição de senha subconta
accountRouter.post(
  "/solicitar-redefinicao-senha/:idSubConta",
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;

      // Verificar se a subconta existe
      const subConta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta, 10) },
      });

      if (!subConta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }
      // Gerar o token de redefinição de senha
      const tokenResetSenha = gerarToken();
      // Atualizar a subconta com o token
      const subContaAtualizada = await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta, 10) },
        data: {
          tokenResetSenha: tokenResetSenha !== null ? tokenResetSenha : "",
        },
      });

      // Enviar o token por e-mail
      const emailDestinatario = subContaAtualizada.email;
      const assuntoEmail = "Redefinição de Senha - REDE TRADE";
      const corpoEmail = `Seu token de redefinição de senha é: ${tokenResetSenha}`;
      await enviarEmail(emailDestinatario, assuntoEmail, corpoEmail);

      return res.status(200).json({ message: "Token enviado com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para redefinir a senha subconta usando o token
accountRouter.post(
  "/redefinir-senha/:idSubConta",
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;
      const { novaSenha, token } = req.body;

      // Verificar se o token de redefinição de senha é válido
      const subConta = await prisma.subContas.findUnique({
        where: {
          idSubContas: parseInt(idSubConta, 10),
          tokenResetSenha: token,
        },
      });

      if (!subConta) {
        return res
          .status(400)
          .json({ error: "Token de redefinição de senha inválido." });
      }

      // Verificar se o token ainda é válido (adicione a lógica de expiração, se necessário)

      // Criptografar a nova senha
      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      // Atualizar a senha e limpar o token de redefinição de senha
      const subContaAtualizada = await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta, 10) },
        data: {
          senha: senhaCriptografada,
          tokenResetSenha: null,
        },
      });

      // Omitir a senha da subconta atualizada
      const { senha, ...subContaSemSenha } = subContaAtualizada;

      // Retornar a subconta atualizada
      return res
        .status(200)
        .json({ message: "Senha atualizada com sucesso", subContaSemSenha });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

/*PERMISSÕES */

// Método para adicionar uma nova permissão à Subconta
accountRouter.post(
  "/subcontas/adicionar-permissao/:idSubConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;
      const { permissoes } = req.body;
      // Verifica se a subconta existe
      const subcontaExists = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta) },
      });

      if (!subcontaExists) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Adiciona as permissões
      const subconta = await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta) },
        data: {
          permissoes: JSON.stringify(permissoes),
        },
      });

      // Omitir senha da subconta
      const { senha, ...subcontaSemSenha } = subconta;

      // Retornar a subconta com os relacionamentos
      return res.status(200).json(subcontaSemSenha);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao adicionar permissões à subconta." });
    }
  }
);
//Rota para deletar uma permissão
accountRouter.delete(
  "/subcontas/remover-permissoes/:idSubConta",
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;
      const { permissoes } = req.body;

      // Verifica se a subconta existe
      const subcontaExists = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta) },
      });

      if (!subcontaExists) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      const currentPermissoes = JSON.parse(subcontaExists.permissoes);

      // Garante que permissoes é um array
      const permissoesArray = Array.isArray(permissoes)
        ? permissoes
        : [permissoes];

      // Remove as permissões
      const updatedPermissoes = currentPermissoes.filter(
        (p: string) => !permissoesArray.includes(p)
      );

      const updatedSubconta = await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta) },
        data: {
          permissoes: JSON.stringify(updatedPermissoes),
        },
      });
      // Omitir senha da subconta
      const { senha, ...subcontaSemSenha } = updatedSubconta;

      // Retornar a subconta com os relacionamentos
      return res.status(200).json(subcontaSemSenha);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao remover permissões da subconta." });
    }
  }
);
//Rota que lista permissoes de uma subconta
accountRouter.get(
  "/subcontas/permissoes/:idSubConta",
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;

      // Verifica se a subconta existe
      const subconta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta) },
      });

      if (!subconta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Obtém as permissões da subconta
      const permissoes = JSON.parse(subconta.permissoes);

      res.status(200).json({ permissoes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao obter permissões da subconta." });
    }
  }
);
//Rota para atualizar permissoes de uma subconta
accountRouter.put(
  "/subcontas/atualizar-permissoes/:idSubConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idSubConta } = req.params;
      const { permissoes } = req.body;

      // Verifica se a subconta existe
      const subconta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta) },
      });

      if (!subconta) {
        return res.status(404).json({ error: "Subconta não encontrada." });
      }

      // Atualiza as permissões da subconta
      await prisma.subContas.update({
        where: { idSubContas: parseInt(idSubConta) },
        data: {
          permissoes: JSON.stringify(permissoes),
        },
      });

      // Recupera a subconta atualizada
      const updatedSubconta = await prisma.subContas.findUnique({
        where: { idSubContas: parseInt(idSubConta) },
      });

      // Omitir senha da subconta
      const subcontaSemSenha = updatedSubconta
        ? (({ senha, ...rest }) => rest)(updatedSubconta)
        : null;

      // Retornar a subconta com os relacionamentos
      return res.status(200).json(subcontaSemSenha);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao atualizar permissões da subconta." });
    }
  }
);

// Rota para adicionar permissões a um TipoConta
accountRouter.post(
  "/tipocontas/adicionar-permissao/:idTipoConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idTipoConta } = req.params;
      const { permissoes } = req.body;

      // Verifica se o TipoConta existe
      const tipoContaExists = await prisma.tipoConta.findUnique({
        where: { idTipoConta: parseInt(idTipoConta) },
      });

      if (!tipoContaExists) {
        return res.status(404).json({ error: "TipoConta não encontrada." });
      }

      // Adiciona as permissões
      const tipoConta = await prisma.tipoConta.update({
        where: { idTipoConta: parseInt(idTipoConta) },
        data: {
          permissoes: JSON.stringify(permissoes),
        },
      });

      res.status(200).json(tipoConta);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao adicionar permissões ao TipoConta." });
    }
  }
);

// Rota para remover permissões específicas de um TipoConta
accountRouter.delete(
  "/tipocontas/remover-permissoes/:idTipoConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idTipoConta } = req.params;
      const { permissoes } = req.body;

      // Verifica se o TipoConta existe
      const tipoContaExists = await prisma.tipoConta.findUnique({
        where: { idTipoConta: parseInt(idTipoConta) },
      });

      if (!tipoContaExists) {
        return res.status(404).json({ error: "TipoConta não encontrada." });
      }

      // Filtra as permissões que não devem ser removidas
      const novasPermissoes = JSON.parse(tipoContaExists.permissoes).filter(
        (permissao: string) => !permissoes.includes(permissao)
      );

      // Atualiza o Usuário com as permissões atualizadas
      const updatedTipoConta = await prisma.tipoConta.update({
        where: { idTipoConta: parseInt(idTipoConta) },
        data: {
          permissoes: {
            set: JSON.stringify(novasPermissoes),
          },
        },
      });

      return res
        .status(200)
        .json({
          message: "Permissões removidas com sucesso.",
          updatedTipoConta,
        });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao remover permissões do TipoConta." });
    }
  }
);

// Rota para obter as permissões de um TipoConta
accountRouter.get(
  "/tipocontas/permissoes/:idTipoConta",
  async (req: Request, res: Response) => {
    try {
      const { idTipoConta } = req.params;

      // Verifica se o TipoConta existe
      const tipoConta = await prisma.tipoConta.findUnique({
        where: { idTipoConta: parseInt(idTipoConta) },
      });

      if (!tipoConta) {
        return res.status(404).json({ error: "TipoConta não encontrada." });
      }

      // Obtém as permissões do TipoConta
      const permissoes = JSON.parse(tipoConta.permissoes);

      res.status(200).json({ permissoes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao obter permissões do TipoConta." });
    }
  }
);

// Rota para atualizar permissões de um TipoConta
accountRouter.put(
  "/tipocontas/atualizar-permissoes/:idTipoConta",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const { idTipoConta } = req.params;
      const { permissoes } = req.body;

      // Verifica se o TipoConta existe
      const tipoConta = await prisma.tipoConta.findUnique({
        where: { idTipoConta: parseInt(idTipoConta) },
      });

      if (!tipoConta) {
        return res.status(404).json({ error: "TipoConta não encontrada." });
      }

      // Atualiza as permissões do TipoConta
      await prisma.tipoConta.update({
        where: { idTipoConta: parseInt(idTipoConta) },
        data: {
          permissoes: JSON.stringify(permissoes),
        },
      });

      // Recupera o TipoConta atualizado
      const updatedTipoConta = await prisma.tipoConta.findUnique({
        where: { idTipoConta: parseInt(idTipoConta) },
      });

      // Retornar o TipoConta com os relacionamentos
      return res.status(200).json(updatedTipoConta);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erro ao atualizar permissões do TipoConta." });
    }
  }
);
// Rota para adicionar limite de crédito e gerar cobrança instantânea
accountRouter.post(
  "/pagamento-do-plano/:idUsuario",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const idUsuario = parseInt(req.params.idUsuario, 10);
      const { formaPagamento, idPlano } = req.body;

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuarios.findUnique({
        where: { idUsuario },
        include: {
          conta: true,
        },
      });

      if (!usuarioExistente) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const { conta } = usuarioExistente;

      // Verificar a existência de uma conta associada ao usuário
      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      // Declarar e inicializar a variável valorCreditoUtilizado
      let valorCreditoUtilizado = 0;

      // Verificar a forma de pagamento
      if (formaPagamento === "100" || formaPagamento === "50") {
        // Acessar o plano para obter a taxa de inscrição e outros dados
        const plano = await prisma.plano.findUnique({
          where: { idPlano },
        });

        if (!plano) {
          return res.status(404).json({ error: "Plano não encontrado." });
        }

        valorCreditoUtilizado =
          (formaPagamento === "100" ? 1 : 0.5) * plano.taxaInscricao;

        if (conta.limiteCredito === 0) {
          await prisma.conta.update({
            where: { idConta: conta.idConta },
            data: {
              limiteCredito: valorCreditoUtilizado,
              limiteUtilizado: valorCreditoUtilizado,
              saldoPermuta: (conta.saldoPermuta ?? 0) - valorCreditoUtilizado,
            },
          });
        } else if (
          conta.limiteCredito &&
          conta.limiteCredito >= valorCreditoUtilizado
        ) {
          await prisma.conta.update({
            where: { idConta: conta.idConta },
            data: {
              limiteUtilizado:
                (conta.limiteUtilizado || 0) + valorCreditoUtilizado,
              saldoPermuta: (conta.saldoPermuta ?? 0) - valorCreditoUtilizado,
            },
          });
        }

        // Registrar o valor no FundoPermuta
        await prisma.fundoPermuta.create({
          data: {
            valor: valorCreditoUtilizado,
            usuarioId: idUsuario,
          },
        });
      }

      return res.status(200).json({
        message: `Pagamento da taxa de inscrição do plano ${formaPagamento}% lançado como fundo permuta!`,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Erro interno do servidor ao processar o pagamento do plano.",
      });
    }
  }
);


export default accountRouter;