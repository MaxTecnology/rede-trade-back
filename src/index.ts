// index.ts
import express, { Request, Response } from "express";
import accountRouter from "./routes/account.routes";
import userRouter from "./routes/users.routes";
import planRouter from "./routes/plan.routes";
import dotenv from "dotenv";
import cors from "cors";
import categoryRouter from "./routes/categories.routes";
import offerRouter from "./routes/offer.routes";
import transactionRouter from "./routes/transaction.routes";
import installmentRouter from "./routes/installment.routes";
import billingRouter from "./routes/billing.routes";
import creditRouter from "./routes/credit.routes";
import dashboardRouter from "./routes/dashboard.routes";
import voucherRouters from "./routes/vouchers.routes";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import swaggerOptions from "./swaggerOptions"


dotenv.config();

const app = express();

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuração do CORS
app.use(cors());

app.use(express.json());

// Rotas da sua aplicação
app.get("/", (_req:Request, res:Response) => {
  res.send("Running...!");
});
app.use("/contas", accountRouter)
app.use("/usuarios", userRouter)
app.use("/planos", planRouter);
app.use("/categorias", categoryRouter)
app.use("/ofertas", offerRouter);
app.use("/transacoes", transactionRouter)
app.use("/parcelamentos", installmentRouter);
app.use("/cobrancas", billingRouter);
app.use("/creditos", creditRouter);
app.use("/dashboard", dashboardRouter);
app.use("/vouchers", voucherRouters)
// Inicialização do servidor
//const PORT = process.env.PORT || 3001;

app.listen(3024, '0.0.0.0', () => {
  console.log(`Servidor iniciado na porta 3024`);
  //console.log(`Servidor iniciado na porta ${PORT}`);
});
