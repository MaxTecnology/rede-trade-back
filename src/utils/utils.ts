import nodemailer from "nodemailer";

const user = process.env.MAILUSER || ""
const pass = process.env.MAILPASS || ""

const transporter = nodemailer.createTransport({
  host: "mail.redetrade.com.br",
  port: 465, // A porta pode variar, ajuste conforme necessário
  secure: true, // Defina como true se estiver usando SSL/TLS
  auth: {
    user: user,
    pass: pass,
  },
});

export async function enviarEmail(
  destinatario: string,
  assunto: string,
  corpo: string,
  anexos: { filename: string; content: Buffer }[] = []
) {
  const info = await transporter.sendMail({
    from: user,
    to: destinatario,
    subject: assunto,
    text: corpo,
    attachments: anexos, // Adiciona os anexos ao email
  });

}



export function gerarToken(): string {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  let resultado = "";

  for (let i = 0; i < 3; i++) {
    // Adicionar uma letra aleatória
    resultado += letras.charAt(Math.floor(Math.random() * letras.length));
  }

  for (let i = 0; i < 3; i++) {
    // Adicionar um número aleatório
    resultado += numeros.charAt(Math.floor(Math.random() * numeros.length));
  }

  // Embaralhar a string resultante
  resultado = resultado
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return resultado;
}
// Função para calcular a data de vencimento com base no fechamento da fatura
export const calcularDataVencimento = (
  dataFechamentoFatura: number,
  diaFechamentoFatura: number
): Date => {
  const dataAtual = new Date();
  const dataVencimento = new Date(
    dataAtual.getFullYear(),
    dataAtual.getMonth(),
    dataFechamentoFatura
  );

  if (dataAtual.getDate() >= diaFechamentoFatura) {
    dataVencimento.setMonth(dataVencimento.getMonth() + 1);
  }

  return dataVencimento;
};
// Função para criar e enviar e-mail de confirmação de transação
export const enviarEmailTransacao = async (destinatario: string, assunto: string, corpo: string) => {
  try {
    await enviarEmail(destinatario, assunto, corpo);
    console.log("E-mail de confirmação de transação enviado com sucesso!");
  } catch (erro) {
    console.error("Erro ao enviar e-mail de confirmação de transação:", erro);
  }
};