// categories.routes.ts
import  { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { checkBlocked } from "../middlewares/checkBlocked.middleware";
import { verifyToken } from "../middlewares/verifyToken.middleware";

const prisma = new PrismaClient();
const categoryRouter = Router();

// Rota para cadastrar uma nova categoria
categoryRouter.post(
  "/criar-categoria",

  async (req: Request, res: Response) => {
    try {
      const { nomeCategoria, tipoCategoria } = req.body;
      // Verificar se já existe uma categoria com o mesmo nome
      const categoriaExistente = await prisma.categoria.findFirst({
        where: { nomeCategoria },
      });

      if (categoriaExistente) {
        return res.status(400).json({
          error: "Já existe uma categoria com o mesmo nome.",
        });
      }
      const novaCategoria = await prisma.categoria.create({
        data: {
          nomeCategoria,
          tipoCategoria,
        },
      });

      res.status(201).json(novaCategoria);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao cadastrar categoria." });
    }
  }
);
// Rota para cadastrar uma nova subcategoria
categoryRouter.post(
  "/criar-subcategoria/:categoryId",

  async (req: Request, res: Response) => {
    try {
      const { nomeSubcategoria } = req.body;
      const categoriaId = parseInt(req.params.categoryId, 10);
      const novaSubcategoria = await prisma.subcategoria.create({
        data: {
          nomeSubcategoria,
          categoriaId,
        },
      });

      res.status(201).json(novaSubcategoria);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao cadastrar subcategoria." });
    }
  }
);
// Rota para listar todas as categorias com subcategorias (suporte a paginação)
categoryRouter.get('/listar-categorias', async (req: Request, res: Response) => {
 try {
   const { page, pageSize } = req.query;
   const pageInt = parseInt(page as string, 10);
   const pageSizeInt = parseInt(pageSize as string, 10);
   const skip = (pageInt - 1) * pageSizeInt;

   const [categorias, total] = await Promise.all([
     prisma.categoria.findMany({
       take: pageSizeInt,
       skip,
       include: {
         subcategorias: true,
       },
     }),
     prisma.categoria.count(),
   ]);

   const totalPages = Math.ceil(total / pageSizeInt);

   const meta = {
     total,
     page: pageInt,
     pageSize: pageSizeInt,
     totalPages,
   };

   res.status(200).json({ categorias, meta });
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: "Erro ao obter categorias." });
 }
});
// Rota para atualizar dados de uma categoria
categoryRouter.put(
  "/atualizar-categoria/:categoryId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);
      const { nomeCategoria, tipoCategoria } = req.body;

      // Verifica se a categoria existe
      const categoriaExistente = await prisma.categoria.findUnique({
        where: { idCategoria: categoryId },
      });

      if (!categoriaExistente) {
        return res.status(404).json({ error: "Categoria não encontrada." });
      }

      const categoriaAtualizada = await prisma.categoria.update({
        where: { idCategoria: categoryId },
        data: {
          nomeCategoria,
          tipoCategoria,
        },
      });

      res.status(200).json(categoriaAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao atualizar categoria." });
    }
  }
);
// Rota para editar dados de uma subcategoria
categoryRouter.put(
  "/editar-subcategoria/:subcategoryId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const subcategoryId = parseInt(req.params.subcategoryId, 10);
      const { nomeSubcategoria } = req.body;

      // Verifica se a subcategoria existe
      const subcategoriaExistente = await prisma.subcategoria.findUnique({
        where: { idSubcategoria: subcategoryId },
      });

      if (!subcategoriaExistente) {
        return res.status(404).json({ error: "Subcategoria não encontrada." });
      }

      const subcategoriaAtualizada = await prisma.subcategoria.update({
        where: { idSubcategoria: subcategoryId },
        data: {
          nomeSubcategoria,
        },
      });

      res.status(200).json(subcategoriaAtualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao editar subcategoria." });
    }
  }
);
// Rota para deletar uma subcategoria
categoryRouter.delete(
  "/deletar-subcategoria/:subcategoryId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const subcategoryId = parseInt(req.params.subcategoryId, 10);

      // Verifica se a subcategoria existe
      const subcategoriaExistente = await prisma.subcategoria.findUnique({
        where: { idSubcategoria: subcategoryId },
      });

      if (!subcategoriaExistente) {
        return res.status(404).json({ error: "Subcategoria não encontrada." });
      }

      const subcategoriaDeletada = await prisma.subcategoria.delete({
        where: { idSubcategoria: subcategoryId },
      });

      res
        .status(200)
        .json({
          message: "Subcategoria deletada com sucesso",
          subcategoriaDeletada,
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar subcategoria." });
    }
  }
);
// Rota para deletar uma categoria
categoryRouter.delete(
  "/deletar-categoria/:categoryId",
  verifyToken,
  checkBlocked,
  async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId, 10);

      // Verifica se a categoria existe
      const categoriaExistente = await prisma.categoria.findUnique({
        where: { idCategoria: categoryId },
        include: { subcategorias: true }, // Inclui as subcategorias relacionadas
      });

      if (!categoriaExistente) {
        return res.status(404).json({ error: "Categoria não encontrada." });
      }

      // Verifica se há subcategorias relacionadas à categoria
      if (categoriaExistente.subcategorias.length > 0) {
        return res
          .status(400)
          .json({
            error:
              "Não é possível deletar a categoria pois existem subcategorias relacionadas.",
          });
      }

      const categoriaDeletada = await prisma.categoria.delete({
        where: { idCategoria: categoryId },
      });

      res
        .status(200)
        .json({
          message: "Categoria deletada com sucesso: ",
          categoriaDeletada,
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao deletar categoria." });
    }
  }
);
export default categoryRouter;
