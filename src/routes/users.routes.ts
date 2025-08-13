// routes/users.routes.ts
import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import { enviarEmail, gerarToken } from "../utils/utils";
import * as jwt from "jsonwebtoken";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { 
  BuscarUsuariosParams, 
  buscarFranquiasPorMatriz, 
  criarUsuario, 
  getTipoDeContaUsuario, 
  listarUsuariosAssociados,
  uploadImagem 
} from "../controllers/users.controller";
import { checkBlocked, invalidateUserBlockCache } from "../middlewares/checkBlocked.middleware";
import { upload } from "../middlewares/upload"; // Importar o middleware de upload
import { authRateLimit, apiRateLimit, clearRateLimit } from "../middlewares/rateLimit.middleware"; // Rate limiting
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON

const userRouter = Router();

// Rota para upload de imagem separada
userRouter.post('/upload-imagem', upload.any(), uploadImagem);

// Rota para criar um usuário com upload de imagem
userRouter.post("/criar-usuario", 
  authRateLimit, // Rate limiting para criação de usuários
  /*verifyToken, checkBlocked, */
  criarUsuario // A função criarUsuario já tem o middleware de upload internamente
);

// Rota para listar todos os usuários com paginação
userRouter.get('/listar-usuarios', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      pageSize = 60,
      search,
      categoriaId,
      estado,
      cidade,
      agencia,
      account 
    } = req.query;

    
    // Validação e conversão de parâmetros
    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNumber = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 60));

    // Calcular o índice inicial do usuário com base na página e no tamanho da página
    const skip = (pageNumber - 1) * pageSizeNumber;

    // Construir filtros dinamicamente - ABORDAGEM COM AND/OR CORRIGIDA
    const whereClause: any = {
      AND: [
        // FILTRO OBRIGATÓRIO: Apenas usuários do tipo "Associado"
        {
          conta: {
            tipoDaConta: {
              tipoDaConta: "Associado"
            }
          }
        }
      ]
    };

    // Filtro por busca (nome ou nomeFantasia) - USANDO AND/OR
    if (search && typeof search === 'string' && search.trim()) {
      whereClause.AND.push({
        OR: [
          { nome: { contains: search.trim(), mode: 'insensitive' } },
          { nomeFantasia: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } }
        ]
      });
    }

    // Filtros adicionais - ADICIONANDO AO AND
    if (categoriaId && typeof categoriaId === 'string' && categoriaId !== '') {
      const catId = parseInt(categoriaId, 10);
      if (!isNaN(catId)) {
        whereClause.AND.push({ categoriaId: catId });
      }
    }

    if (estado && typeof estado === 'string' && estado.trim() && estado !== '') {
      whereClause.AND.push({ estado: estado.trim() });
    }

    if (cidade && typeof cidade === 'string' && cidade.trim() && cidade !== '') {
      whereClause.AND.push({ cidade: { contains: cidade.trim(), mode: 'insensitive' } });
    }

    // Filtros de agência e conta - atualizar o primeiro filtro de conta
    if (agencia && typeof agencia === 'string' && agencia.trim() && agencia !== '') {
      whereClause.AND[0].conta.nomeFranquia = { contains: agencia.trim(), mode: 'insensitive' };
    }

    if (account && typeof account === 'string' && account.trim() && account !== '') {
      whereClause.AND[0].conta.numeroConta = { contains: account.trim(), mode: 'insensitive' };
    }


    // Buscar os usuários com os relacionamentos desejados e aplicar a paginação + filtros - OTIMIZADO
    const usuarios = await prisma.usuarios.findMany({
      where: whereClause,
      include: {
        conta: {
          include: {
            gerenteConta: {
              select: {
                email: true,
                emailContato: true,
                nome: true,
                nomeContato: true,
                telefone: true,
                celular: true,
                site: true,
                idUsuario: true,
              }
            },
            tipoDaConta: true,
            plano: true,
          }
        },
        categoria: true,
        subcategoria: true,
        // Removidos relacionamentos pesados: contasGerenciadas, ofertas, transacoesComprador, transacoesVendedor, cobrancas
      },
      skip,
      take: pageSizeNumber,
    });

    // Contar total de usuários com os filtros aplicados
    const totalUsuarios = await prisma.usuarios.count({
      where: whereClause
    });


    // Omitir senha dos usuários na resposta
    const usuariosSemSenha = usuarios.map((usuario) => ({ 
      ...usuario, 
      senha: undefined,
      tokenResetSenha: undefined
    }));

    return res.status(200).json({
      data: usuariosSemSenha,
      meta: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total: totalUsuarios,
        totalPages: Math.ceil(totalUsuarios / pageSizeNumber),
        hasNext: pageNumber < Math.ceil(totalUsuarios / pageSizeNumber),
        hasPrev: pageNumber > 1,
        // Debug: mostrar filtros aplicados na resposta
        appliedFilters: {
          search: (typeof search === 'string') ? search : null,
          categoriaId: (typeof categoriaId === 'string') ? categoriaId : null,
          estado: (typeof estado === 'string') ? estado : null,
          cidade: (typeof cidade === 'string') ? cidade : null,
          agencia: (typeof agencia === 'string') ? agencia : null,
          account: (typeof account === 'string') ? account : null
        }
      },
    });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota para listar gerentes - ADICIONE ANTES da rota '/buscar-usuario/:id'
userRouter.get('/listar-gerentes', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      pageSize = 60,
      search,
      estado,
      cidade 
    } = req.query;

    
    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNumber = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 60));
    const skip = (pageNumber - 1) * pageSizeNumber;

    // Filtros para gerentes
    const whereClause: any = {
      AND: [
        { tipo: "Gerente" } // FILTRO PRINCIPAL
      ]
    };

    // Filtro de busca
    if (search && typeof search === 'string' && search.trim()) {
      whereClause.AND.push({
        OR: [
          { nome: { contains: search.trim(), mode: 'insensitive' } },
          { nomeFantasia: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } }
        ]
      });
    }

    // Filtro de estado
    if (estado && typeof estado === 'string' && estado.trim()) {
      whereClause.AND.push({ estado: estado.trim() });
    }

    // Filtro de cidade
    if (cidade && typeof cidade === 'string' && cidade.trim()) {
      whereClause.AND.push({ 
        cidade: { contains: cidade.trim(), mode: 'insensitive' } 
      });
    }

    // Buscar gerentes
    const gerentes = await prisma.usuarios.findMany({
      where: whereClause,
      include: {
        conta: {
          include: {
            tipoDaConta: true,
            plano: true,
          }
        },
        categoria: true,
        subcategoria: true,
        matriz: {
          select: {
            nome: true,
            nomeFantasia: true,
            idUsuario: true,
          }
        },
        usuarioCriador: {
          select: {
            nome: true,
            nomeFantasia: true,
            idUsuario: true,
          }
        }
      },
      skip,
      take: pageSizeNumber,
      orderBy: { nome: 'asc' }
    });

    // Contar total
    const totalGerentes = await prisma.usuarios.count({ where: whereClause });


    // Remover dados sensíveis
    const gerentesSemSenha = gerentes.map((gerente) => ({
      ...gerente,
      senha: undefined,
      tokenResetSenha: undefined
    }));

    return res.status(200).json({
      data: gerentesSemSenha,
      meta: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total: totalGerentes,
        totalPages: Math.ceil(totalGerentes / pageSizeNumber),
        hasNext: pageNumber < Math.ceil(totalGerentes / pageSizeNumber),
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar gerentes:', error);
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

// Rota para atualizar usuário completo - VERSÃO LIMPA

userRouter.put("/atualizar-usuario-completo/:id", 
  upload.any(), 
  verifyToken, 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      

      // Extrair todos os dados do body
      const dadosRecebidos = { ...req.body };
      
      // Se tem arquivo de imagem, adicionar à estrutura
      const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'imagem') : null;
      if (imagemFile) {
        dadosRecebidos.imagem = `/uploads/images/${imagemFile.filename}`;
      }

      // MAPEAMENTO CORRETO BASEADO NO SCHEMA REAL
      const camposUsuario = [
        // Campos da tabela Usuarios (conforme schema)
        'nome', 'cpf', 'email', 'senha', 'imagem', 
        'statusConta', 'reputacao', 'razaoSocial', 'nomeFantasia', 'cnpj',
        'inscEstadual', 'inscMunicipal', 'mostrarNoSite', 'descricao', 'tipo',
        'tipoDeMoeda', 'status', 'restricao', 'nomeContato', 'telefone', 'celular',
        'emailContato', 'emailSecundario', 'site', 'logradouro', 'numero', 'cep',
        'complemento', 'bairro', 'cidade', 'estado', 'regiao', 
        'aceitaOrcamento', 'aceitaVoucher', 'tipoOperacao',
        'categoriaId', 'subcategoriaId', 'permissoesDoUsuario', 'bloqueado',
        'tokenResetSenha',
        // CONFIRMADO NO SCHEMA: taxaComissaoGerente está na tabela Usuarios (linha 72)
        'taxaComissaoGerente'
      ];
      
      const camposConta = [
        // Campos da tabela Conta (conforme schema)
        'taxaRepasseMatriz', 'limiteCredito', 'limiteUtilizado', 'limiteDisponivel',
        'saldoPermuta', 'saldoDinheiro', 'limiteVendaMensal', 'limiteVendaTotal', 
        'limiteVendaEmpresa', 'valorVendaMensalAtual', 'valorVendaTotalAtual',
        'diaFechamentoFatura', 'numeroConta', 'dataDeAfiliacao', 'nomeFranquia',
        'tipoContaId', 'usuarioId', 'planoId', 'gerenteContaId', 'permissoesEspecificas',
        // CONFIRMADO NO SCHEMA: dataVencimentoFatura está na tabela Conta (linha 89)
        'dataVencimentoFatura'
      ];
      
      const dadosUsuario: any = {};
      const dadosConta: any = {};
      
      // Separar campos
      Object.keys(dadosRecebidos).forEach(key => {
        if (key === 'taxaGerente') {
          // MAPEAMENTO: taxaGerente -> taxaComissaoGerente (tabela Usuarios)
          dadosUsuario['taxaComissaoGerente'] = dadosRecebidos[key];
        } else if (key === 'gerente') {
          // MAPEAMENTO: gerente -> gerenteContaId (tabela Conta)
          dadosConta['gerenteContaId'] = dadosRecebidos[key];
        } else if (camposUsuario.includes(key)) {
          dadosUsuario[key] = dadosRecebidos[key];
        } else if (camposConta.includes(key)) {
          dadosConta[key] = dadosRecebidos[key];
        } else {
        }
      });


      // Remover duplicações no tipo
      if (Array.isArray(dadosUsuario.tipo)) {
        dadosUsuario.tipo = dadosUsuario.tipo[0];
      }

      // Usar transação
      const resultado = await prisma.$transaction(async (prisma) => {
        // Verificar se o usuário existe
        const usuarioExiste = await prisma.usuarios.findUnique({
          where: { idUsuario: parseInt(id, 10) },
          include: { conta: true }
        });

        if (!usuarioExiste) {
          throw new Error("Usuário não encontrado");
        }


        // Atualizar usuário se há dados
        let usuarioAtualizado = usuarioExiste;
        if (Object.keys(dadosUsuario).length > 0) {
          const dadosProcessados: any = { ...dadosUsuario };
          
          // Converter tipos conforme schema
          if (dadosProcessados.numero && dadosProcessados.numero !== '') {
            dadosProcessados.numero = parseInt(dadosProcessados.numero, 10); // Int no schema
          }
          if (dadosProcessados.tipoOperacao && dadosProcessados.tipoOperacao !== '') {
            dadosProcessados.tipoOperacao = parseInt(dadosProcessados.tipoOperacao, 10); // Int no schema
          }
          if (dadosProcessados.reputacao && dadosProcessados.reputacao !== '') {
            dadosProcessados.reputacao = parseFloat(dadosProcessados.reputacao); // Float no schema
          }
          if (dadosProcessados.taxaComissaoGerente && dadosProcessados.taxaComissaoGerente !== '') {
            dadosProcessados.taxaComissaoGerente = parseInt(dadosProcessados.taxaComissaoGerente, 10); // Int no schema
          }
          if (dadosProcessados.categoriaId && dadosProcessados.categoriaId !== '') {
            dadosProcessados.categoriaId = parseInt(dadosProcessados.categoriaId, 10);
          }
          if (dadosProcessados.subcategoriaId && dadosProcessados.subcategoriaId !== '') {
            dadosProcessados.subcategoriaId = parseInt(dadosProcessados.subcategoriaId, 10);
          }
          
          // Converter booleanos conforme schema
          ['aceitaOrcamento', 'aceitaVoucher', 'statusConta', 'mostrarNoSite', 'status', 'bloqueado'].forEach(campo => {
            if (dadosProcessados[campo] !== undefined) {
              dadosProcessados[campo] = dadosProcessados[campo] === 'true' || dadosProcessados[campo] === true;
            }
          });
          
          // Remover campos vazios
          Object.keys(dadosProcessados).forEach(key => {
            if (dadosProcessados[key] === '' || dadosProcessados[key] === undefined || dadosProcessados[key] === 'undefined') {
              delete dadosProcessados[key];
            }
          });
          

          usuarioAtualizado = await prisma.usuarios.update({
            where: { idUsuario: parseInt(id, 10) },
            data: dadosProcessados,
          }) as any;
          
        }

        // Atualizar conta se há dados e conta existe
        let contaAtualizada = usuarioExiste.conta;
        if (Object.keys(dadosConta).length > 0 && usuarioExiste.conta) {
          const dadosContaProcessados: any = { ...dadosConta };
          
          // Converter tipos conforme schema da tabela Conta
          // Float fields
          ['limiteCredito', 'limiteUtilizado', 'limiteDisponivel', 'saldoPermuta', 'saldoDinheiro',
           'limiteVendaMensal', 'limiteVendaTotal', 'limiteVendaEmpresa', 
           'valorVendaMensalAtual', 'valorVendaTotalAtual'].forEach(campo => {
            if (dadosContaProcessados[campo]) {
              let valor = dadosContaProcessados[campo].toString().replace(/[^\d,.-]/g, '');
              valor = valor.replace(',', '.');
              dadosContaProcessados[campo] = parseFloat(valor) || 0;
            }
          });
          
          // Int fields
          ['taxaRepasseMatriz', 'diaFechamentoFatura', 'dataVencimentoFatura', 
           'tipoContaId', 'usuarioId', 'planoId', 'gerenteContaId'].forEach(campo => {
            if (dadosContaProcessados[campo] && dadosContaProcessados[campo] !== '') {
              dadosContaProcessados[campo] = parseInt(dadosContaProcessados[campo], 10);
            }
          });
          
          // Remover campos vazios
          Object.keys(dadosContaProcessados).forEach(key => {
            if (dadosContaProcessados[key] === '' || dadosContaProcessados[key] === undefined || dadosContaProcessados[key] === 'undefined') {
              delete dadosContaProcessados[key];
            }
          });
          

          contaAtualizada = await prisma.conta.update({
            where: { idConta: usuarioExiste.conta.idConta },
            data: dadosContaProcessados,
          });
          
        }

        return { usuario: usuarioAtualizado, conta: contaAtualizada };
      });

      // Resposta final
      const resposta = {
        ...resultado.usuario,
        senha: undefined,
        tokenResetSenha: undefined,
        conta: resultado.conta
      };

      
      return res.status(200).json(resposta);
    } catch (error: any) {
      console.error('❌ === ERRO NA ATUALIZAÇÃO ===');
      console.error('❌ Erro:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ === FIM ERRO ===');
      
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Nova rota para atualizar usuário e conta de forma transacional - ATUALIZADA COM UPLOAD
userRouter.put("/atualizar-usuario-completo/:id", 
  upload.any(), // Middleware de upload flexível
  verifyToken, 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let { dadosUsuario, dadosConta } = req.body;

      // Se uma nova imagem foi enviada, adicionar aos dados do usuário
      const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'imagem') : null;
      if (imagemFile) {
        if (!dadosUsuario) dadosUsuario = {};
        dadosUsuario.imagem = `/uploads/images/${imagemFile.filename}`;
      }


      // Usar transação para garantir consistência
      const resultado = await prisma.$transaction(async (prisma) => {
        // Verificar se o usuário existe
        const usuarioExiste = await prisma.usuarios.findUnique({
          where: { idUsuario: parseInt(id, 10) },
          include: { conta: true }
        });

        if (!usuarioExiste) {
          throw new Error("Usuário não encontrado");
        }

        // Atualizar dados do usuário se fornecidos
        let usuarioAtualizado = usuarioExiste;
        if (dadosUsuario && Object.keys(dadosUsuario).length > 0) {
          usuarioAtualizado = await prisma.usuarios.update({
            where: { idUsuario: parseInt(id, 10) },
            data: dadosUsuario,
          }) as any;
        }

        // Atualizar dados da conta se fornecidos e conta existir
        let contaAtualizada = usuarioExiste.conta;
        if (dadosConta && Object.keys(dadosConta).length > 0 && usuarioExiste.conta) {
          contaAtualizada = await prisma.conta.update({
            where: { idConta: usuarioExiste.conta.idConta },
            data: dadosConta,
          });
        }

        return { usuario: usuarioAtualizado, conta: contaAtualizada };
      });

      // Remover dados sensíveis da resposta
      const resposta = {
        ...resultado.usuario,
        senha: undefined,
        tokenResetSenha: undefined,
        conta: resultado.conta
      };

      return res.status(200).json(resposta);
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário completo:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor." 
      });
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

userRouter.get('/buscar-usuario-params', BuscarUsuariosParams);

// Rota para bloquear usuário (SEM checkBlocked - Matriz pode estar bloqueado)
userRouter.post('/bloquear-usuario/:id', 
  apiRateLimit, // Mudança: usar apiRateLimit (100 req/15min) ao invés de authRateLimit (10 req/15min)
  verifyToken, 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const requestUserId = res.locals.userId; // ID do usuário que está fazendo a requisição

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID do usuário inválido." });
      }

      // Verificar se o usuário que está fazendo a requisição tem permissão (deve ser Matriz)
      const usuarioRequisitante = await prisma.usuarios.findUnique({
        where: { idUsuario: requestUserId },
        include: {
          conta: {
            include: {
              tipoDaConta: true
            }
          }
        }
      });

      if (!usuarioRequisitante) {
        return res.status(404).json({ error: 'Usuário requisitante não encontrado.' });
      }

      // Verificar se o usuário é Matriz - APENAS Matriz pode bloquear outros usuários
      const isMatriz = usuarioRequisitante.tipo === 'Matriz' || 
                      usuarioRequisitante.conta?.tipoDaConta?.tipoDaConta === 'Matriz';
      
      if (!isMatriz) {
        return res.status(403).json({ 
          error: `Acesso negado. Apenas usuários Matriz podem bloquear outros usuários. Seu tipo: ${usuarioRequisitante.tipo}` 
        });
      }

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuarios.findUnique({
        where: { idUsuario: userId },
        select: { idUsuario: true, nome: true, bloqueado: true }
      });

      if (!usuarioExistente) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (usuarioExistente.bloqueado) {
        return res.status(400).json({ error: 'Usuário já está bloqueado.' });
      }

      // Bloquear o usuário
      const usuarioAtualizado = await prisma.usuarios.update({
        where: { idUsuario: userId },
        data: { bloqueado: true },
        select: { idUsuario: true, nome: true, bloqueado: true }
      });

      // Invalidar cache do middleware de bloqueio
      invalidateUserBlockCache(userId);

        
      return res.status(200).json({
        message: 'Usuário bloqueado com sucesso.',
        usuario: usuarioAtualizado
      });

    } catch (error) {
      console.error('❌ Erro ao bloquear usuário:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor.' 
      });
    }
  }
);

// Rota para desbloquear usuário (SEM checkBlocked - Matriz pode estar bloqueado)
userRouter.post('/desbloquear-usuario/:id', 
  apiRateLimit, // Mudança: usar apiRateLimit (100 req/15min) ao invés de authRateLimit (10 req/15min)
  verifyToken, 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const requestUserId = res.locals.userId; // ID do usuário que está fazendo a requisição

      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "ID do usuário inválido." });
      }

      // Verificar se o usuário que está fazendo a requisição tem permissão (deve ser Matriz)
      const usuarioRequisitante = await prisma.usuarios.findUnique({
        where: { idUsuario: requestUserId },
        include: {
          conta: {
            include: {
              tipoDaConta: true
            }
          }
        }
      });

      if (!usuarioRequisitante) {
        return res.status(404).json({ error: 'Usuário requisitante não encontrado.' });
      }

      // Verificar se o usuário é Matriz - APENAS Matriz pode desbloquear outros usuários
      const isMatriz = usuarioRequisitante.tipo === 'Matriz' || 
                      usuarioRequisitante.conta?.tipoDaConta?.tipoDaConta === 'Matriz';
      
      if (!isMatriz) {
        return res.status(403).json({ 
          error: `Acesso negado. Apenas usuários Matriz podem desbloquear outros usuários. Seu tipo: ${usuarioRequisitante.tipo}` 
        });
      }

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuarios.findUnique({
        where: { idUsuario: userId },
        select: { idUsuario: true, nome: true, bloqueado: true }
      });

      if (!usuarioExistente) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (!usuarioExistente.bloqueado) {
        return res.status(400).json({ error: 'Usuário não está bloqueado.' });
      }

      // Desbloquear o usuário
      const usuarioAtualizado = await prisma.usuarios.update({
        where: { idUsuario: userId },
        data: { bloqueado: false },
        select: { idUsuario: true, nome: true, bloqueado: true }
      });

      // Invalidar cache do middleware de bloqueio
      invalidateUserBlockCache(userId);

        
      return res.status(200).json({
        message: 'Usuário desbloqueado com sucesso.',
        usuario: usuarioAtualizado
      });

    } catch (error) {
      console.error('❌ Erro ao desbloquear usuário:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor.' 
      });
    }
  }
);

// Rota para limpar rate limit (APENAS PARA DESENVOLVIMENTO)
if (process.env.NODE_ENV === 'development') {
  userRouter.post('/clear-rate-limit', (req: Request, res: Response) => {
    clearRateLimit();
    res.json({ message: 'Rate limit cache limpo com sucesso' });
  });
}

export default userRouter;