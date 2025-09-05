import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import { mockUser, generateToken, getRequiredFields } from '../utils/test-helpers';
import accountRouter from '../../src/routes/account.routes';

const app = express();
app.use(express.json());
app.use('/contas', accountRouter);

describe('Account Controller - Formulário de Subcontas', () => {
  describe('POST /contas/criar-subconta/:idContaPai', () => {
    const validSubAccountData = {
      nome: "Subconta Teste",
      email: "subconta@teste.com",
      cpf: "98765432109",
      senha: "senha123",
      telefone: "(11) 99999-9999",
      celular: "(11) 88888-8888",
      logradouro: "Rua Subconta, 456",
      numero: 456,
      cep: "01234-567",
      complemento: "Apartamento 10",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      permissoes: JSON.stringify([
        "Atendimento.Visualizar",
        "Compras.Criar"
      ])
    };

    const mockSubConta = {
      idSubContas: 1,
      nome: "Subconta Teste",
      email: "subconta@teste.com",
      cpf: "98765432109",
      numeroSubConta: "12345-1-1",
      contaPaiId: 1,
      statusConta: true
    };

    const mockContaPai = {
      idConta: 1,
      numeroConta: "12345-1",
      usuarioId: 1,
      subContas: []
    };

    beforeEach(() => {
      prismaMock.subContas.create.mockResolvedValue(mockSubConta);
      prismaMock.conta.findUnique.mockResolvedValue(mockContaPai);
      prismaMock.subContas.findUnique.mockResolvedValue(null); // Não existe email/CPF duplicado
      prismaMock.subContas.count.mockResolvedValue(0); // Nenhuma subconta existente
    });

    it('deve criar subconta com todos os campos válidos', async () => {
      const response = await request(app)
        .post('/contas/criar-subconta/1')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(validSubAccountData);

      expect(response.status).toBe(201);
      expect(prismaMock.subContas.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nome: validSubAccountData.nome,
          email: validSubAccountData.email,
          cpf: validSubAccountData.cpf,
          contaPaiId: 1
        })
      });
    });

    describe('Validação de campos obrigatórios', () => {
      const requiredFields = getRequiredFields('subconta');

      requiredFields.forEach(field => {
        it(`deve retornar erro quando ${field} estiver ausente`, async () => {
          const invalidData = { ...validSubAccountData };
          delete invalidData[field as keyof typeof invalidData];

          const response = await request(app)
            .post('/contas/criar-subconta/1')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain(field);
        });

        it(`deve retornar erro quando ${field} for string vazia`, async () => {
          const invalidData = { ...validSubAccountData, [field]: "" };

          const response = await request(app)
            .post('/contas/criar-subconta/1')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body.error).toContain(field);
        });
      });
    });

    describe('Validação de limite de subcontas', () => {
      it('deve retornar erro quando já existem 4 subcontas', async () => {
        prismaMock.subContas.count.mockResolvedValueOnce(4); // Já tem 4 subcontas

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('limite');
        expect(response.body.error).toContain('4');
      });

      it('deve permitir criar até 4 subcontas', async () => {
        prismaMock.subContas.count.mockResolvedValueOnce(3); // Já tem 3, pode criar mais 1

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(201);
      });
    });

    describe('Validação de conta pai', () => {
      it('deve retornar erro quando conta pai não existe', async () => {
        prismaMock.conta.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
          .post('/contas/criar-subconta/999')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('conta pai');
      });

      it('deve retornar erro quando usuário não é dono da conta pai', async () => {
        const contaDeOutroUsuario = {
          ...mockContaPai,
          usuarioId: 99 // ID diferente do token
        };
        prismaMock.conta.findUnique.mockResolvedValueOnce(contaDeOutroUsuario);

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissão');
      });
    });

    describe('Validação de duplicação', () => {
      it('deve retornar erro quando email já existe', async () => {
        prismaMock.subContas.findUnique.mockResolvedValueOnce(mockSubConta);

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('email');
      });

      it('deve retornar erro quando CPF já existe', async () => {
        prismaMock.subContas.findUnique
          .mockResolvedValueOnce(null) // Para email
          .mockResolvedValueOnce(mockSubConta); // Para CPF

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('CPF');
      });
    });

    describe('Validação de formato de dados', () => {
      it('deve retornar erro para email inválido', async () => {
        const invalidData = { ...validSubAccountData, email: "email-invalido" };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('deve retornar erro para CPF inválido', async () => {
        const invalidData = { ...validSubAccountData, cpf: "123" };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('CPF');
      });

      it('deve retornar erro para senha muito curta', async () => {
        const invalidData = { ...validSubAccountData, senha: "12" };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('senha');
      });

      it('deve aceitar número como string ou integer', async () => {
        const dataWithStringNumber = { ...validSubAccountData, numero: "456" };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(dataWithStringNumber);

        expect(response.status).toBe(201);
      });
    });

    describe('Validação de permissões', () => {
      it('deve aceitar permissões válidas em JSON', async () => {
        const validPermissions = [
          "Atendimento.Visualizar",
          "Compras.Criar",
          "Vendas.Visualizar"
        ];
        const dataWithPermissions = { 
          ...validSubAccountData, 
          permissoes: JSON.stringify(validPermissions)
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(dataWithPermissions);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para JSON de permissões inválido', async () => {
        const invalidData = { ...validSubAccountData, permissoes: "invalid-json" };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('permissões');
      });

      it('deve aceitar permissões vazias', async () => {
        const dataWithEmptyPermissions = { 
          ...validSubAccountData, 
          permissoes: JSON.stringify([])
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(dataWithEmptyPermissions);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para permissões não reconhecidas', async () => {
        const invalidPermissions = [
          "PermissaoInexistente.Fazer",
          "Admin.DeleteTudo" // Permissões perigosas
        ];
        const invalidData = { 
          ...validSubAccountData, 
          permissoes: JSON.stringify(invalidPermissions)
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('permissão inválida');
      });
    });

    describe('Geração de número da subconta', () => {
      it('deve gerar número sequencial da subconta', async () => {
        prismaMock.subContas.count.mockResolvedValueOnce(2); // Já tem 2 subcontas

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(201);
        expect(prismaMock.subContas.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            numeroSubConta: expect.stringContaining('-3') // Terceira subconta
          })
        });
      });
    });

    describe('Casos extremos e edge cases', () => {
      it('deve sanitizar campos de texto', async () => {
        const maliciousData = {
          ...validSubAccountData,
          nome: "<script>alert('XSS')</script>João Silva",
          logradouro: "Rua Teste <img src='x' onerror='alert(1)'>"
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(prismaMock.subContas.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            nome: expect.not.stringContaining('<script>'),
            logradouro: expect.not.stringContaining('<img')
          })
        });
      });

      it('deve tratar erro de banco de dados', async () => {
        prismaMock.subContas.create.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('erro interno');
      });

      it('deve tratar campos opcionais vazios', async () => {
        const minimalData = {
          nome: validSubAccountData.nome,
          email: validSubAccountData.email,
          cpf: validSubAccountData.cpf,
          senha: validSubAccountData.senha
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(minimalData);

        expect(response.status).toBe(201);
      });

      it('deve validar tamanho máximo dos campos', async () => {
        const oversizedData = {
          ...validSubAccountData,
          nome: 'A'.repeat(256), // Nome muito longo
          logradouro: 'B'.repeat(501) // Logradouro muito longo
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(oversizedData);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/nome|logradouro/);
      });
    });

    describe('Validação de imagem', () => {
      it('deve aceitar subconta sem imagem', async () => {
        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(201);
      });

      it('deve aceitar upload de imagem válida', async () => {
        const dataWithImage = { 
          ...validSubAccountData, 
          imagem: "valid-image-url.jpg" 
        };

        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(dataWithImage);

        expect(response.status).toBe(201);
      });
    });

    describe('Validação de integridade relacional', () => {
      it('deve manter referência correta à conta pai', async () => {
        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(201);
        expect(prismaMock.subContas.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            contaPaiId: 1
          })
        });
      });

      it('deve inicializar subconta com status ativo', async () => {
        const response = await request(app)
          .post('/contas/criar-subconta/1')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validSubAccountData);

        expect(response.status).toBe(201);
        expect(prismaMock.subContas.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            statusConta: true
          })
        });
      });
    });
  });
});