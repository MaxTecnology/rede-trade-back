/**
 * MIDDLEWARE DE VALIDAÇÃO PARA EDIÇÃO DE USUÁRIOS
 * Implementa validações server-side para edição de usuários/associados
 * Permite campos opcionais mas valida quando presentes
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
 * Middleware de validação para edição de usuários
 * Valida apenas campos que estão presentes na requisição
 * Funciona DEPOIS do middleware de upload para ter acesso aos dados processados
 */
export const validateUsuarioEdicao = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Dados podem estar em req.body (multipart) ou form-data
    const dados = req.body;
    const { nome, cpf, email, senha } = dados;

    console.log('🔍 Validando dados de edição de usuário:', { 
      nome: nome !== undefined, 
      cpf: cpf !== undefined, 
      email: email !== undefined, 
      senha: senha !== undefined,
      totalFields: Object.keys(dados).length
    });

    // Validação de nome (se presente)
    if (nome !== undefined) {
      if (!nome || !nome.trim()) {
        console.log('❌ Nome inválido:', nome);
        return res.status(400).json({ 
          error: "Nome não pode estar vazio",
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

      // Sanitizar nome
      req.body.nome = sanitizeString(nome);
    }

    // Validação de email (se presente)
    if (email !== undefined) {
      if (!email || !email.trim()) {
        console.log('❌ Email vazio:', email);
        return res.status(400).json({ 
          error: "Email não pode estar vazio",
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

      // Sanitizar email
      req.body.email = email.trim().toLowerCase();
    }

    // Validação de CPF (se presente)
    if (cpf !== undefined) {
      if (!cpf || !cpf.trim()) {
        console.log('❌ CPF vazio:', cpf);
        return res.status(400).json({ 
          error: "CPF não pode estar vazio",
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

      // Formatar CPF
      req.body.cpf = cpf.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Validação de senha (se presente)
    if (senha !== undefined) {
      if (!senha || !senha.trim()) {
        console.log('❌ Senha vazia:', !!senha);
        return res.status(400).json({ 
          error: "Senha não pode estar vazia",
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
    }

    // Sanitizar outros campos texto que podem estar presentes
    const camposTexto = ['razaoSocial', 'nomeFantasia', 'descricao', 'nomeContato', 
                        'telefone', 'celular', 'emailContato', 'site', 'logradouro', 
                        'complemento', 'bairro', 'cidade', 'estado', 'regiao'];
    
    camposTexto.forEach(campo => {
      if (req.body[campo] !== undefined && typeof req.body[campo] === 'string') {
        req.body[campo] = sanitizeString(req.body[campo]);
      }
    });

    console.log('✅ Validação de edição passou, dados sanitizados');
    next();

  } catch (error) {
    console.error('❌ Erro no middleware de validação de edição:', error);
    return res.status(500).json({ 
      error: "Erro interno na validação de dados"
    });
  }
};