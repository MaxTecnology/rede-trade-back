// swaggerOptions.ts
import { Options } from "swagger-jsdoc";

const swaggerOptions: Options = {
  swaggerDefinition: {
    info: {
      title: "Api - Rede Trade",
      description: "Api - Rede Trade",
      version: "1.0.0",
    },
    basePath: "/", // opcional
  },
  apis: ["./src/routes/*.ts"], // caminho para seus arquivos de rota TypeScript
};

export default swaggerOptions;
