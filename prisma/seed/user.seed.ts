import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seedUsers() {
  // Crie usuários
  const hashedPassword1 = await bcrypt.hash("senha123", 10);
  const user1 = await prisma.usuarios.create({
    data: {
      nome: "João Silva",
      cpf: "12345678901",
      email: "joao.silva@example.com",
      senha: hashedPassword1, // Senha hashed
      tipo: "Admin",
      status: true,
      telefone: "123456789",
      celular: "987654321",
      logradouro: "Rua A",
      numero: 123,
      cidade: "São Paulo",
      estado: "SP",
      aceitaOrcamento: true,
      aceitaVoucher: true,
      tipoOperacao: 1,
    },
  });

  const hashedPassword2 = await bcrypt.hash("senha123", 10);
  const user2 = await prisma.usuarios.create({
    data: {
      nome: "Maria Oliveira",
      cpf: "10987654321",
      email: "maria.oliveira@example.com",
      senha: hashedPassword2, // Senha hashed
      tipo: "User",
      status: true,
      telefone: "987654321",
      celular: "123456789",
      logradouro: "Rua B",
      numero: 456,
      cidade: "Rio de Janeiro",
      estado: "RJ",
      aceitaOrcamento: false,
      aceitaVoucher: false,
      tipoOperacao: 2,
    },
  });

  console.log({ user1, user2 });
}

export default seedUsers;
