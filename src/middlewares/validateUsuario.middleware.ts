/**
 * MIDDLEWARE DE VALIDAÇÃO PARA USUÁRIOS
 * Implementa validações server-side para criação de usuários/associados
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de CPF (com ou sem formatação)
 */
function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove formatação
  const cleanCPF = cpf.replace(/[.\-]/g, '');
  
  // Deve ter exatamente 11 dígitos
  if (!/^\d{11}$/.test(cleanCPF)) {
    return false;
  }
  
  // Verifica se não é sequência repetida (111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }
  
  // Validação básica - algoritmo simplificado para teste
  return true;
}

/**
 * Sanitiza string removendo scripts maliciosos
 */
function sanitizeString(str: string): string {
  if (!str) return '';
  
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 255); // Limita tamanho
}

/**
 * Middleware principal de validação de usuários
 */
export const validateUsuario = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, cpf, email, senha } = req.body;

    console.log('🔍 Validando dados de usuário:', { nome: !!nome, cpf: !!cpf, email: !!email, senha: !!senha });

    // Validação de nome
    if (!nome || !nome.trim()) {
      console.log('❌ Nome inválido:', nome);
      return res.status(400).json({ 
        error: "Nome é obrigatório",
        field: "nome"
      });
    }

    const nomeLength = nome.trim().length;
    if (nomeLength < 2) {
      return res.status(400).json({ 
        error: "Nome deve ter pelo menos 2 caracteres",
        field: "nome"
      });
    }

    if (nomeLength > 100) {
      return res.status(400).json({ 
        error: "Nome deve ter no máximo 100 caracteres",
        field: "nome"
      });
    }

    // Validação de email
    if (!email || !email.trim()) {
      console.log('❌ Email vazio:', email);
      return res.status(400).json({ 
        error: "Email é obrigatório",
        field: "email"
      });
    }

    if (!isValidEmail(email.trim())) {
      console.log('❌ Email inválido:', email);
      return res.status(400).json({ 
        error: "Email deve ter um formato válido",
        field: "email"
      });
    }

    // Validação de CPF
    if (!cpf || !cpf.trim()) {
      console.log('❌ CPF vazio:', cpf);
      return res.status(400).json({ 
        error: "CPF é obrigatório",
        field: "cpf"
      });
    }

    if (!isValidCPF(cpf)) {
      console.log('❌ CPF inválido:', cpf);
      return res.status(400).json({ 
        error: "CPF deve ter um formato válido (xxx.xxx.xxx-xx)",
        field: "cpf"
      });
    }

    // Validação de senha
    if (!senha || !senha.trim()) {
      console.log('❌ Senha vazia:', !!senha);
      return res.status(400).json({ 
        error: "Senha é obrigatória",
        field: "senha"
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({ 
        error: "Senha deve ter no mínimo 6 caracteres",
        field: "senha"
      });
    }

    if (senha.length > 100) {
      return res.status(400).json({ 
        error: "Senha deve ter no máximo 100 caracteres",
        field: "senha"
      });
    }

    // Sanitização de dados (aplicar ao req.body para que chegue limpo no controller)
    req.body.nome = sanitizeString(nome);
    req.body.email = email.trim().toLowerCase();
    req.body.cpf = cpf.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    console.log('✅ Validação passou, dados sanitizados');
    next();

  } catch (error) {
    console.error('❌ Erro no middleware de validação:', error);
    return res.status(500).json({ 
      error: "Erro interno na validação de dados"
    });
  }
};

/**
 * Validação mais rigorosa com Zod (opcional, para uso futuro)
 */
export const validateUsuarioWithZod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Esta função pode ser implementada com Zod no futuro
    // Por enquanto usar validateUsuario acima
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: "Dados inválidos",
      details: error
    });
  }
};