import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import { mockUser, mockOferta, mockTransacao, generateToken } from '../utils/test-helpers';

// Import das rotas
import usersRouter from '../../src/routes/users.routes';
import offerRouter from '../../src/routes/offer.routes';
import transactionRouter from '../../src/routes/transaction.routes';
import accountRouter from '../../src/routes/account.routes';

const app = express();
app.use(express.json());
app.use('/usuarios', usersRouter);
app.use('/ofertas', offerRouter);
app.use('/transacoes', transactionRouter);
app.use('/contas', accountRouter);

describe('Testes de Integração - Frontend ↔ Backend', () => {
  describe('Fluxo completo de formulários', () => {
    describe('Cenário: Cadastro de usuário seguido de subconta', () => {
      it('deve permitir criar usuário e depois subconta', async () => {
        const novoUsuario = {
          nome: "João Silva",
          email: "joao@teste.com",
          cpf: "12345678901",
          senha: "senha123",
          tipo: "Associado"
        };

        const novaSubconta = {
          nome: "Subconta João",
          email: "subconta.joao@teste.com",
          cpf: "98765432109",
          senha: "senha456"
        };

        // Mock para criação do usuário
        prismaMock.usuarios.create.mockResolvedValueOnce({
          ...mockUser,
          ...novoUsuario,
          conta: { ...mockUser.conta }
        });
        prismaMock.usuarios.findUnique.mockResolvedValue(null); // Não existe duplicado

        // 1. Criar usuário
        const responseUser = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(novoUsuario);

        expect(responseUser.status).toBe(201);

        // Mock para criação da subconta
        prismaMock.conta.findUnique.mockResolvedValue({
          idConta: 1,
          usuarioId: 1,
          numeroConta: "12345-1"
        });
        prismaMock.subContas.count.mockResolvedValue(0);
        prismaMock.subContas.create.mockResolvedValue({
          idSubContas: 1,
          nome: novaSubconta.nome,
          email: novaSubconta.email,
          contaPaiId: 1
        });

        // 2. Criar subconta para o usuário
        const responseSubconta = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(novaSubconta);

        expect(responseSubconta.status).toBe(201);
        expect(prismaMock.usuarios.create).toHaveBeenCalled();
        expect(prismaMock.subContas.create).toHaveBeenCalled();
      });
    });

    describe('Cenário: Criação de oferta seguida de transação', () => {
      it('deve permitir criar oferta e depois fazer transação', async () => {
        const novaOferta = {
          titulo: "Produto Teste",
          descricao: "Descrição do produto",
          tipo: "Produto",
          quantidade: 10,
          valor: 100.0,
          limiteCompra: 5,
          vencimento: new Date(Date.now() + 86400000).toISOString(),
          retirada: "Local",
          categoriaId: 1
        };

        const novaTransacao = {
          compradorId: 2,
          vendedorId: 1,
          valorRt: 50.0,
          numeroParcelas: 2,
          descricao: "Compra do produto teste"
        };

        // Mock para oferta
        prismaMock.oferta.create.mockResolvedValueOnce(mockOferta);
        prismaMock.categoria.findUnique.mockResolvedValue({ 
          idCategoria: 1, 
          nomeCategoria: "Categoria Teste" 
        });

        // 1. Criar oferta
        const responseOferta = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(novaOferta);

        expect(responseOferta.status).toBe(201);

        // Mock para transação
        const mockComprador = { ...mockUser, idUsuario: 2 };
        const mockVendedor = { ...mockUser, idUsuario: 1 };
        
        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(mockComprador)
          .mockResolvedValueOnce(mockVendedor);
        prismaMock.transacao.create.mockResolvedValue(mockTransacao);

        // 2. Criar transação
        const responseTransacao = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(2, 'Associado')}`)
          .send(novaTransacao);

        expect(responseTransacao.status).toBe(201);
        expect(prismaMock.oferta.create).toHaveBeenCalled();
        expect(prismaMock.transacao.create).toHaveBeenCalled();
      });
    });
  });

  describe('Validação de dados cross-formulário', () => {
    it('deve manter consistência de email único entre usuários e subcontas', async () => {
      const emailDuplicado = "email.duplicado@teste.com";

      // Primeiro: criar usuário com email
      const usuario = {
        nome: "Usuario 1",
        email: emailDuplicado,
        cpf: "12345678901",
        senha: "senha123",
        tipo: "Associado"
      };

      prismaMock.usuarios.create.mockResolvedValue({
        ...mockUser,
        email: emailDuplicado
      });
      prismaMock.usuarios.findUnique.mockResolvedValue(null);

      const responseUsuario = await request(app)
        .post('/usuarios/criar-usuario')
        .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
        .send(usuario);

      expect(responseUsuario.status).toBe(201);

      // Segundo: tentar criar subconta com mesmo email
      const subconta = {
        nome: "Subconta 1",
        email: emailDuplicado, // Mesmo email
        cpf: "98765432109",
        senha: "senha456"
      };

      prismaMock.conta.findUnique.mockResolvedValue({
        idConta: 1,
        usuarioId: 1
      });
      prismaMock.subContas.findUnique.mockResolvedValue({
        email: emailDuplicado
      }); // Email já existe

      const responseSubconta = await request(app)
        .post('/contas/criar-subconta/1')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(subconta);

      expect(responseSubconta.status).toBe(409); // Conflict - email duplicado
    });

    it('deve validar integridade de dados em transações com ofertas inexistentes', async () => {
      const transacaoInvalida = {
        compradorId: 1,
        vendedorId: 2,
        ofertaId: 999999, // Oferta que não existe
        valorRt: 100.0,
        numeroParcelas: 1
      };

      const mockComprador = { ...mockUser, idUsuario: 1 };
      const mockVendedor = { ...mockUser, idUsuario: 2 };

      prismaMock.usuarios.findUnique
        .mockResolvedValueOnce(mockComprador)
        .mockResolvedValueOnce(mockVendedor);
      prismaMock.oferta.findUnique.mockResolvedValue(null); // Oferta não existe

      const response = await request(app)
        .post('/transacoes/criar-transacao')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(transacaoInvalida);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('oferta');
    });
  });

  describe('Problemas de sincronização identificados', () => {
    it('deve detectar quando frontend envia dados que backend não espera', async () => {
      const dadosComCamposExtras = {
        // Campos esperados
        nome: "João Silva",
        email: "joao@teste.com",
        cpf: "12345678901",
        senha: "senha123",
        tipo: "Associado",
        // Campos que frontend pode enviar mas backend ignora
        campoInexistente: "valor",
        outrosCampos: { nested: "data" },
        arrayDesnecessario: [1, 2, 3]
      };

      prismaMock.usuarios.create.mockResolvedValue(mockUser);
      prismaMock.usuarios.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
        .send(dadosComCamposExtras);

      expect(response.status).toBe(201);
      
      // Verificar que apenas campos válidos foram processados
      expect(prismaMock.usuarios.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          campoInexistente: expect.anything(),
          outrosCampos: expect.anything(),
          arrayDesnecessario: expect.anything()
        })
      });
    });

    it('deve detectar inconsistência de tipos entre frontend e backend', async () => {
      const dadosComTiposIncorretos = {
        titulo: "Produto Teste",
        tipo: "Produto",
        quantidade: "10", // String ao invés de number
        valor: "100.50", // String ao invés de number
        status: "true", // String ao invés de boolean
        vencimento: "2024-12-31", // String de data
        categoriaId: "1" // String ao invés de number
      };

      prismaMock.oferta.create.mockResolvedValue(mockOferta);
      prismaMock.categoria.findUnique.mockResolvedValue({
        idCategoria: 1,
        nomeCategoria: "Categoria"
      });

      const response = await request(app)
        .post('/ofertas/criar-oferta')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(dadosComTiposIncorretos);

      // Sistema deveria converter tipos ou retornar erro
      if (response.status === 201) {
        expect(prismaMock.oferta.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            quantidade: expect.any(Number),
            valor: expect.any(Number),
            status: expect.any(Boolean),
            categoriaId: expect.any(Number)
          })
        });
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/tipo|formato/i);
      }
    });
  });

  describe('Problemas de estado e sessão', () => {
    it('deve detectar quando token expira durante preenchimento longo', async () => {
      const tokenExpirado = generateToken(1, 'Associado', -3600); // Token expirado
      
      const dadosFormulario = {
        nome: "João Silva",
        email: "joao@teste.com",
        cpf: "12345678901",
        senha: "senha123",
        tipo: "Associado"
      };

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .set('Authorization', `Bearer ${tokenExpirado}`)
        .send(dadosFormulario);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    it('deve detectar problemas de upload grandes que excedem timeout', async () => {
      const dadosComArquivoGrande = {
        titulo: "Oferta com imagem",
        tipo: "Produto",
        quantidade: 1,
        valor: 100,
        limiteCompra: 1,
        vencimento: new Date(Date.now() + 86400000).toISOString(),
        retirada: "Local",
        // Simular arquivo muito grande
        imagem: 'x'.repeat(10 * 1024 * 1024) // 10MB de string
      };

      const response = await request(app)
        .post('/ofertas/criar-oferta')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(dadosComArquivoGrande);

      // Deveria rejeitar arquivo muito grande
      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('Validação de fluxo de permissões', () => {
    it('deve validar hierarquia de criação de usuários', async () => {
      // Associado tentando criar Gerente (não deveria poder)
      const novoGerente = {
        nome: "Novo Gerente",
        email: "gerente@teste.com",
        cpf: "11111111111",
        senha: "senha123",
        tipo: "Gerente"
      };

      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`) // Associado
        .send(novoGerente);

      expect(response.status).toBe(403); // Forbidden
      expect(response.body.error).toContain('permissão');
    });

    it('deve validar que subcontas só podem ser criadas pelo próprio usuário', async () => {
      const subconta = {
        nome: "Subconta Teste",
        email: "sub@teste.com",
        cpf: "22222222222",
        senha: "senha123"
      };

      // Mock conta de outro usuário
      prismaMock.conta.findUnique.mockResolvedValue({
        idConta: 1,
        usuarioId: 999 // Usuário diferente do token
      });

      const response = await request(app)
        .post('/contas/criar-subconta/1')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`) // User ID 1
        .send(subconta);

      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('Casos extremos de concorrência', () => {
    it('deve tratar criação simultânea de subcontas próximas ao limite', async () => {
      // Mock: já existem 3 subcontas
      prismaMock.subContas.count.mockResolvedValue(3);
      prismaMock.conta.findUnique.mockResolvedValue({
        idConta: 1,
        usuarioId: 1
      });

      const subconta1 = {
        nome: "Subconta 4",
        email: "sub4@teste.com",
        cpf: "44444444444",
        senha: "senha123"
      };

      const subconta2 = {
        nome: "Subconta 5",
        email: "sub5@teste.com", 
        cpf: "55555555555",
        senha: "senha123"
      };

      // Primeira requisição deveria passar (4/4)
      const response1 = await request(app)
        .post('/contas/criar-subconta/1')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(subconta1);

      expect(response1.status).toBe(201);

      // Mock: agora já existem 4 subcontas
      prismaMock.subContas.count.mockResolvedValue(4);

      // Segunda requisição deveria falhar (5/4 - excede limite)
      const response2 = await request(app)
        .post('/contas/criar-subconta/1')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(subconta2);

      expect(response2.status).toBe(400);
      expect(response2.body.error).toContain('limite');
    });
  });
});