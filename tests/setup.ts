import { PrismaClient } from '@prisma/client';

declare global {
  var __PRISMA_TEST__: PrismaClient | undefined;
}

// Mock do Prisma para testes
export const prismaMock = {
  usuarios: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  conta: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  subContas: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  oferta: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transacao: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as any;

// Mock do Prisma Client
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

// Configurações globais para os testes
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup
});

beforeEach(() => {
  jest.clearAllMocks();
});