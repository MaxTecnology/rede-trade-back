import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const mockUser = {
  idUsuario: 1,
  nome: "Usuario Teste",
  email: "teste@exemplo.com",
  cpf: "12345678901",
  senha: "hashedpassword",
  tipo: "Associado",
  statusConta: true,
  bloqueado: false,
  conta: {
    idConta: 1,
    numeroConta: "12345-1",
    saldoPermuta: 1000.0,
    saldoDinheiro: 500.0,
    limiteCredito: 2000.0,
    limiteDisponivel: 1500.0
  }
};

export const mockOferta = {
  idOferta: 1,
  titulo: "Oferta Teste",
  descricao: "Descrição da oferta de teste",
  tipo: "Produto",
  quantidade: 10,
  valor: 100.0,
  limiteCompra: 5,
  status: true,
  cidade: "São Paulo",
  estado: "SP",
  retirada: "Local",
  vencimento: new Date(Date.now() + 86400000), // 1 dia no futuro
  usuarioId: 1,
  nomeUsuario: "Usuario Teste",
  categoriaId: 1
};

export const mockTransacao = {
  idTransacao: 1,
  codigoTransacao: "TXN-12345",
  valorRt: 100.0,
  numeroParcelas: 1,
  status: true,
  descricao: "Transação de teste",
  compradorId: 1,
  vendedorId: 2,
  nomeComprador: "Comprador Teste",
  nomeVendedor: "Vendedor Teste"
};

export const generateToken = (userId: number = 1, tipo: string = "Associado") => {
  return jwt.sign(
    { id: userId, tipo },
    process.env.SECRET || 'test-secret',
    { expiresIn: '24h' }
  );
};

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const createMockFormData = (data: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value.toString());
    }
  });
  return formData;
};

// Helper para validar campos obrigatórios
export const getRequiredFields = (formType: string) => {
  const requiredFields: Record<string, string[]> = {
    usuario: ['nome', 'email', 'cpf', 'senha'],
    oferta: ['titulo', 'tipo', 'quantidade', 'valor', 'limiteCompra', 'vencimento', 'retirada'],
    transacao: ['compradorId', 'vendedorId', 'valorRt', 'numeroParcelas'],
    subconta: ['nome', 'email', 'cpf', 'senha']
  };
  
  return requiredFields[formType] || [];
};

// Helper para gerar dados inválidos
export const getInvalidData = (field: string) => {
  const invalidData: Record<string, any> = {
    email: 'email-invalido',
    cpf: '123',
    valor: -10,
    quantidade: -5,
    numeroParcelas: 0,
    vencimento: '2020-01-01', // data no passado
    limiteCompra: -1
  };
  
  return invalidData[field];
};