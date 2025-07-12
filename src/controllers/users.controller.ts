import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { enviarEmail } from "../utils/utils";
import { upload } from "../middlewares/upload";
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON

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

// Função para upload de imagem separada
export const uploadImagem = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const imagePath = `/uploads/images/${req.file.filename}`;
    
    res.json({
      message: 'Upload realizado com sucesso',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Função criarUsuario com middleware de upload
export const criarUsuario = [
  upload.single('imagem'),
  async (req: Request, res: Response) => {
    try {
      const {
        nome,
        cpf,
        email,
        senha,
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
        // Campos específicos para conta (quando for gerente)
        limiteCredito,
        taxaGerente,
        dataVencimentoFatura,
        planoId
      } = req.body;

      // Verificar se tem imagem enviada e definir o caminho
      let imagemPath = null;
      if (req.file) {
        imagemPath = `/uploads/images/${req.file.filename}`;
        console.log("📸 Imagem enviada:", req.file.filename);
      }

      if (typeof senha !== "string") {
        return res.status(400).json({ error: "A senha deve ser uma string." });
      }

      // Verificar se já existe usuário com mesmo email ou CPF
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

      let matrizId = null;

      // Lógica para determinar matriz
      if (usuarioCriadorId) {
        console.log("🔍 Buscando usuário criador:", usuarioCriadorId);
        
        const usuarioCriador = await prisma.usuarios.findUnique({
          where: { idUsuario: parseInt(usuarioCriadorId, 10) },
          include: {
            conta: {
              include: {
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

        const tipoConta = usuarioCriador.conta?.tipoDaConta?.tipoDaConta;
        
        if (tipoConta === "Matriz") {
          matrizId = usuarioCriador.idUsuario;
        } else if (usuarioCriador.matrizId) {
          matrizId = usuarioCriador.matrizId;
        } else {
          // Buscar matriz na hierarquia
          let usuarioAtual = usuarioCriador;
          let tentativas = 0;
          const maxTentativas = 10;

          while (
            usuarioAtual?.conta?.tipoDaConta?.tipoDaConta !== "Matriz" &&
            usuarioAtual.usuarioCriadorId &&
            tentativas < maxTentativas
          ) {
            tentativas++;
            usuarioAtual = await prisma.usuarios.findUnique({
              where: { idUsuario: usuarioAtual.usuarioCriadorId },
              include: {
                conta: {
                  include: {
                    tipoDaConta: true,
                  },
                },
              },
            });

            if (!usuarioAtual) break;
          }

          if (usuarioAtual?.conta?.tipoDaConta?.tipoDaConta === "Matriz") {
            matrizId = usuarioAtual.idUsuario;
          } else {
            return res
              .status(500)
              .json({ error: "Não foi possível encontrar a matriz associada." });
          }
        }
      }

      // FUNÇÃO PARA BUSCAR TIPO DE CONTA DINAMICAMENTE
      const buscarTipoConta = async (tipoUsuario: string): Promise<number> => {
        const mapeamentoTipos = {
          'Gerente': 'Premium',
          'Associado': 'Associado',
          'Matriz': 'Matriz',
          'Franquia': 'Franquia',
          'FranquiaMaster': 'Franquia' // Franquia Master usa mesmo tipo que Franquia
        };

        const tipoDaConta = mapeamentoTipos[tipoUsuario];
        if (!tipoDaConta) {
          throw new Error(`Tipo de usuário '${tipoUsuario}' não tem mapeamento definido`);
        }

        const tipoConta = await prisma.tipoConta.findFirst({
          where: { tipoDaConta: tipoDaConta }
        });

        if (!tipoConta) {
          throw new Error(`Tipo de conta '${tipoDaConta}' não encontrado no banco de dados`);
        }

        console.log(`🔍 Tipo de conta para ${tipoUsuario}:`, tipoConta.tipoDaConta, "ID:", tipoConta.idTipoConta);
        return tipoConta.idTipoConta;
      };

      // FUNÇÃO PARA GERAR NÚMERO DE CONTA ÚNICO
      const gerarNumeroConta = async (prefixo: string): Promise<string> => {
        // Buscar todas as contas com o prefixo específico
        const contasExistentes = await prisma.conta.findMany({
          where: {
            numeroConta: {
              startsWith: prefixo
            }
          },
          select: {
            numeroConta: true
          },
          orderBy: {
            numeroConta: 'desc'
          },
          take: 1
        });

        let proximoNumero = 1;
        
        if (contasExistentes.length > 0) {
          // Extrair o número da última conta
          const ultimaConta = contasExistentes[0].numeroConta;
          const numeroExtraido = ultimaConta.replace(prefixo, '');
          proximoNumero = parseInt(numeroExtraido, 10) + 1;
        }

        // Formatar com zeros à esquerda (6 dígitos)
        const numeroFormatado = proximoNumero.toString().padStart(6, '0');
        return `${prefixo}${numeroFormatado}`;
      };

      // Usar transação para garantir consistência
      const resultado = await prisma.$transaction(async (prisma) => {
        // Criptografar senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Dados básicos do usuário
        const dadosUsuario = {
          nome,
          cpf,
          email,
          senha: hashedPassword,
          imagem: imagemPath,
          statusConta: statusConta === 'true' || statusConta === true,
          reputacao: parseInt(reputacao) || 0,
          razaoSocial,
          nomeFantasia,
          cnpj,
          inscEstadual,
          inscMunicipal,
          mostrarNoSite: mostrarNoSite === 'true' || mostrarNoSite === true,
          descricao,
          tipo,
          tipoDeMoeda: tipoDeMoeda || 'BRL',
          status: status === 'true' || status === true,
          restricao,
          nomeContato,
          telefone,
          celular,
          emailContato,
          emailSecundario,
          site,
          logradouro,
          numero: numero ? parseInt(numero, 10) : null,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
          regiao,
          aceitaOrcamento: aceitaOrcamento === 'true' || aceitaOrcamento === true,
          aceitaVoucher: aceitaVoucher === 'true' || aceitaVoucher === true,
          tipoOperacao: tipoOperacao ? parseInt(tipoOperacao, 10) : null,
          categoriaId: categoriaId ? parseInt(categoriaId, 10) : null,
          subcategoriaId: subcategoriaId ? parseInt(subcategoriaId, 10) : null,
        };

        // Adicionar campos específicos se usuarioCriadorId existir
        if (usuarioCriadorId) {
          dadosUsuario.usuarioCriadorId = parseInt(usuarioCriadorId, 10);
          dadosUsuario.matrizId = matrizId;
        }

        console.log("💾 Criando usuário...");

        // Criar usuário
        const novoUsuario = await prisma.usuarios.create({
          data: dadosUsuario,
        });

        console.log("✅ Usuário criado:", novoUsuario.idUsuario, novoUsuario.nome);

        // CRIAR CONTA AUTOMATICAMENTE BASEADO NO TIPO
        let novaConta = null;
        
        if (tipo === 'Gerente') {
          console.log("🏦 Criando conta para gerente...");

          // Buscar tipo de conta dinamicamente
          const tipoContaId = await buscarTipoConta('Gerente');

          // Gerar número único para a conta
          const numeroConta = await gerarNumeroConta('GER');
          console.log("🔢 Número da conta gerado:", numeroConta);

          // Dados da conta
          const dadosConta = {
            numeroConta: numeroConta,
            tipoContaId: tipoContaId, // Busca dinâmica
            usuarioId: novoUsuario.idUsuario,
            nomeFranquia: nomeFantasia || nome,
            limiteCredito: limiteCredito ? parseFloat(limiteCredito.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 0,
            taxaRepasseMatriz: taxaGerente ? parseInt(taxaGerente, 10) : 0,
            dataVencimentoFatura: dataVencimentoFatura ? parseInt(dataVencimentoFatura, 10) : 10,
            diaFechamentoFatura: 25, // Padrão
            planoId: planoId ? parseInt(planoId, 10) : null,
            gerenteContaId: usuarioCriadorId ? parseInt(usuarioCriadorId, 10) : null,
            // Valores padrão
            limiteUtilizado: 0,
            saldoPermuta: 0,
            saldoDinheiro: 0,
            limiteVendaMensal: 100000, // Padrão
            limiteVendaTotal: 500000, // Padrão
            limiteVendaEmpresa: 250000, // Padrão
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            dataDeAfiliacao: new Date(),
            permissoesEspecificas: JSON.stringify(["ACCOUNT_MANAGEMENT", "REPORT_ACCESS"])
          };

          novaConta = await prisma.conta.create({
            data: dadosConta,
          });

          console.log("✅ Conta criada:", novaConta.idConta, novaConta.numeroConta);
        }
        
        // CRIAR CONTA PARA ASSOCIADOS
        else if (tipo === 'Associado') {
          console.log("🏦 Criando conta para associado...");

          // Buscar tipo de conta dinamicamente
          const tipoContaId = await buscarTipoConta('Associado');

          // Gerar número único para a conta com prefixo ASS
          const numeroConta = await gerarNumeroConta('ASS');
          console.log("🔢 Número da conta associado gerado:", numeroConta);

          // Dados da conta para associado
          const dadosConta = {
            numeroConta: numeroConta,
            tipoContaId: tipoContaId, // Busca dinâmica
            usuarioId: novoUsuario.idUsuario,
            nomeFranquia: nomeFantasia || nome,
            limiteCredito: limiteCredito ? parseFloat(limiteCredito.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 5000, // Limite padrão para associados
            taxaRepasseMatriz: 0, // Associados não têm taxa de repasse
            dataVencimentoFatura: 10, // Padrão
            diaFechamentoFatura: 25, // Padrão
            planoId: planoId ? parseInt(planoId, 10) : 1, // Plano básico como padrão
            gerenteContaId: usuarioCriadorId ? parseInt(usuarioCriadorId, 10) : null,
            // Valores padrão para associados
            limiteUtilizado: 0,
            saldoPermuta: 0,
            saldoDinheiro: 0,
            limiteVendaMensal: 50000, // Limite menor para associados
            limiteVendaTotal: 200000, // Limite menor para associados
            limiteVendaEmpresa: 100000, // Limite menor para associados
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            dataDeAfiliacao: new Date(),
            permissoesEspecificas: JSON.stringify(["BASIC_OPERATIONS", "PROFILE_MANAGEMENT"])
          };

          novaConta = await prisma.conta.create({
            data: dadosConta,
          });

          console.log("✅ Conta de associado criada:", novaConta.idConta, novaConta.numeroConta);
        }

        return { usuario: novoUsuario, conta: novaConta };
      });

      // Buscar usuário criado com relacionamentos
      const usuarioCompleto = await prisma.usuarios.findUnique({
        where: { idUsuario: resultado.usuario.idUsuario },
        include: {
          categoria: true,
          subcategoria: true,
          conta: {
            include: {
              tipoDaConta: true,
              plano: true,
            }
          },
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

      // Enviar email de boas-vindas
      try {
        const destinatario = email;
        const assunto = "Bem-vindo à Plataforma RedeTrade!";
        
        let tipoUsuario = tipo || 'Usuário';
        const nomeCompleto = nome || nomeContato || 'Usuário';
        
        const corpo = `Olá ${nomeCompleto},

Bem-vindo à Plataforma RedeTrade! Agradecemos por escolher nossa plataforma para suas necessidades comerciais.

Você foi cadastrado como: ${tipoUsuario}
${resultado.conta ? `Número da conta: ${resultado.conta.numeroConta}` : ''}

Acesse sua conta usando as seguintes credenciais:
E-mail: ${email}
Senha: ${senha}

${nomeFantasia ? `Empresa: ${nomeFantasia}` : ''}
${razaoSocial ? `Razão Social: ${razaoSocial}` : ''}

Estamos entusiasmados em tê-lo a bordo. Se precisar de assistência ou tiver alguma dúvida, não hesite em entrar em contato conosco.

Atenciosamente,
Equipe RedeTrade`;

        await enviarEmail(destinatario, assunto, corpo);
        console.log("📧 Email de boas-vindas enviado para:", destinatario);
        
      } catch (emailError) {
        console.error("⚠️ Erro ao enviar email de boas-vindas:", emailError);
      }
      
      console.log("🎉 Criação concluída com sucesso!");
      
      return res.status(201).json({
        ...usuarioCompleto,
        senha: undefined, // Não retornar a senha na resposta
      });
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      console.error("❌ Stack trace:", error.stack);
      return res.status(500).json({ 
        error: "Erro interno do servidor.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
];

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

    if (usuariosAssociados.length < 1) {
      return res.status(404).json({ error: "Não foi possível encontrar os associados." });
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

    // Adicionar filtros baseados nos query params - BUSCA PARCIAL MELHORADA
    if (queryParams.nome) {
      const searchTerm = queryParams.nome.toString().trim();
      if (searchTerm) {
        filter["OR"] = [
          { nome: { contains: searchTerm, mode: 'insensitive' } },
          { nomeFantasia: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }
    
    // Manter compatibilidade com nomeFantasia separado se necessário
    if (queryParams.nomeFantasia && !queryParams.nome) {
      filter["nomeFantasia"] = { contains: queryParams.nomeFantasia.toString(), mode: 'insensitive' };
    }
    
    if (queryParams.razaoSocial) {
      filter["razaoSocial"] = queryParams.razaoSocial.toString();
    }
    
    if (queryParams.nomeContato) {
      filter["nomeContato"] = queryParams.nomeContato.toString();
    }
    
    if (queryParams.estado) {
      filter["estado"] = queryParams.estado.toString().trim();
    }
    
    if (queryParams.cidade) {
      filter["cidade"] = { contains: queryParams.cidade.toString().trim(), mode: 'insensitive' };
    }
    
    if (queryParams.usuarioCriadorId) {
      filter["usuarioCriadorId"] = parseInt(
        queryParams.usuarioCriadorId.toString()
      );
    }

    // NOVOS FILTROS: agência e conta
    if (queryParams.agencia) {
      // Vai ser adicionado ao objeto conta mais abaixo
    }
    if (queryParams.account) {
      // Vai ser adicionado ao objeto conta mais abaixo  
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

    // ADICIONAR FILTROS DE AGÊNCIA E CONTA AO OBJETO CONTA
    if (filter["conta"]) {
      if (queryParams.agencia) {
        filter["conta"]["nomeFranquia"] = { contains: queryParams.agencia.toString().trim(), mode: 'insensitive' };
      }
      if (queryParams.account) {
        filter["conta"]["numeroConta"] = { contains: queryParams.account.toString().trim(), mode: 'insensitive' };
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
      nextPage = `${req.protocol}://${req.get("host")}${req.baseUrl}?page=${nextPageNumber}&pageSize=${pageSize}`;
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