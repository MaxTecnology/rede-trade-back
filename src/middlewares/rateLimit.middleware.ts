// middleware/rateLimit.ts
import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store de rate limiting em memória (simplificado)
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Cleanup automático a cada hora
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 3600000); // 1 hora

export const createRateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    const entry = rateLimitStore.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // Nova janela de tempo
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    // Incrementar contador
    entry.count++;
    rateLimitStore.set(identifier, entry);
    
    next();
  };
};

// Rate limits pré-configurados
export const authRateLimit = createRateLimit(10, 15 * 60 * 1000); // 10 tentativas em 15 min
export const apiRateLimit = createRateLimit(100, 15 * 60 * 1000); // 100 req em 15 min
export const strictRateLimit = createRateLimit(20, 60 * 1000); // 20 req por minuto

// Função para limpar cache (útil para debugging)
export const clearRateLimit = (identifier?: string) => {
  if (identifier) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.clear();
  }
};