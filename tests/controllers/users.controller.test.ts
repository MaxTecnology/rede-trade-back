import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import { mockUser, generateToken, getRequiredFields, getInvalidData } from '../utils/test-helpers';
import usersRouter from '../../src/routes/users.routes';

const app = express();
app.use(express.json());
app.use('/usuarios', usersRouter);

describe('Users Controller - Formulário de Cadastro', () => {
  describe('POST /usuarios/criar-usuario', () => {
    const validUserData = {
      nome: "João Silva",
      email: "joao@teste.com",
      cpf: "12345678901",
      senha: "senha123",
      tipo: "Associado",
      razaoSocial: "Empresa Teste Ltda",
      nomeFantasia: "Teste",
      telefone: "(11) 99999-9999",
      celular: "(11) 88888-8888",
      logradouro: "Rua Teste, 123",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01234-567"
    };

    beforeEach(() => {
      prismaMock.usuarios.create.mockResolvedValue(mockUser);
      prismaMock.usuarios.findUnique.mockResolvedValue(null); // Não existe usuário duplicado
    });

    it('deve criar usuário com todos os campos válidos', async () => {
      const response = await request(app)
        .post('/usuarios/criar-usuario')
        .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(prismaMock.usuarios.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nome: validUserData.nome,
          email: validUserData.email,
          cpf: validUserData.cpf,
          tipo: validUserData.tipo
        })
      });
    });

    describe('Validação de campos obrigatórios', () => {
      const requiredFields = getRequiredFields('usuario');

      requiredFields.forEach(field => {
        it(`deve retornar erro quando ${field} estiver vazio`, async () => {
          const invalidData = { ...validUserData };
          delete invalidData[field as keyof typeof invalidData];

          const response = await request(app)
            .post('/usuarios/criar-usuario')
            .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
        });

        it(`deve retornar erro quando ${field} for null`, async () => {
          const invalidData = { ...validUserData, [field]: null };

          const response = await request(app)
            .post('/usuarios/criar-usuario')
            .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
        });

        it(`deve retornar erro quando ${field} for string vazia`, async () => {
          const invalidData = { ...validUserData, [field]: "" };

          const response = await request(app)
            .post('/usuarios/criar-usuario')
            .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
        });
      });
    });

    describe('Validação de formato de dados', () => {
      it('deve retornar erro para email inválido', async () => {
        const invalidData = { ...validUserData, email: getInvalidData('email') };

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('deve retornar erro para CPF inválido', async () => {
        const invalidData = { ...validUserData, cpf: getInvalidData('cpf') };

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('CPF');
      });

      it('deve retornar erro para senha muito curta', async () => {
        const invalidData = { ...validUserData, senha: "123" };

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('senha');
      });
    });

    describe('Validação de duplicação', () => {
      it('deve retornar erro quando email já existe', async () => {
        prismaMock.usuarios.findUnique.mockResolvedValueOnce(mockUser);

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(validUserData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('email');
      });

      it('deve retornar erro quando CPF já existe', async () => {
        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(null) // Para email
          .mockResolvedValueOnce(mockUser); // Para CPF

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(validUserData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('CPF');
      });
    });

    describe('Validação de permissões', () => {
      it('deve retornar erro quando usuário não tem permissão', async () => {
        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validUserData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissão');
      });

      it('deve funcionar para usuário Matriz', async () => {
        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(validUserData);

        expect(response.status).toBe(201);
      });

      it('deve funcionar para usuário Gerente', async () => {
        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Gerente')}`)
          .send(validUserData);

        expect(response.status).toBe(201);
      });
    });

    describe('Casos extremos e edge cases', () => {
      it('deve tratar payload muito grande', async () => {
        const largeData = {
          ...validUserData,
          descricao: 'A'.repeat(10000) // String muito longa
        };

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(largeData);

        expect(response.status).toBe(413);
      });

      it('deve tratar campos com caracteres especiais', async () => {
        const specialCharsData = {
          ...validUserData,
          nome: "João & Maria <script>alert('xss')</script>",
          email: "test+tag@domain.co.uk"
        };

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(specialCharsData);

        expect(response.status).toBe(201);
        expect(prismaMock.usuarios.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            nome: expect.not.stringContaining('<script>')
          })
        });
      });

      it('deve tratar erro de banco de dados', async () => {
        prismaMock.usuarios.create.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post('/usuarios/criar-usuario')
          .set('Authorization', `Bearer ${generateToken(1, 'Matriz')}`)
          .send(validUserData);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('erro interno');
      });
    });
  });
});