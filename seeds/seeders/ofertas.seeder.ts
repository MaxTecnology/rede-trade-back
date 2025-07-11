import { PrismaClient } from "@prisma/client";
import { ofertasData } from "../data/ofertas.data";
import { FakerUtils } from "../utils/faker";
import { logger } from "../utils/logger";

export async function seedOfertas(prisma: PrismaClient, usuarios: any, categorias: any) {
  const ofertas = [];
  const todosUsuarios = [
    usuarios.matriz,
    usuarios.gerente,
    usuarios.usuarioComum,
    usuarios.franquiaA,
    usuarios.franquiaB,
    ...usuarios.associados
  ];

  for (let i = 0; i < ofertasData.length; i++) {
    const ofertaData = ofertasData[i];
    const usuarioVendedor = FakerUtils.randomFromArray(todosUsuarios);
    
    // Encontrar categoria e subcategoria
    const categoria = categorias.categorias.find((cat: any) => 
      cat.nomeCategoria === ofertaData.categoria
    );
    const subcategoria = categorias.subcategorias.find((sub: any) => 
      sub.nomeSubcategoria === ofertaData.subcategoria && 
      sub.categoriaId === categoria?.idCategoria
    );

    const oferta = await prisma.oferta.create({
      data: {
        titulo: ofertaData.titulo,
        tipo: ofertaData.tipo,
        status: true,
        descricao: ofertaData.descricao,
        quantidade: ofertaData.quantidade,
        valor: ofertaData.valor,
        limiteCompra: ofertaData.limiteCompra,
        vencimento: FakerUtils.futureDate(ofertaData.diasVencimento),
        cidade: usuarioVendedor.cidade || "São Paulo",
        estado: usuarioVendedor.estado || "SP",
        retirada: ofertaData.retirada,
        obs: ofertaData.obs,
        imagens: [`oferta_${i + 1}_1.jpg`, `oferta_${i + 1}_2.jpg`],
        nomeUsuario: usuarioVendedor.nome,
        usuarioId: usuarioVendedor.idUsuario,
        categoriaId: categoria?.idCategoria,
        subcategoriaId: subcategoria?.idSubcategoria
      }
    });

    // Criar algumas imagens para a oferta
    await prisma.imagem.createMany({
      data: [
        {
          public_id: `cloudinary_${i + 1}_1`,
          url: `https://example.com/images/oferta_${i + 1}_1.jpg`,
          ofertaId: oferta.idOferta
        },
        {
          public_id: `cloudinary_${i + 1}_2`,
          url: `https://example.com/images/oferta_${i + 1}_2.jpg`,
          ofertaId: oferta.idOferta
        }
      ]
    });

    ofertas.push(oferta);
    logger.info(`✅ Oferta criada: ${oferta.titulo} - R$ ${oferta.valor}`);
  }

  return ofertas;
}
