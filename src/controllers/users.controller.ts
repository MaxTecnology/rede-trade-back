import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { enviarEmail } from "../utils/utils";

const prisma = new PrismaClient();
interface FilterParams {
  [key: string]: any;
}
export const getTipoDeContaUsuario = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10); // Certifique-se de usar o parâmetro correto

    const usuarioComTipoDaConta = await prisma.usuarios.findUnique({
      where: {
        idUsuario: userId,
      },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });

    if (!usuarioComTipoDaConta) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const tipoDeConta = usuarioComTipoDaConta.conta?.tipoDaConta?.tipoDaConta;

    if (!tipoDeConta) {
      return res
        .status(404)
        .json({ error: "Tipo de conta não encontrado para este usuário" });
    }

    res.json({ tipoDeConta });
  } catch (error) {
    console.error("Erro ao buscar tipo de conta do usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
export const criarUsuario = async (req: Request, res: Response) => {
    const {
      nome,
      cpf,
      email,
      senha,
      imagem,
      statusConta,
      reputacao,
      razaoSocial,
      nomeFantasia,
      cnpj,
      inscEstadual,
      inscMunicipal,
      mostrarNoSite,
      descricao,
      tipo,
      tipoDeMoeda,
      status,
      restricao,
      nomeContato,
      telefone,
      celular,
      emailContato,
      emailSecundario,
      site,
      logradouro,
      numero,
      cep,
      complemento,
      bairro,
      cidade,
      estado,
      regiao,
      aceitaOrcamento,
      aceitaVoucher,
      tipoOperacao,
      categoriaId,
      subcategoriaId,
      usuarioCriadorId,
    } = req.body;
    if (typeof senha !== "string") {
      return res.status(400).json({ error: "A senha deve ser uma string." });
    }
    // Verifica se já existe um usuário com o mesmo e-mail ou CPF
    const usuarioExistente = await prisma.usuarios.findFirst({
      where: {
        OR: [{ email: email }, { cpf: cpf }],
      },
    });

    if (usuarioExistente) {
      return res
        .status(400)
        .json({ error: "Usuário com o mesmo e-mail ou CPF já existe." });
    }
    
    if (usuarioCriadorId) {
      const usuarioCriador = await prisma.usuarios.findUnique({
        where: { idUsuario: parseInt(usuarioCriadorId, 10) },
        include: {
          conta: {
            select: {
              tipoDaConta: true,
            },
          },
        },
      });

      if (!usuarioCriador) {
        return res
          .status(404)
          .json({ error: "Usuário criador não encontrado." });
      }
      let matrizId;

      if (
        usuarioCriador.conta &&
        usuarioCriador.conta.tipoDaConta?.tipoDaConta === "Matriz"
      ) {
        // Se o usuário criador tem o tipo de conta "Matriz"
        matrizId = usuarioCriadorId;
      } else {
        // Se o usuário criador não é uma matriz, procuramos até encontrar a matriz
        let usuarioAtual: any = usuarioCriador;

        while (
          usuarioAtual?.conta?.tipoDaConta?.tipoDaConta !== "Matriz" &&
          usuarioAtual.usuarioCriadorId
        ) {
          usuarioAtual = await prisma.usuarios.findUnique({
            where: { idUsuario: usuarioAtual.usuarioCriadorId },
            include: {
              conta: {
                select: {
                  tipoDaConta: true,
                },
              },
            },
          });
        }
        if (usuarioAtual?.conta?.tipoDaConta?.tipoDaConta === "Matriz") {
          matrizId = usuarioAtual.idUsuario;
        } else {
          return res
            .status(500)
            .json({ error: "Não foi possível encontrar a matriz associada." });
        }
      }
      const hashedPassword = await bcrypt.hash(senha, 10);

      const novoUsuario = await prisma.usuarios.create({
        data: {
          nome,
          cpf,
          email,
          senha: hashedPassword,
          imagem,
          statusConta,
          reputacao,
          razaoSocial,
          nomeFantasia,
          cnpj,
          inscEstadual,
          inscMunicipal,
          mostrarNoSite,
          descricao,
          tipo,
          tipoDeMoeda,
          status,
          restricao,
          nomeContato,
          telefone,
          celular,
          emailContato,
          emailSecundario,
          site,
          logradouro,
          numero,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
          regiao,
          aceitaOrcamento,
          aceitaVoucher,
          tipoOperacao,
          categoriaId,
          subcategoriaId,
          usuarioCriadorId: parseInt(usuarioCriadorId, 10),
          matrizId,
        },
        include: {
          categoria: true,
          subcategoria: true,
          matriz: {
            select: {
              nome: true,
              celular: true,
              email: true,
              nomeFantasia: true,
              cnpj: true,
              inscEstadual: true,
              inscMunicipal: true,
              idUsuario: true,
            },
          },
        },
      });
      const destinatario = email;
      const assunto = "Bem-vindo à Plataforma RedeTrade!";
      const corpo = `Olá ${nome}, \n\n
Bem-vindo à Plataforma RedeTrade! Agradecemos por escolher nossa plataforma para suas necessidades comerciais.
\n\n
Acesse sua conta usando as seguintes credenciais:\n
E-mail: ${email}\n
Senha: ${senha}\n\n
Estamos entusiasmados em tê-lo a bordo. Se precisar de assistência ou tiver alguma dúvida, não hesite em entrar em contato conosco.
\n\n
Atenciosamente,\n
Equipe RedeTrade`;

      //await enviarEmail(destinatario, assunto, corpo);
      return res.status(201).json({
        ...novoUsuario,
        senha: undefined,
      });
    } else {
      const hashedPassword = await bcrypt.hash(senha, 10);

      const novoUsuario = await prisma.usuarios.create({
        data: {
          nome,
          cpf,
          email,
          senha: hashedPassword,
          imagem,
          statusConta,
          reputacao,
          razaoSocial,
          nomeFantasia,
          cnpj,
          inscEstadual,
          inscMunicipal,
          mostrarNoSite,
          descricao,
          tipo,
          tipoDeMoeda,
          status,
          restricao,
          nomeContato,
          telefone,
          celular,
          emailContato,
          emailSecundario,
          site,
          logradouro,
          numero,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
          regiao,
          aceitaOrcamento,
          aceitaVoucher,
          tipoOperacao,
          categoriaId,
          subcategoriaId,
        },
        include: {
          categoria: true,
          subcategoria: true,
          matriz: {
            select: {
              nome: true,
              celular: true,
              email: true,
              nomeFantasia: true,
              cnpj: true,
              inscEstadual: true,
              inscMunicipal: true,
              idUsuario: true,
            },
          },
        },
      });
         return res.status(201).json({
           ...novoUsuario,
           senha: undefined,
         });
    }
}
export const buscarFranquiasPorMatriz = async (req: Request, res: Response) => {
  try {
    const { matrizId } = req.params;

    // Buscar todas as franquias e franquias masters pela matriz
      const franquias = await prisma.usuarios.findMany({
        where: {
          usuarioCriadorId: parseInt(matrizId, 10),
          conta: {
            tipoDaConta: {
              tipoDaConta: { in: ["Franquia", "Franquia Master"] },
            },
          },
        },
        select: {
          idUsuario: true,
          usuarioCriadorId: true,
          matrizId: true,
          nome: true,
          cpf: true,
          email: true,
          imagem: true,
          statusConta: true,
          reputacao: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
          inscEstadual: true,
          inscMunicipal: true,
          mostrarNoSite: true,
          descricao: true,
          tipo: true,
          tipoDeMoeda: true,
          status: true,
          restricao: true,
          nomeContato: true,
          telefone: true,
          celular: true,
          emailContato: true,
          emailSecundario: true,
          site: true,
          logradouro: true,
          numero: true,
          cep: true,
          complemento: true,
          bairro: true,
          cidade: true,
          estado: true,
          regiao: true,
          aceitaOrcamento: true,
          aceitaVoucher: true,
          tipoOperacao: true,
          categoriaId: true,
          subcategoriaId: true,
          taxaComissaoGerente: true,
          permissoesDoUsuario: true,
        },
      });
    return res.status(200).json(franquias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
export const listarUsuariosAssociados = async (req: Request, res: Response) => {
  try {
    const { usuarioCriadorId } = req.params;

    const usuariosAssociados = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(usuarioCriadorId, 10),
        conta: {
          tipoDaConta: {
            tipoDaConta: "Associado",
          },
        },
      },
    });

    if(usuariosAssociados.length < 1 ){
        return res.status(404).json({error: "Não foi possível encontrar os associados."});
    }
    // Mapeia os resultados e remove a senha
    const usuariosAssociadosSemSenha = usuariosAssociados.map((usuario) => {
      const { senha, tokenResetSenha, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    });

    return res.status(200).json(usuariosAssociadosSemSenha);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
export async function BuscarUsuariosParams(req: Request, res: Response) {
  try {
    const queryParams = req.query;
    const filter: FilterParams = {};
    const page = parseInt(queryParams.page as string) || 1;
    const pageSize = parseInt(queryParams.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    // Adicionar filtros baseados nos query params
    if (queryParams.nome) {
      filter["nome"] = queryParams.nome.toString();
    }
    if (queryParams.nomeFantasia) {
      filter["nomeFantasia"] = queryParams.nomeFantasia.toString();
    }
    if (queryParams.razaoSocial) {
      filter["razaoSocial"] = queryParams.razaoSocial.toString();
    }
    if (queryParams.nomeContato) {
      filter["nomeContato"] = queryParams.nomeContato.toString();
    }
    if (queryParams.estado) {
      filter["estado"] = queryParams.estado.toString();
    }
    if (queryParams.cidade) {
      filter["cidade"] = queryParams.cidade.toString();
    }
    if (queryParams.usuarioCriadorId) {
      filter["usuarioCriadorId"] = parseInt(
        queryParams.usuarioCriadorId.toString()
      );
    }

    // Adicionar filtro de tipo de conta
    if (queryParams.tipoDaConta) {
      const tipoConta = await prisma.tipoConta.findFirst({
        where: {
          tipoDaConta: queryParams.tipoDaConta.toString(),
        },
        include: {
          contasAssociadas: true, 
        },
      });

      if (tipoConta) {
        filter["conta"] = {
          tipoDaConta: {
            tipoDaConta: tipoConta.tipoDaConta,
          },
        };
      }
    } else {
      // Se nenhum tipo de conta for fornecido, aplicar filtro para "Associado" por padrão
      const tipoContaAssociado = await prisma.tipoConta.findFirst({
        where: {
          tipoDaConta: "Associado",
        },
      });

      if (tipoContaAssociado) {
        filter["conta"] = {
          tipoDaConta: {
            tipoDaConta: tipoContaAssociado.tipoDaConta,
          },
        };
      }
    }

    // Realizar a consulta no banco com paginação
    const [users, totalUsers] = await Promise.all([
      prisma.usuarios.findMany({
        where: filter,
        take: pageSize,
        skip: skip,
        include: {
          usuarioCriador: true,
          conta: true, 
          
        },
      }),
      prisma.usuarios.count({
        where: filter,
      }),
    ]);

        const totalPages = Math.ceil(totalUsers / pageSize);
        let nextPage: string | null = null;

        // Verificar se há uma próxima página
        if (page < totalPages) {
          const nextPageNumber = page + 1;
          nextPage = `${req.protocol}://${req.get("host")}${
            req.baseUrl
          }?page=${nextPageNumber}&pageSize=${pageSize}`;
        }

        res.json({
          data: users,
          meta: {
            totalResults: totalUsers,
            totalPages: totalPages,
            currentPage: page,
            pageSize: pageSize,
            nextPage: nextPage,
          },
        });
  } catch (error) {
    console.error("Erro ao pesquisar usuários:", error);
    res.status(500).json({ error: "Erro ao pesquisar usuários" });
  }
}