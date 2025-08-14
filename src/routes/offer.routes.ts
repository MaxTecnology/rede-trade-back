// offer.routes.ts
import { Request, Response, Router } from "express";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { upload } from "../middlewares/upload"; // Importar o middleware de upload
import { apiRateLimit, strictRateLimit } from "../middlewares/rateLimit.middleware"; // Rate limiting
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON
const offerRouter = Router();

// Rota para upload de imagem separada
offerRouter.post('/upload-imagem', upload.any(), async (req: Request, res: Response) => {
  try {
    const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'image') : null;
    
    if (!imagemFile) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const imagePath = `/uploads/images/${imagemFile.filename}`;
    
    res.status(200).json({
      message: 'Upload realizado com sucesso',
      imagePath: imagePath
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para cadastrar uma nova oferta - ATUALIZADA COM UPLOAD
offerRouter.post(
  "/criar-oferta",
  strictRateLimit, // Rate limiting para criação de ofertas
  upload.any(), // Middleware de upload flexível
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      // Logs removidos para produção
      const userId = res.locals.userId; // Obter userId do token

      // Obter dados da oferta do corpo da requisição
      let {
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

      // Buscar o usuário que está criando a oferta para obter seu tipo e nomeFantasia
      const criadorOferta = await prisma.usuarios.findUnique({
        where: { idUsuario: userId },
        select: { idUsuario: true, nomeFantasia: true, tipo: true }
      });

      if (!criadorOferta) {
        return res.status(404).json({ error: 'Usuário criador da oferta não encontrado.' });
      }

      // Se o usuário criador for uma Franquia, preencher idFranquia e nomeFranquia
      if (criadorOferta.tipo === 'Franquia') {
        idFranquia = criadorOferta.idUsuario;
        nomeFranquia = criadorOferta.nomeFantasia;
      }

      // Se uma nova imagem foi enviada, usar seu caminho
      const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'imagem') : null;
      if (imagemFile) {
        const imagePath = `/uploads/images/${imagemFile.filename}`;
        imagens = [imagePath]; // Array com a nova imagem
      }

      // Definir status como true por padrão, a menos que seja explicitamente false
      const finalStatus = (status === 'false' || status === false) ? false : true;

      // Verificando duplicatas...
      // Verificar se já existe uma oferta com o mesmo nome e mesmo valor
      const ofertaExistente = await prisma.oferta.findFirst({
        where: { titulo, valor: parseFloat(valor) },
      });

      if (ofertaExistente) {
        // Oferta duplicada encontrada
        return res.status(400).json({
          error: "Já existe uma oferta com o mesmo nome e valor.",
        });
      }
      // Criando oferta no banco...

      const novaOferta = await prisma.oferta.create({
        data: {
          idFranquia: idFranquia ? parseInt(idFranquia) : null, // Garantir que seja null se não houver
          nomeFranquia,
          titulo,
          tipo,
          status: finalStatus,
          descricao,
          quantidade: parseInt(quantidade),
          valor: parseFloat(valor),
          limiteCompra: parseInt(limiteCompra),
          vencimento: new Date(vencimento),
          cidade,
          estado,
          retirada,
          obs,
          imagens,
          usuarioId: parseInt(usuarioId),
          nomeUsuario,
          categoriaId: parseInt(categoriaId),
          subcontaId: subcontaId ? parseInt(subcontaId) : null,
        },
      });

      // Oferta criada com sucesso
      res.status(201).json(novaOferta);
    } catch (error: any) {
      console.error('❌ DEBUG TEMPORÁRIO: Erro ao cadastrar oferta:', error);
      console.error('❌ DEBUG TEMPORÁRIO: Erro detalhado:', error.message);
      console.error('❌ DEBUG TEMPORÁRIO: Stack:', error.stack);
      
      // Se for erro do Prisma, mostrar detalhes
      if (error.code) {
        console.error('❌ DEBUG TEMPORÁRIO: Código do erro:', error.code);
        console.error('❌ DEBUG TEMPORÁRIO: Meta do erro:', error.meta);
      }
      
      res.status(500).json({ error: "Erro ao cadastrar oferta: " + error.message });
    }
  }
);

// Rota para listar ofertas com filtros hierárquicos
offerRouter.get('/listar-ofertas', apiRateLimit, verifyToken, async (req: Request, res: Response) => {
  try {
    // Requisição para listar ofertas
    const userId = res.locals.userId; // Do middleware verifyToken
    const { 
      page = 1, 
      limit = 10,
      titulo,
      cidade,
      nomeCategoria,
      tipo,
      agencia,
      usuarioId: filtroUsuarioId // Novo filtro para buscar ofertas de um usuário específico
    } = req.query;

    // Buscar o usuário logado com sua hierarquia
    const usuarioLogado = await prisma.usuarios.findUnique({
      where: { idUsuario: userId },
      include: {
        matriz: true,
        usuarioCriador: true,
        conta: { include: { tipoDaConta: true } }
      }
    });

    if (!usuarioLogado) {
      console.error('❌ Erro: Usuário não encontrado para userId:', userId);
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }


    let whereClause: any = {};

    // Se um filtro de usuarioId for passado, ele tem prioridade.
    // Usado para a página "Minhas Ofertas".
    if (filtroUsuarioId) {
      whereClause.usuarioId = parseInt(filtroUsuarioId.toString());
    } else {
      // Lógica de hierarquia padrão para a página principal de ofertas
      if (usuarioLogado.tipo === 'Matriz') {
        // Matriz vê tudo (nenhum filtro de usuarioId específico)
      } else if (usuarioLogado.tipo === 'Gerente') {
        const matrizId = usuarioLogado.matrizId;
        
        // Buscar todos os usuários que este gerente pode ver (seus subordinados diretos e indiretos)
        const usuariosVisiveis = await prisma.usuarios.findMany({
          where: {
            OR: [
              { idUsuario: userId }, // O próprio gerente
              { usuarioCriadorId: userId }, // Subordinados diretos
              { // Subordinados indiretos (associados de franquias criadas por este gerente)
                usuarioCriador: {
                  usuarioCriadorId: userId
                }
              }
            ]
          },
          select: { idUsuario: true }
        });

        const idsPermitidos = [
          matrizId, // Matriz
          ...usuariosVisiveis.map(u => u.idUsuario) // Gerente e todos os seus subordinados
        ].filter(id => id != null);
        whereClause.usuarioId = { in: idsPermitidos };

      } else if (usuarioLogado.tipo === 'Franquia') {
        const matrizId = usuarioLogado.matrizId;
        const gerenteId = usuarioLogado.usuarioCriadorId;
        
        // Buscar todos os usuários que esta franquia pode ver (seus associados)
        const usuariosVisiveis = await prisma.usuarios.findMany({
          where: {
            OR: [
              { idUsuario: userId }, // A própria franquia
              { usuarioCriadorId: userId } // Associados diretos
            ]
          },
          select: { idUsuario: true }
        });

        const idsPermitidos = [
          matrizId,
          gerenteId,
          ...usuariosVisiveis.map(u => u.idUsuario)
        ].filter(id => id != null);
        whereClause.usuarioId = { in: idsPermitidos };

      } else { // Associado
        const matrizId = usuarioLogado.matrizId;
        const criadorId = usuarioLogado.usuarioCriadorId;
        const idsPermitidos = [matrizId, criadorId, userId].filter(id => id != null);
        whereClause.usuarioId = { in: idsPermitidos };
      }
    }

    // Adicionar filtros de busca específicos das ofertas
    let filtrosOferta: any = {};

    // Filtro por título
    if (titulo) {
      filtrosOferta.titulo = {
        contains: titulo.toString(),
        mode: 'insensitive'
      };
    }

    // Filtro por cidade
    if (cidade) {
      filtrosOferta.cidade = {
        contains: cidade.toString(),
        mode: 'insensitive'
      };
    }

    // Filtro por tipo
    if (tipo) {
      filtrosOferta.tipo = {
        contains: tipo.toString(),
        mode: 'insensitive'
      };
    }

    // Filtro por categoria (nome da categoria)
    if (nomeCategoria) {
      filtrosOferta.categoria = {
        nomeCategoria: {
          contains: nomeCategoria.toString(),
          mode: 'insensitive'
        }
      };
    }

    // Filtro por agência (nomeFranquia do usuário)
    if (agencia) {
      filtrosOferta.usuario = {
        nomeFantasia: {
          contains: agencia.toString(),
          mode: 'insensitive'
        }
      };
    }

    // Adicionar filtro para ofertas ativas no backend (melhor performance)
    const whereClauseComStatus = {
      ...whereClause,
      ...filtrosOferta,
      status: true, // Apenas ofertas ativas
      vencimento: {
        gt: new Date() // Apenas ofertas não vencidas
      }
    };


    // Executando consulta de ofertas
    
    const ofertas = await prisma.oferta.findMany({
      where: whereClauseComStatus,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      select: {
        idOferta: true,
        titulo: true,
        tipo: true,
        status: true,
        descricao: true,
        quantidade: true,
        valor: true,
        vencimento: true,
        cidade: true,
        estado: true,
        imagens: true,
        createdAt: true,
        categoria: {
          select: {
            idCategoria: true,
            nomeCategoria: true,
          },
        },
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            tipo: true,
            nomeFantasia: true, // Adicionado nomeFantasia
          },
        },
        subconta: {
          select: {
            idSubContas: true,
            nome: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalOfertas = await prisma.oferta.count({ where: whereClauseComStatus });
    
    // Consulta executada com sucesso

    // Criar objeto meta com informações de paginação
    const meta = {
      total: totalOfertas,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalOfertas / Number(limit)),
      hasNext: Number(page) * Number(limit) < totalOfertas,
      hasPrev: Number(page) > 1
    };

    res.status(200).json({ ofertas, meta });
  } catch (error: any) { // Adicionado : any para tipagem do erro
    console.error('❌ Erro ao listar ofertas (catch final):', error.message || error);
    res.status(500).json({ error: 'Erro ao listar ofertas.' });
  }
});

// ROTA DE DEBUG TEMPORÁRIA - REMOVER EM PRODUÇÃO
offerRouter.get('/debug-hierarquia', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;

    // Buscar usuário logado
    const usuarioLogado = await prisma.usuarios.findUnique({
      where: { idUsuario: userId },
      select: { idUsuario: true, nome: true, tipo: true, matrizId: true, usuarioCriadorId: true }
    });

    // Buscar todas as ofertas
    const todasOfertas = await prisma.oferta.findMany({
      select: {
        idOferta: true,
        titulo: true,
        usuarioId: true,
        usuario: { select: { nome: true, tipo: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Buscar matriz se existir
    let matriz = null;
    if (usuarioLogado?.matrizId) {
      matriz = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioLogado.matrizId },
        select: { idUsuario: true, nome: true, tipo: true }
      });
    }

    res.status(200).json({
      usuarioLogado,
      matriz,
      totalOfertas: todasOfertas.length,
      ofertas: todasOfertas,
      message: "Debug de hierarquia - REMOVER EM PRODUÇÃO"
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro no debug.' });
  }
});

// Rota para atualizar uma oferta - ATUALIZADA COM UPLOAD
offerRouter.put(
  "/atualizar-oferta/:ofertaId",
  upload.any(), // Middleware de upload flexível
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const ofertaId = parseInt(req.params.ofertaId, 10);
      let {
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
        categoria,
        imagens
      } = req.body;

      // Se uma nova imagem foi enviada, usar seu caminho
      let updateData: any = {
        titulo,
        tipo,
        status: status === 'true' || status === true,
        descricao,
        quantidade: parseInt(quantidade),
        valor: parseFloat(valor),
        limiteCompra: parseInt(limiteCompra),
        vencimento: new Date(vencimento),
        cidade,
        estado,
        retirada,
        obs,
      };

      // Adicionar categoria se fornecida
      if (categoria) {
        updateData.categoriaId = parseInt(categoria);
      }

      // Se uma nova imagem foi enviada, atualizar o array de imagens
      const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'imagem') : null;
      if (imagemFile) {
        const imagePath = `/uploads/images/${imagemFile.filename}`;
        updateData.imagens = [imagePath]; // Array com a nova imagem
      }

      const ofertaAtualizada = await prisma.oferta.update({
        where: { idOferta: ofertaId },
        data: updateData,
      });

      res.status(200).json(ofertaAtualizada);
    } catch (error) {
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
        categoria: {
          select: {
            idCategoria: true,
            nomeCategoria: true,
          },
        },
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
        transacoes: {
          select: {
            idTransacao: true,
            codigo: true,
            valorRt: true,
            status: true,
            createdAt: true,
            nomeComprador: true,
            nomeVendedor: true,
          },
          take: 50, // Limitar transações para evitar sobrecarga
          orderBy: {
            createdAt: 'desc'
          }
        },
      },
    });

    if (!oferta) {
      return res.status(404).json({ error: 'Oferta não encontrada.' });
    }
    res.status(200).json(oferta);
  } catch (error) {
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
    res.status(500).json({ error: 'Erro ao buscar transações da oferta.' });
  }
});

export default offerRouter;