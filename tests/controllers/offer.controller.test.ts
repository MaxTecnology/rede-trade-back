import request from 'supertest';
import express from 'express';
import { prismaMock } from '../setup';
import { mockOferta, generateToken, getRequiredFields, getInvalidData } from '../utils/test-helpers';
import offerRouter from '../../src/routes/offer.routes';

const app = express();
app.use(express.json());
app.use('/ofertas', offerRouter);

describe('Offer Controller - Formulário de Cadastro', () => {
  describe('POST /ofertas/criar-oferta', () => {
    const validOfferData = {
      titulo: "Produto Teste",
      descricao: "Descrição detalhada do produto de teste",
      tipo: "Produto",
      quantidade: 10,
      valor: 100.50,
      limiteCompra: 5,
      vencimento: new Date(Date.now() + 86400000).toISOString(), // 1 dia no futuro
      cidade: "São Paulo",
      estado: "SP",
      retirada: "Local",
      categoriaId: 1,
      subcategoriaId: 1,
      obs: "Observações da oferta"
    };

    beforeEach(() => {
      prismaMock.oferta.create.mockResolvedValue(mockOferta);
      prismaMock.categoria.findUnique.mockResolvedValue({ idCategoria: 1, nomeCategoria: "Categoria Teste" });
    });

    it('deve criar oferta com todos os campos válidos', async () => {
      const response = await request(app)
        .post('/ofertas/criar-oferta')
        .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
        .send(validOfferData);

      expect(response.status).toBe(201);
      expect(prismaMock.oferta.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          titulo: validOfferData.titulo,
          tipo: validOfferData.tipo,
          quantidade: validOfferData.quantidade,
          valor: validOfferData.valor
        })
      });
    });

    describe('Validação de campos obrigatórios', () => {
      const requiredFields = getRequiredFields('oferta');

      requiredFields.forEach(field => {
        it(`deve retornar erro quando ${field} estiver ausente`, async () => {
          const invalidData = { ...validOfferData };
          delete invalidData[field as keyof typeof invalidData];

          const response = await request(app)
            .post('/ofertas/criar-oferta')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain(field);
        });

        it(`deve retornar erro quando ${field} estiver vazio`, async () => {
          const invalidData = { ...validOfferData, [field]: "" };

          const response = await request(app)
            .post('/ofertas/criar-oferta')
            .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
            .send(invalidData);

          expect(response.status).toBe(400);
          expect(response.body.error).toContain(field);
        });
      });
    });

    describe('Validação de tipos de dados', () => {
      it('deve retornar erro para valor negativo', async () => {
        const invalidData = { ...validOfferData, valor: getInvalidData('valor') };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valor');
      });

      it('deve retornar erro para quantidade negativa', async () => {
        const invalidData = { ...validOfferData, quantidade: getInvalidData('quantidade') };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('quantidade');
      });

      it('deve retornar erro para limite de compra negativo', async () => {
        const invalidData = { ...validOfferData, limiteCompra: getInvalidData('limiteCompra') };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('limiteCompra');
      });

      it('deve retornar erro para data de vencimento no passado', async () => {
        const invalidData = { ...validOfferData, vencimento: getInvalidData('vencimento') };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('vencimento');
      });

      it('deve retornar erro para tipo inválido', async () => {
        const invalidData = { ...validOfferData, tipo: "TipoInválido" };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('tipo');
      });

      it('deve retornar erro para retirada inválida', async () => {
        const invalidData = { ...validOfferData, retirada: "TipoInválido" };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('retirada');
      });
    });

    describe('Validação de limites de caracteres', () => {
      it('deve retornar erro para título muito longo', async () => {
        const invalidData = { 
          ...validOfferData, 
          titulo: 'A'.repeat(256) // Assumindo limite de 255 caracteres
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('título');
      });

      it('deve retornar erro para descrição muito longa', async () => {
        const invalidData = { 
          ...validOfferData, 
          descricao: 'A'.repeat(1001) // Assumindo limite de 1000 caracteres
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('descrição');
      });
    });

    describe('Validação de relacionamentos', () => {
      it('deve retornar erro para categoria inexistente', async () => {
        prismaMock.categoria.findUnique.mockResolvedValueOnce(null);
        
        const invalidData = { ...validOfferData, categoriaId: 999 };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('categoria');
      });
    });

    describe('Validação de upload de imagem', () => {
      it('deve aceitar oferta sem imagem', async () => {
        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validOfferData);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para tipo de arquivo inválido (simulado)', async () => {
        const invalidData = { 
          ...validOfferData, 
          imagens: ['arquivo.exe'] // Arquivo não permitido
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('imagem');
      });
    });

    describe('Casos extremos e edge cases', () => {
      it('deve tratar quantidade zero', async () => {
        const edgeData = { ...validOfferData, quantidade: 0 };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(edgeData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('quantidade');
      });

      it('deve tratar limite de compra maior que quantidade', async () => {
        const edgeData = { 
          ...validOfferData, 
          quantidade: 5,
          limiteCompra: 10
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(edgeData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('limite de compra');
      });

      it('deve tratar valor muito alto', async () => {
        const edgeData = { 
          ...validOfferData, 
          valor: 999999999.99
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(edgeData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('valor');
      });

      it('deve tratar erro de banco de dados', async () => {
        prismaMock.oferta.create.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(validOfferData);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('erro interno');
      });

      it('deve sanitizar campos de texto', async () => {
        const maliciousData = {
          ...validOfferData,
          titulo: "<script>alert('XSS')</script>Produto Teste",
          descricao: "Descrição <img src='x' onerror='alert(1)'>"
        };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(maliciousData);

        expect(response.status).toBe(201);
        expect(prismaMock.oferta.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            titulo: expect.not.stringContaining('<script>'),
            descricao: expect.not.stringContaining('<img')
          })
        });
      });
    });

    describe('Validação de status e disponibilidade', () => {
      it('deve aceitar status true', async () => {
        const data = { ...validOfferData, status: true };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(data);

        expect(response.status).toBe(201);
      });

      it('deve aceitar status false', async () => {
        const data = { ...validOfferData, status: false };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(data);

        expect(response.status).toBe(201);
      });

      it('deve retornar erro para status inválido', async () => {
        const data = { ...validOfferData, status: "talvez" };

        const response = await request(app)
          .post('/ofertas/criar-oferta')
          .set('Authorization', `Bearer ${generateToken(1, 'Associado')}`)
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('status');
      });
    });
  });
});