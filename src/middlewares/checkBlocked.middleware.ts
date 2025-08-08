// middleware/checkBlocked.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON

// Cache simples em memória para status de bloqueio
interface UserBlockCache {
  blocked: boolean;
  timestamp: number;
}

const blockCache = new Map<number, UserBlockCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milliseconds

// Limpar cache antigo periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [userId, cache] of blockCache.entries()) {
    if (now - cache.timestamp > CACHE_TTL) {
      blockCache.delete(userId);
    }
  }
}, CACHE_TTL);

export const checkBlocked = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = res.locals.userId;

  if (!userId) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  try {
    // Verificar cache primeiro
    const cached = blockCache.get(userId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      if (cached.blocked) {
        return res
          .status(403)
          .json({ error: "Usuário bloqueado, acesso negado." });
      }
      return next();
    }

    // Buscar no banco apenas se não estiver no cache
    const user = await prisma.usuarios.findUnique({
      where: { idUsuario: userId },
      select: { bloqueado: true } // Selecionar apenas o campo necessário
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Atualizar cache
    blockCache.set(userId, {
      blocked: user.bloqueado,
      timestamp: now
    });

    if (user.bloqueado) {
      return res
        .status(403)
        .json({ error: "Usuário bloqueado, acesso negado." });
    }

    return next();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao verificar o status do usuário." });
  }
};

// Função para invalidar cache quando um usuário é bloqueado/desbloqueado
export const invalidateUserBlockCache = (userId: number) => {
  blockCache.delete(userId);
};
