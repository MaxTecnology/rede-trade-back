// middleware/checkBlocked.ts
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    const user = await prisma.usuarios.findUnique({
      where: { idUsuario: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

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
