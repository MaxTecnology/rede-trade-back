import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { resolveUserPermissions } from "../services/permissions.service";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const secret = process.env.SECRET || "";

  try {
    const decoded = jwt.verify(token, secret) as { userId: number };

    if (!decoded?.userId) {
      return res.status(401).json({ error: "Token inválido." });
    }

    res.locals.userId = decoded.userId;

    try {
      const { allow, deny } = await resolveUserPermissions(decoded.userId);
      res.locals.permissions = {
        allow: Array.from(allow),
        deny: Array.from(deny),
      };
    } catch (permissionError) {
      console.error("❌ Erro ao resolver permissões:", permissionError);
      return res
        .status(500)
        .json({ error: "Não foi possível carregar permissões do usuário." });
    }

    return next();
  } catch (error) {
    console.error("❌ Erro na verificação do token:", error);
    return res.status(401).json({ error: "Token inválido." });
  }
};
