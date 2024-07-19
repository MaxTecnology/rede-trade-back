// routes/account.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { enviarEmail, gerarToken } from "../utils/utils";
import * as jwt from "jsonwebtoken";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { BuscarUsuariosParams, buscarFranquiasPorMatriz, criarUsuario, getTipoDeContaUsuario, listarUsuariosAssociados } from "../controllers/users.controller";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";

const prisma = new PrismaClient();

const userRouter = Router();
// Rota para criar um usuário
userRouter.post("/criar-usuario", /*verifyToken, checkBlocked, */criarUsuario);

// Rota para listar todos os usuários com paginação
userRouter.get('/listar-usuarios', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 60 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const pageSizeNumber = parseInt(pageSize as string, 10);

    // Calcular o índice inicial do usuário com base na página e no tamanho da página
    const skip = (pageNumber - 1) * pageSizeNumber;

    // Buscar os usuários com os relacionamentos desejados e aplicar a paginação
    const usuarios = await prisma.usuarios.findMany({
      include: {
        conta: true,
        contasGerenciadas: true,
        ofertas: true,
        transacoesComprador: true,
        transacoesVendedor: true,
        cobrancas: true,
      },
      skip,
      take: pageSizeNumber,
    });

    // Omitir senha dos usuários na resposta
    const usuariosSemSenha = usuarios.map((usuario) => ({ ...usuario, senha: undefined }));

    return res.status(200).json({
      data: usuariosSemSenha,
      meta: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total: usuarios.length, // Total de usuários sem a paginação
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para buscar um usuário pelo ID
userRouter.get('/buscar-usuario/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar o usuário pelo ID com os relacionamentos desejados
    const usuario = await prisma.usuarios.findUnique({
      where: { idUsuario: parseInt(id, 10) },
      include: {
        conta: {
          include:{
            gerenteConta:{
              select:{
                email:true,
                emailContato:true,
                nome:true,
                nomeContato:true,
                telefone:true,
                celular:true,
                site:true,
              }
            },
          }
        },
        contasGerenciadas: true,
        ofertas: true,
        transacoesComprador: true,
        transacoesVendedor: true,
        cobrancas: true,
      },
    });

    // Se o usuário não for encontrado, retornar 404
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Omitir senha do usuário na resposta
    const usuarioSemSenha = { ...usuario, senha: undefined };

    return res.status(200).json(usuarioSemSenha);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para atualizar dados de um usuário
userRouter.put("/atualizar-usuario/:id",   verifyToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dadosAtualizados = req.body;

      // Atualizar o usuário pelo ID
      const usuarioAtualizado = await prisma.usuarios.update({
        where: { idUsuario: parseInt(id, 10) },
        data: dadosAtualizados,
      });

      // Remover a senha do objeto de resposta
      const usuarioSemSenha = { ...usuarioAtualizado, senha: undefined };

      return res.status(200).json(usuarioSemSenha);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

// Rota para deletar um usuário
userRouter.delete('/deletar-usuario/:id',  verifyToken,
  checkBlocked, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { idUsuario: parseInt(id, 10) },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Deletar o usuário
    await prisma.usuarios.delete({
      where: { idUsuario: parseInt(id, 10) },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para adicionar permissões a um Usuário
userRouter.post('/adicionar-permissao/:idUsuario',  verifyToken,
  checkBlocked, async (req: Request, res: Response) => {
  try {
    const { idUsuario } = req.params;
    const { permissoes } = req.body;

    // Verifica se o Usuário existe
    const usuarioExists = await prisma.usuarios.findUnique({
      where: { idUsuario: parseInt(idUsuario) },
    });

    if (!usuarioExists) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Adiciona as permissões
    const usuario = await prisma.usuarios.update({
      where: { idUsuario: parseInt(idUsuario) },
      data: {
        permissoesDoUsuario: JSON.stringify(permissoes),
      },
    });

    res.status(200).json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao adicionar permissões ao Usuário." });
  }
});

userRouter.delete("/remover-permissao/:idUsuario",   verifyToken,
  checkBlocked, async (req: Request, res: Response) => {
    try {
      const { idUsuario } = req.params;
      const { permissoes } = req.body;

      // Verifica se o Usuário existe
      const usuarioExists = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idUsuario) },
      });

      if (!usuarioExists) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Obtém as permissões atuais do Usuário
      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idUsuario) },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Filtra as permissões que não devem ser removidas
const novasPermissoes = JSON.parse(usuario.permissoesDoUsuario || "[]").filter(
  (permissao: string) => !permissoes.includes(permissao)
);

      // Atualiza o Usuário com as permissões atualizadas
      const updatedUser = await prisma.usuarios.update({
        where: { idUsuario: parseInt(idUsuario) },
        data: {
          permissoesDoUsuario: {
            set: JSON.stringify(novasPermissoes),
          },
        },
      });
      // Omitir senha da subconta
      const { senha, ...usuarioSemSenha } = updatedUser;
     return  res
        .status(200)
        .json({ message: "Permissões removidas com sucesso.", usuarioSemSenha });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao remover permissões do Usuário." });
    }
  }
);
// Rota para listar todas as permissões de um Usuário
  userRouter.get('/listar-permissoes/:idUsuario', async (req: Request, res: Response) => {
    try {
      const { idUsuario } = req.params;

      // Verifica se o Usuário existe
      const usuarioExists = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idUsuario) },
      });

      if (!usuarioExists) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Obtém as permissões do Usuário
      const usuario = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(idUsuario) },
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Converte a string JSON para um array
  const permissoes = JSON.parse(usuario.permissoesDoUsuario || "[]");

      res.status(200).json({ permissoes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao obter as permissões do Usuário." });
    }
  });

// Rota para solicitar o envio do link de redefinição de senha usuário
userRouter.post("/solicitar-redefinicao-senha-usuario", async (req: Request, res: Response) => {
    try {
        const { email, cpf } = req.body;

        // Verificar se o usuário existe com base no email ou CPF fornecido
        let usuario;
        if (email) {
            usuario = await prisma.usuarios.findUnique({
                where: { email: email },
            });
        } else if (cpf) {
            usuario = await prisma.usuarios.findUnique({
                where: { cpf: cpf },
            });
        } else {
            return res.status(400).json({ error: "É necessário fornecer um email ou CPF." });
        }

        // Verificar se o usuário foi encontrado
        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // Gerar o token de redefinição de senha
        const tokenResetSenha = gerarToken();

        // Atualizar o usuário com o token
        const usuarioAtualizado = await prisma.usuarios.update({
            where: { idUsuario: usuario.idUsuario },
            data: {
                tokenResetSenha: tokenResetSenha !== null ? tokenResetSenha : "",
            },
        });

        // Construir o link de redefinição de senha com o ID do usuário e o token
        const resetLink = `https://app.redetrade.com.br/resetPassword?id=${usuarioAtualizado.idUsuario}&token=${tokenResetSenha}`;

        // Enviar o link por e-mail
        const emailDestinatario = usuarioAtualizado.email;
        const assuntoEmail = "Redefinição de Senha - REDE TRADE";
        const corpoEmail = `Olá,\n\nVocê solicitou a redefinição de senha para sua conta na REDE TRADE. Por favor, clique no link a seguir para redefinir sua senha:\n\n${resetLink}\n\nSe você não solicitou essa redefinição, ignore este e-mail.\n\nAtenciosamente,\nREDE TRADE`;
        await enviarEmail(emailDestinatario, assuntoEmail, corpoEmail);

        return res.status(200).json({ message: "Um link para redefinição de senha foi enviado para o seu email." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
// Rota para redefinir a senha do usuário usando o token
userRouter.post("/redefinir-senha-usuario/:idUsuario",  async (req: Request, res: Response) => {
    try {
      const { idUsuario } = req.params;
      const { novaSenha, token } = req.body;
console.log(novaSenha,token,"ID USUARIO:", idUsuario)
      // Verificar se o token de redefinição de senha é válido
      const usuario = await prisma.usuarios.findUnique({
        where: {
          idUsuario: parseInt(idUsuario, 10),
          tokenResetSenha: token,
        },
      });

      if (!usuario) {
        return res
          .status(400)
          .json({ error: "Token de redefinição de senha inválido." });
      }

      // Verificar se o token ainda é válido (adicione a lógica de expiração, se necessário)

      // Criptografar a nova senha
      const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

      // Atualizar a senha e limpar o token de redefinição de senha
      const usuarioAtualizado = await prisma.usuarios.update({
        where: { idUsuario: parseInt(idUsuario, 10) },
        data: {
          senha: senhaCriptografada,
          tokenResetSenha: null,
        },
      });

      // Omitir a senha do usuário atualizado
      const { senha, ...usuarioSemSenha } = usuarioAtualizado;

      // Retornar o usuário atualizado
      return res
        .status(200)
        .json({ message: "Senha atualizada com sucesso", usuarioSemSenha });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);
// Rota de login
userRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { login, senha } = req.body;

    // Verificar se o login é um CPF ou e-mail
    const isEmail = login.includes("@");

    // Buscar o usuário nos modelos Usuario e Subconta
    const usuario = isEmail
      ? await prisma.usuarios.findFirst({
          where: { email: login },
          include: { conta: true },
        })
      : await prisma.usuarios.findFirst({
          where: { cpf: login },
          include: { conta: true },
        });

    const subconta = isEmail
      ? await prisma.subContas.findFirst({
          where: { email: login },
          include: { contaPai: true },
        })
      : await prisma.subContas.findFirst({
          where: { cpf: login },
          include: { contaPai: true },
        });

    // Verificar se o usuário foi encontrado em algum dos modelos
    const user = usuario || subconta;

    const userId = usuario?.idUsuario || subconta?.idSubContas

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Verificar a senha usando bcrypt
    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
    const secret = process.env.SECRET || ""
    // Gerar token JWT usando a chave secreta do ambiente
    console.log(secret);
    const token = jwt.sign({ userId: userId }, secret, {
      expiresIn: "1h",
    });

    // Omitir senha do usuário
    const { senha: _, tokenResetSenha, ...userWithoutPassword } = user;

    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Erro ao fazer login." });
  }
});
// Rota protegida para obter informações do usuário a partir do token
userRouter.get('/user-info', verifyToken, async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;

    // Busca as informações do usuário no banco de dados
    const user = await prisma.usuarios.findUnique({
      where: { idUsuario: userId },
      include: {
        conta: {
          select:{
            tipoDaConta:true,
            idConta:true,
            cobrancas:true, 
            gerenteConta:true,
            nomeFranquia:true,
            dataDeAfiliacao:true,
            dataVencimentoFatura:true,
            diaFechamentoFatura:true,
            gerenteContaId:true,
            limiteCredito:true,
            limiteDisponivel:true,
            limiteUtilizado:true,
            limiteVendaEmpresa:true,
            limiteVendaMensal:true,
            limiteVendaTotal:true,
            numeroConta:true,
            permissoesEspecificas:true, //
            plano:true,
            saldoPermuta:true,
            taxaRepasseMatriz:true, // TOD
            valorVendaMensalAtual:true, // TOD ***************
            subContas:true,
            planoId:true,
            tipoContaId:true,
            valorVendaTotalAtual:true, // TOD ******************************* //
          }
        },
        transacoesComprador: true,
        transacoesVendedor: true,
        cobrancas: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Omitir senha do usuário
    const { senha,tokenResetSenha, ...userWithoutPassword } = user;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter informações do usuário.' });
  }
});

userRouter.post("/listar-tipo-usuarios",   /*verifyToken,
  checkBlocked,*/ async (req: Request, res: Response) => {
    try {
      const { page = 1, pageSize = 100 } = req.query;
      const pageNumber = parseInt(page as string, 10);
      const pageSizeNumber = parseInt(pageSize as string, 10);

      const { tipoConta } = req.body;

      if (!tipoConta || !Array.isArray(tipoConta) || tipoConta.length === 0) {
        return res.status(400).json({
          error:
            "O tipo de conta é obrigatório e deve ser um array não vazio no corpo da solicitação.",
        });
      }

      // Calcular o índice inicial do usuário com base na página e no tamanho da página
      const skip = (pageNumber - 1) * pageSizeNumber;

      // Buscar os usuários com os relacionamentos desejados, filtrando pelos tipos de conta e aplicar a paginação
      const usuarios = await prisma.usuarios.findMany({
        where: {
          conta: {
            tipoDaConta: {
              tipoDaConta: {
                in: tipoConta,
              },
            },
          },
        },
        include: {
          conta: {
            include:{
              gerenteConta:{
                select:{
                  nome:true,
                  nomeContato:true,
                  nomeFantasia:true,
                  site:true,
                  telefone:true,
                  email:true,
                  celular:true,
                  emailContato:true,
                }
              },
            }
          },
          contasGerenciadas: true,
          ofertas: true,
          transacoesComprador: true,
          transacoesVendedor: true,
          cobrancas: true,
        },
        skip,
        take: pageSizeNumber,
      });

      // Omitir senha dos usuários na resposta
      const usuariosSemSenha = usuarios.map((usuario) => ({
        ...usuario,
        senha: undefined,
      }));

      return res.status(200).json({
        data: usuariosSemSenha,
        meta: {
          page: pageNumber,
          pageSize: pageSizeNumber,
          total: usuarios.length, // Total de usuários sem a paginação
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);

userRouter.get("/listar-ofertas/:idUsuario",  async (req: Request, res: Response) => {
    try {
      const { idUsuario } = req.params;

      // Verificar se o ID do usuário é um número válido
      if (!parseInt(idUsuario, 10)) {
        return res.status(400).json({ error: "ID do usuário inválido." });
      }

      const usuario = await prisma.usuarios.findUnique({
        where: {
          idUsuario: parseInt(idUsuario, 10),
        },
        include: {
          ofertas: true,
        },
      });

      // Verificar se o usuário existe
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      return res.status(200).json({
        data: usuario.ofertas,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }
);


userRouter.get("/buscar-tipo-de-conta/:userId", getTipoDeContaUsuario);

userRouter.get('/buscar-franquias/:matrizId', buscarFranquiasPorMatriz);

userRouter.get('/usuarios-criados/:usuarioCriadorId', listarUsuariosAssociados);

userRouter.get('/buscar-usuario-params', BuscarUsuariosParams)

export default userRouter;
