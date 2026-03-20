import express, { Request, Response } from "express";
import path from 'path'; // Adicionar esta importação
import accountRouter from "./routes/account.routes";
import userRouter from "./routes/users.routes";
import planRouter from "./routes/plan.routes";
import dotenv from "dotenv";
import cors, { CorsOptions } from "cors";
import categoryRouter from "./routes/categories.routes";
import offerRouter from "./routes/offer.routes";
import transactionRouter from "./routes/transaction.routes";
import installmentRouter from "./routes/installment.routes";
import billingRouter from "./routes/billing.routes";
import creditRouter from "./routes/credit.routes";
import dashboardRouter from "./routes/dashboard.routes";
import voucherRouters from "./routes/vouchers.routes";
import auditoriaRouter from "./routes/auditoria.routes"; // FASE 2.1 - Sistema de Auditoria
import permissionsRouter from "./routes/permissions.routes";

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: allowedOrigins.length === 0
    ? defaultAllowedOrigins
    : (allowedOrigins.includes("*") ? true : allowedOrigins),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
};

app.use(cors(corsOptions));

app.use(express.json());

// Servir arquivos estáticos (ADICIONAR ESTA LINHA)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas da sua aplicação
app.get("/", (_req:Request, res:Response) => {
  res.send("Running...!");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
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
app.use("/auditoria", auditoriaRouter); // FASE 2.1 - Sistema de Auditoria
app.use("/permissions", permissionsRouter);
app.use("/api/permissions", permissionsRouter);

const PORT = Number(process.env.PORT) || 3024;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
  console.log("📁 Servindo arquivos estáticos de: /uploads");
  console.log(
    `🌐 CORS habilitado para: ${
      allowedOrigins.length === 0
        ? defaultAllowedOrigins.join(", ")
        : (allowedOrigins.includes("*") ? "*" : allowedOrigins.join(", "))
    }`
  );
});
