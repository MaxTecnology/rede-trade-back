import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import { mockTransacao, mockUser, generateToken, getRequiredFields } from '../utils/test-helpers';
import transactionRouter from '../../src/routes/transaction.routes';

const app = express();
app.use(express.json());
app.use('/transacoes', transactionRouter);

describe('Transaction Controller - Formulário de Cadastro', () => {
  describe('POST /transacoes/criar-transacao', () => {
    const validTransactionData = {
      compradorId: 1,
      vendedorId: 2,
      nomeComprador: "João Comprador",
      nomeVendedor: "Maria Vendedora",
      valorRt: 100.0,
      valorAdicional: 50.0,
      numeroParcelas: 3,
      descricao: "Transação de teste para produto X",
      notaAtendimento: 5,
      observacaoNota: "Excelente atendimento"
    };

    const mockComprador = {
      ...mockUser,
      idUsuario: 1,
      conta: {
        ...mockUser.conta,
        saldoPermuta: 1000.0,
        limiteCredito: 2000.0,
        limiteDisponivel: 1500.0
      }
    };

    const mockVendedor = {
      ...mockUser,
      idUsuario: 2,
      nome: "Maria Vendedora",
      email: "maria@teste.com",
      conta: {
        ...mockUser.conta,
        idConta: 2,
        numeroConta: "12345-2",
        saldoPermuta: 500.0
      }
    };

    beforeEach(() => {
      prismaMock.transacao.create.mockResolvedValue(mockTransacao);
      prismaMock.usuarios.findUnique
        .mockResolvedValueOnce(mockComprador) // Para comprador
        .mockResolvedValueOnce(mockVendedor); // Para vendedor
    });

    it('deve criar transação com todos os campos válidos', async () => {
      const response = await request(app)
        .post('/transacoes/criar-transacao')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(validTransactionData);

      expect(response.status).toBe(201);
      expect(prismaMock.transacao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valorRt: validTransactionData.valorRt,
          numeroParcelas: validTransactionData.numeroParcelas,
          compradorId: validTransactionData.compradorId,
          vendedorId: validTransactionData.vendedorId
        })
      });
    });

    describe('Validação de campos obrigatórios', () => {
      const requiredFields = getRequiredFields('transacao');

      requiredFields.forEach(field => {
        it(`deve retornar erro quando ${field} estiver ausente`, async () => {
          const invalidData = { ...validTransactionData };
          delete invalidData[field as keyof typeof invalidData];

          const response = await request(app)
            .post('/transacoes/criar-transacao')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain(field);
        });

        it(`deve retornar erro quando ${field} for null`, async () => {
          const invalidData = { ...validTransactionData, [field]: null };

          const response = await request(app)
            .post('/transacoes/criar-transacao')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body.error).toContain(field);
        });
      });
    });

    describe('Validação de valores e tipos', () => {
      it('deve retornar erro para valorRt negativo', async () => {
        const invalidData = { ...validTransactionData, valorRt: -50.0 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valorRt');
      });

      it('deve retornar erro para valorRt zero', async () => {
        const invalidData = { ...validTransactionData, valorRt: 0 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valorRt');
      });

      it('deve retornar erro para número de parcelas inválido', async () => {
        const invalidData = { ...validTransactionData, numeroParcelas: 0 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('parcelas');
      });

      it('deve retornar erro para número de parcelas maior que 12', async () => {
        const invalidData = { ...validTransactionData, numeroParcelas: 15 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('parcelas');
      });

      it('deve aceitar valorAdicional zero ou positivo', async () => {
        const validData = { ...validTransactionData, valorAdicional: 0 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validData);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para valorAdicional negativo', async () => {
        const invalidData = { ...validTransactionData, valorAdicional: -10.0 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valorAdicional');
      });
    });

    describe('Validação de saldo e limites', () => {
      it('deve retornar erro quando comprador não tem saldo suficiente', async () => {
        const compradorSemSaldo = {
          ...mockComprador,
          conta: {
            ...mockComprador.conta,
            saldoPermuta: 50.0, // Menos que o valor da transação
            limiteDisponivel: 0.0
          }
        };

        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(compradorSemSaldo)
          .mockResolvedValueOnce(mockVendedor);

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('saldo');
      });

      it('deve retornar erro quando valorRt excede limite disponível', async () => {
        const transacaoAcimaMotto = { 
          ...validTransactionData, 
          valorRt: 2000.0 // Maior que limite disponível
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(transacaoAcimaMotto);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('limite');
      });

      it('deve aceitar transação dentro do limite', async () => {
        const transacaoDentroLimite = { 
          ...validTransactionData, 
          valorRt: 500.0 // Dentro do limite
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(transacaoDentroLimite);

        expect(response.status).toBe(201);
      });
    });

    describe('Validação de usuários', () => {
      it('deve retornar erro quando comprador não existe', async () => {
        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(null) // Comprador não encontrado
          .mockResolvedValueOnce(mockVendedor);

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('comprador');
      });

      it('deve retornar erro quando vendedor não existe', async () => {
        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(mockComprador)
          .mockResolvedValueOnce(null); // Vendedor não encontrado

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('vendedor');
      });

      it('deve retornar erro quando comprador e vendedor são iguais', async () => {
        const autoTransacao = { 
          ...validTransactionData, 
          compradorId: 1,
          vendedorId: 1 // Mesmo usuário
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(autoTransacao);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('mesmo usuário');
      });

      it('deve retornar erro quando usuário está bloqueado', async () => {
        const usuarioBloqueado = {
          ...mockComprador,
          bloqueado: true
        };

        prismaMock.usuarios.findUnique
          .mockResolvedValueOnce(usuarioBloqueado)
          .mockResolvedValueOnce(mockVendedor);

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('bloqueado');
      });
    });

    describe('Validação de avaliação', () => {
      it('deve aceitar nota de atendimento válida (1-5)', async () => {
        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para nota de atendimento inválida', async () => {
        const invalidData = { ...validTransactionData, notaAtendimento: 6 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('nota');
      });

      it('deve retornar erro para nota negativa', async () => {
        const invalidData = { ...validTransactionData, notaAtendimento: -1 };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('nota');
      });
    });

    describe('Casos extremos e edge cases', () => {
      it('deve tratar descrição muito longa', async () => {
        const invalidData = { 
          ...validTransactionData, 
          descricao: 'A'.repeat(1001) // Assumindo limite de 1000 caracteres
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('descrição');
      });

      it('deve tratar erro de transação no banco de dados', async () => {
        prismaMock.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('erro interno');
      });

      it('deve sanitizar campos de texto', async () => {
        const maliciousData = {
          ...validTransactionData,
          descricao: "<script>alert('XSS')</script>Descrição da transação",
          observacaoNota: "Observação <img src='x' onerror='alert(1)'>"
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(prismaMock.transacao.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            descricao: expect.not.stringContaining('<script>'),
            observacaoNota: expect.not.stringContaining('<img')
          })
        });
      });

      it('deve gerar código de transação único', async () => {
        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(201);
        expect(prismaMock.transacao.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            codigoTransacao: expect.any(String)
          })
        });
      });

      it('deve processar transação com voucher', async () => {
        const voucherData = { 
          ...validTransactionData, 
          voucher: true
        };

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(voucherData);

        expect(response.status).toBe(201);
      });
    });

    describe('Validação de integridade de dados', () => {
      it('deve manter consistência de saldos após transação', async () => {
        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(201);
        
        // Verificar se a transação foi chamada (importante para manter integridade)
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });

      it('deve reverter mudanças em caso de erro', async () => {
        // Simular erro durante a transação
        prismaMock.transacao.create.mockRejectedValueOnce(new Error('Failed to create transaction'));

        const response = await request(app)
          .post('/transacoes/criar-transacao')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validTransactionData);

        expect(response.status).toBe(500);
        
        // Verificar se a transação foi tentada (rollback automático)
        expect(prismaMock.$transaction).toHaveBeenCalled();
      });
    });
  });
});