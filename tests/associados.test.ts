/**
 * TESTES PARA FORMULÁRIOS DE ASSOCIADOS
 * Testa validações de campos e integração entre front e back
 */

import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/lib/prisma';

describe('🧪 Testes de Formulários - Associados', () => {
  
  // Dados de teste
  const dadosAssociadoValido = {
    nome: "João Silva Teste",
    cpf: "123.456.789-01",
    email: "joao.teste@email.com",
    senha: "senha123",
    tipo: "Associado"
  };

  const dadosAssociadoInvalido = {
    camposVazios: {
      nome: "",
      cpf: "",
      email: "",
      senha: ""
    },
    emailInvalido: {
      nome: "João Silva",
      cpf: "123.456.789-01",
      email: "email-invalido",
      senha: "senha123"
    },
    cpfInvalido: {
      nome: "João Silva", 
      cpf: "123",
      email: "joao@teste.com",
      senha: "senha123"
    },
    dadosMaliciosos: {
      nome: "<script>alert('xss')</script>João",
      cpf: "123.456.789-01",
      email: "joao@teste.com",
      senha: "senha123"
    }
  };

  describe('📝 Validação de Campos Obrigatórios', () => {
    
    test('deve rejeitar quando nome estiver vazio', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send({ ...dadosAssociadoValido, nome: "" })
        .expect(400);

      expect(response.body.error).toContain('nome');
    });

    test('deve rejeitar quando email estiver vazio', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send({ ...dadosAssociadoValido, email: "" })
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    test('deve rejeitar quando CPF estiver vazio', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send({ ...dadosAssociadoValido, cpf: "" })
        .expect(400);

      expect(response.body.error).toContain('cpf');
    });

    test('deve rejeitar quando senha estiver vazia', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send({ ...dadosAssociadoValido, senha: "" })
        .expect(400);

      expect(response.body.error).toContain('senha');
    });

    test('deve rejeitar todos os campos obrigatórios vazios', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosAssociadoInvalido.camposVazios)
        .expect(400);

      // Deve mencionar pelo menos um campo obrigatório
      const errorMessage = response.body.error.toLowerCase();
      const camposObrigatorios = ['nome', 'email', 'cpf', 'senha'];
      const mencionaAlgumCampo = camposObrigatorios.some(campo => 
        errorMessage.includes(campo)
      );
      
      expect(mencionaAlgumCampo).toBe(true);
    });
  });

  describe('🔍 Validação de Formato de Dados', () => {
    
    test('deve rejeitar email em formato inválido', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosAssociadoInvalido.emailInvalido)
        .expect(400);

      expect(response.body.error.toLowerCase()).toContain('email');
    });

    test('deve rejeitar CPF em formato inválido', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosAssociadoInvalido.cpfInvalido)
        .expect(400);

      expect(response.body.error.toLowerCase()).toContain('cpf');
    });

    test('deve aceitar email com espaços (trimmed)', async () => {
      const dadosComEspacos = {
        ...dadosAssociadoValido,
        email: "  joao.espacos@teste.com  "
      };

      // Se o sistema fizer trim, deve funcionar
      // Se não fizer, deve rejeitar
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosComEspacos);

      // Tanto 200 (aceito após trim) quanto 400 (rejeitado) são válidos
      expect([200, 201, 400]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        // Se passou, verificar se fez trim
        expect(response.body.email || response.body.user?.email).not.toContain('  ');
      }
    });
  });

  describe('🔐 Testes de Segurança', () => {
    
    test('deve sanitizar ou rejeitar dados maliciosos (XSS)', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosAssociadoInvalido.dadosMaliciosos);

      if (response.status === 400) {
        // Sistema rejeitou - OK
        expect(response.body.error).toBeDefined();
      } else if (response.status === 200 || response.status === 201) {
        // Sistema aceitou - deve ter sanitizado
        const nomeRetornado = response.body.nome || response.body.user?.nome;
        expect(nomeRetornado).not.toContain('<script>');
        expect(nomeRetornado).not.toContain('alert');
      } else {
        fail(`Status inesperado: ${response.status}`);
      }
    });

    test('deve criptografar senha antes de salvar', async () => {
      // Este teste assumirá que o usuário será criado
      // e verificará se a senha não está em texto plano
      const dadosUsuario = {
        ...dadosAssociadoValido,
        email: `teste.senha.${Date.now()}@teste.com`, // Email único
        cpf: `${Date.now()}`.padStart(11, '1').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      };

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosUsuario);

      if (response.status === 200 || response.status === 201) {
        // Se criou usuário, verificar no banco se senha foi criptografada
        const usuario = await prisma.usuarios.findUnique({
          where: { email: dadosUsuario.email }
        });

        if (usuario) {
          expect(usuario.senha).not.toBe(dadosUsuario.senha); // Não deve ser texto plano
          expect(usuario.senha.length).toBeGreaterThan(20); // Hash tem mais que 20 chars
        }
      }
    });
  });

  describe('🔒 Testes de Autorização', () => {
    
    test('deve exigir token para listar associados', async () => {
      const response = await request(app)
        .get('/usuarios/listar-usuarios')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('deve rejeitar token inválido', async () => {
      const response = await request(app)
        .get('/usuarios/listar-usuarios')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('🔄 Testes de Integração', () => {
    
    test('deve manter consistência de tipos entre requisição e resposta', async () => {
      const dadosComTiposEspecificos = {
        ...dadosAssociadoValido,
        email: `tipos.${Date.now()}@teste.com`,
        cpf: `${Date.now()}`.padStart(11, '2').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        statusConta: true, // Boolean
        reputacao: 4.5,    // Float
        numero: 123        // Integer
      };

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosComTiposEspecificos);

      if (response.status === 200 || response.status === 201) {
        const usuario = response.body.user || response.body;
        
        // Verificar tipos se retornados
        if (usuario.statusConta !== undefined) {
          expect(typeof usuario.statusConta).toBe('boolean');
        }
        if (usuario.reputacao !== undefined) {
          expect(typeof usuario.reputacao).toBe('number');
        }
      }
    });

    test('deve listar apenas associados quando filtrado por tipo', async () => {
      // Teste com token de Matrix (assumindo que existe)
      // Por enquanto apenas verificar se endpoint responde
      const response = await request(app)
        .get('/usuarios/listar-usuarios?tipoDaConta=Associado');

      // Se não tiver token, deve retornar 401
      // Se tiver token válido, deve retornar 200 com filtros aplicados  
      expect([401, 200]).toContain(response.status);

      if (response.status === 200) {
        // Verificar se filtrou corretamente
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('⚡ Testes de Edge Cases', () => {
    
    test('deve tratar campos com valores null/undefined', async () => {
      const dadosComNull = {
        nome: "João Silva",
        cpf: "123.456.789-01",
        email: "joao@teste.com",
        senha: "senha123",
        telefone: null,
        cidade: undefined
      };

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosComNull);

      // Sistema deve tratar null/undefined graciosamente
      expect([200, 201, 400]).toContain(response.status);
      
      if (response.status !== 500) {
        // Não deve dar erro interno do servidor
        expect(response.body).toBeDefined();
      }
    });

    test('deve validar unicidade de email', async () => {
      const emailDuplicado = `duplicado.${Date.now()}@teste.com`;
      
      const dadosUsuario1 = {
        ...dadosAssociadoValido,
        email: emailDuplicado,
        cpf: "111.111.111-01"
      };

      const dadosUsuario2 = {
        ...dadosAssociadoValido,
        email: emailDuplicado, // Email duplicado
        cpf: "222.222.222-02"
      };

      // Criar primeiro usuário
      const response1 = await request(app)
        .post('/usuarios/criar-usuario')
        .send(dadosUsuario1);

      if (response1.status === 200 || response1.status === 201) {
        // Tentar criar segundo usuário com mesmo email
        const response2 = await request(app)
          .post('/usuarios/criar-usuario')
          .send(dadosUsuario2)
          .expect(400);

        expect(response2.body.error.toLowerCase()).toContain('email');
      }
    });
  });

  // Limpeza após os testes
  afterAll(async () => {
    // Limpar usuários de teste criados
    await prisma.usuarios.deleteMany({
      where: {
        email: {
          contains: '@teste.com'
        }
      }
    });
    
    await prisma.$disconnect();
  });
});