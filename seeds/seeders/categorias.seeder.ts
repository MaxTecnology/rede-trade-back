import { PrismaClient } from "@prisma/client";
import { categoriasData } from "../data/categorias.data";
import { logger } from "../utils/logger";

export async function seedCategorias(prisma: PrismaClient) {
  const categorias = [];
  const subcategorias = [];

  for (const catData of categoriasData) {
    const categoria = await prisma.categoria.create({
      data: {
        nomeCategoria: catData.nome,
        tipoCategoria: catData.tipo
      }
    });
    categorias.push(categoria);
    logger.info(`✅ Categoria criada: ${categoria.nomeCategoria}`);

    for (const subNome of catData.subcategorias) {
      const subcategoria = await prisma.subcategoria.create({
        data: {
          nomeSubcategoria: subNome,
          categoriaId: categoria.idCategoria
        }
      });
      subcategorias.push(subcategoria);
    }
  }

  return { categorias, subcategorias };
}