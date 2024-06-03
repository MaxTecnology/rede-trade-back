import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";

// Middleware para verificar o token
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  
  const token = req.header("Authorization")?.replace("Bearer ", ""); 
  if (!token) { 
    return res.status(401).json({ error: "Token não fornecido." });
  }
 const secret = process.env.SECRET || "";

  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido." });
    }

    res.locals.userId = decoded.userId; // Adiciona o ID do usuário decodificado ao objeto de requisição

    return next();
  });
};
