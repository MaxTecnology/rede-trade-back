// offer.routes.ts
import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { upload } from "../middlewares/upload"; // Importar o middleware de upload

const prisma = new PrismaClient();
const offerRouter = Router();

// Rota para upload de imagem separada
offerRouter.post('/upload-imagem', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const imagePath = `/uploads/images/${req.file.filename}`;
    
    console.log("📸 Upload de imagem de oferta realizado:", req.file.filename);

    res.status(200).json({
      message: 'Upload realizado com sucesso',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para cadastrar uma nova oferta - ATUALIZADA COM UPLOAD
offerRouter.post(
  "/criar-oferta",
  upload.single('imagem'), // Middleware de upload adicionado
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
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

      // Se uma nova imagem foi enviada, usar seu caminho
      if (req.file) {
        const imagePath = `/uploads/images/${req.file.filename}`;
        imagens = [imagePath]; // Array com a nova imagem
        console.log("📸 Nova imagem da oferta enviada:", req.file.filename);
      }

      // Verificar se já existe uma oferta com o mesmo nome e mesmo valor
      const ofertaExistente = await prisma.oferta.findFirst({
        where: { titulo, valor: parseFloat(valor) },
      });

      if (ofertaExistente) {
        return res.status(400).json({
          error: "Já existe uma oferta com o mesmo nome e valor.",
        });
      }

      const novaOferta = await prisma.oferta.create({
        data: {
          idFranquia: parseInt(idFranquia),
          nomeFranquia,
          titulo,
          tipo,
          status: status === 'true',
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

      console.log("✅ Oferta criada com sucesso:", novaOferta.titulo);
      res.status(201).json(novaOferta);
    } catch (error) {
      console.error("❌ Erro ao cadastrar oferta:", error);
      res.status(500).json({ error: "Erro ao cadastrar oferta." });
    }
  }
);

// Rota para listar ofertas com filtros hierárquicos
offerRouter.get('/listar-ofertas', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId; // Do middleware verifyToken
    const { page = 1, limit = 10 } = req.query;

    console.log('🔍 Usuário solicitando ofertas:', userId);

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
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    console.log('👤 Tipo de usuário:', usuarioLogado.tipo);

    // Determinar filtros baseado no tipo de usuário
    let whereClause = {};

    if (usuarioLogado.tipo === 'Matriz') {
      // Matriz vê todas as ofertas
      console.log('👑 Usuário Matriz - vê todas as ofertas');
      whereClause = {};
    } else if (usuarioLogado.tipo === 'Gerente') {
      // Gerente vê ofertas da matriz + suas próprias + subordinados
      console.log('🏢 Usuário Gerente - implementando filtros hierárquicos');
      
      const matrizId = usuarioLogado.matrizId;
      
      // Buscar usuários subordinados ao gerente
      const usuariosSubordinados = await prisma.usuarios.findMany({
        where: { usuarioCriadorId: userId },
        select: { idUsuario: true }
      });
      
      const idsPermitidos = [
        matrizId, // Matriz
        userId,   // Próprio gerente
        ...usuariosSubordinados.map(u => u.idUsuario) // Subordinados
      ].filter(id => id !== null); // Remover nulls

      console.log('🎯 IDs permitidos para gerente:', idsPermitidos);

      whereClause = {
        usuarioId: { in: idsPermitidos }
      };
    } else if (usuarioLogado.tipo === 'Franquia') {
      // Franquia vê ofertas da matriz + gerente + suas + associados
      console.log('🏪 Usuário Franquia - implementando filtros hierárquicos');
      
      const matrizId = usuarioLogado.matrizId;
      const gerenteId = usuarioLogado.usuarioCriadorId;
      
      const associados = await prisma.usuarios.findMany({
        where: { usuarioCriadorId: userId },
        select: { idUsuario: true }
      });

      const idsPermitidos = [
        matrizId,
        gerenteId,
        userId,
        ...associados.map(a => a.idUsuario)
      ].filter(id => id !== null); // Remover nulls

      console.log('🎯 IDs permitidos para franquia:', idsPermitidos);

      whereClause = {
        usuarioId: { in: idsPermitidos }
      };
    } else {
      // Associado vê apenas suas ofertas + da cadeia hierárquica superior
      console.log('👤 Usuário Associado - implementando filtros hierárquicos');
      
      const matrizId = usuarioLogado.matrizId;
      const criadorId = usuarioLogado.usuarioCriadorId;

      const idsPermitidos = [matrizId, criadorId, userId].filter(id => id !== null);

      console.log('🎯 IDs permitidos para associado:', idsPermitidos);

      whereClause = {
        usuarioId: { in: idsPermitidos }
      };
    }

    // Adicionar filtro para ofertas ativas no backend (melhor performance)
    const whereClauseComStatus = {
      ...whereClause,
      status: true, // Apenas ofertas ativas
      vencimento: {
        gt: new Date() // Apenas ofertas não vencidas
      }
    };

    console.log('🔍 Where clause final:', whereClauseComStatus);

    const ofertas = await prisma.oferta.findMany({
      where: whereClauseComStatus,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      include: {
        categoria: true,
        usuario: {
          select: {
            idUsuario: true,
            nome: true,
            email: true,
            telefone: true,
            tipo: true,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalOfertas = await prisma.oferta.count({ where: whereClauseComStatus });

    const totalPages = Math.ceil(totalOfertas / Number(limit));

    const meta = {
      totalOfertas,
      totalPages,
      currentPage: Number(page),
      usuarioTipo: usuarioLogado.tipo,
      usuarioId: userId
    };

    console.log(`✅ Retornando ${ofertas.length} ofertas para usuário ${usuarioLogado.tipo}`);

    // Debug: Mostrar informações das ofertas retornadas
    if (ofertas.length > 0) {
      console.log('📋 Primeiras ofertas encontradas:');
      ofertas.slice(0, 3).forEach((oferta, index) => {
        console.log(`  ${index + 1}. "${oferta.titulo}" - Criada por: ${oferta.usuario?.nome || 'N/A'} (ID: ${oferta.usuarioId})`);
      });
    } else {
      console.log('❌ Nenhuma oferta encontrada com os filtros aplicados');
    }

    res.status(200).json({ ofertas, meta });
  } catch (error) {
    console.error('❌ Erro ao listar ofertas:', error);
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
    console.error('❌ Erro no debug:', error);
    res.status(500).json({ error: 'Erro no debug.' });
  }
});

// Rota para atualizar uma oferta - ATUALIZADA COM UPLOAD
offerRouter.put(
  "/atualizar-oferta/:ofertaId",
  upload.single('imagem'), // Middleware de upload adicionado
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
      if (req.file) {
        const imagePath = `/uploads/images/${req.file.filename}`;
        updateData.imagens = [imagePath]; // Array com a nova imagem
        console.log("📸 Imagem da oferta atualizada:", req.file.filename);
      }

      const ofertaAtualizada = await prisma.oferta.update({
        where: { idOferta: ofertaId },
        data: updateData,
      });

      console.log("✅ Oferta atualizada com sucesso:", ofertaAtualizada.titulo);
      res.status(200).json(ofertaAtualizada);
    } catch (error) {
      console.error("❌ Erro ao atualizar oferta:", error);
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
      console.error(error);
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
        categoria: true,
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
        transacoes: true,
      },
    });

    if (!oferta) {
      return res.status(404).json({ error: 'Oferta não encontrada.' });
    }
    res.status(200).json(oferta);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar transações da oferta.' });
  }
});

export default offerRouter;