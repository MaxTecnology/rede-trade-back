import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { enviarEmail } from "../utils/utils";
import { upload } from "../middlewares/upload";
import prisma from "../lib/prisma"; // ✅ USANDO SINGLETON
import {
  Prisma,
  UsuarioAuthTipo,
  FilialTipo,
  TipoDocumento,
  ClienteStatus,
  Usuarios as UsuarioModel,
  Matriz as MatrizModel,
  Filial as FilialModel,
  Cliente as ClienteModel,
  TipoConta as TipoContaModel,
  Conta as ContaModel,
} from "@prisma/client";

type TxClient = Prisma.TransactionClient;

const trimOrNull = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const text = value.toString().trim();
  return text.length ? text : null;
};

const cleanObject = (obj: Record<string, any>) => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== "") {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length ? cleaned : null;
};

const buildContatoJson = (args: {
  nomeContato?: string | null;
  telefone?: string | null;
  celular?: string | null;
  emailContato?: string | null;
  emailSecundario?: string | null;
  site?: string | null;
}): Prisma.InputJsonValue | undefined => {
  const result = cleanObject({
    nomeContato: trimOrNull(args.nomeContato),
    telefone: trimOrNull(args.telefone),
    celular: trimOrNull(args.celular),
    emailContato: trimOrNull(args.emailContato),
    emailSecundario: trimOrNull(args.emailSecundario),
    site: trimOrNull(args.site),
  });
  return result ?? undefined;
};

const buildEnderecoJson = (args: {
  logradouro?: string | null;
  numero?: number | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  regiao?: string | null;
}): Prisma.InputJsonValue | undefined => {
  const result = cleanObject({
    logradouro: trimOrNull(args.logradouro),
    numero: args.numero ?? null,
    complemento: trimOrNull(args.complemento),
    bairro: trimOrNull(args.bairro),
    cidade: trimOrNull(args.cidade),
    estado: trimOrNull(args.estado),
    cep: trimOrNull(args.cep),
    regiao: trimOrNull(args.regiao),
  });
  return result ?? undefined;
};

const parseNumeric = (value?: string | number | null) => {
  if (value === undefined || value === null) return undefined;
  const text = value.toString().trim();
  if (!text) return undefined;
  const normalized = text.replace(/[\s\.](?=\d{3})/g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ensureMatrizRecord = async (
  tx: TxClient,
  usuario: UsuarioModel
): Promise<MatrizModel> => {
  const existing = await tx.matriz.findFirst({ where: { usuarioId: usuario.idUsuario } });
  if (existing) {
    return existing;
  }

  const contatos = buildContatoJson({
    nomeContato: usuario.nomeContato,
    telefone: usuario.telefone,
    celular: usuario.celular,
    emailContato: usuario.emailContato,
    emailSecundario: usuario.emailSecundario,
    site: usuario.site,
  });

  const endereco = buildEnderecoJson({
    logradouro: usuario.logradouro,
    numero: usuario.numero,
    complemento: usuario.complemento,
    bairro: usuario.bairro,
    cidade: usuario.cidade,
    estado: usuario.estado,
    cep: usuario.cep,
    regiao: usuario.regiao,
  });

  return tx.matriz.create({
    data: {
      nome: trimOrNull(usuario.nomeFantasia) || usuario.nome,
      cnpj: trimOrNull(usuario.cnpj) || trimOrNull(usuario.cpf) || `MZ-${usuario.idUsuario}`,
      descricao: trimOrNull(usuario.descricao),
      contatos,
      endereco,
      usuarioId: usuario.idUsuario,
    },
  });
};

const ensureFilialRecord = async (
  tx: TxClient,
  usuario: UsuarioModel,
  matriz: MatrizModel,
  tipo: FilialTipo,
  filialPai?: FilialModel | null
): Promise<FilialModel> => {
  if (usuario.filialId) {
    const filial = await tx.filial.findUnique({ where: { id: usuario.filialId } });
    if (filial) {
      return filial;
    }
  }

  const existing = await tx.filial.findFirst({ where: { usuarioId: usuario.idUsuario } });
  if (existing) {
    return existing;
  }

  const contatos = buildContatoJson({
    nomeContato: usuario.nomeContato,
    telefone: usuario.telefone,
    celular: usuario.celular,
    emailContato: usuario.emailContato,
    emailSecundario: usuario.emailSecundario,
    site: usuario.site,
  });

  const endereco = buildEnderecoJson({
    logradouro: usuario.logradouro,
    numero: usuario.numero,
    complemento: usuario.complemento,
    bairro: usuario.bairro,
    cidade: usuario.cidade,
    estado: usuario.estado,
    cep: usuario.cep,
    regiao: usuario.regiao,
  });

  const novaFilial = await tx.filial.create({
    data: {
      matrizId: matriz.id,
      filialPaiId: filialPai?.id ?? null,
      tipo,
      nomeFantasia: trimOrNull(usuario.nomeFantasia) || usuario.nome,
      cnpj: trimOrNull(usuario.cnpj) || trimOrNull(usuario.cpf) || `FL-${usuario.idUsuario}`,
      contatos,
      endereco,
      configuracoes: undefined,
      usuarioId: usuario.idUsuario,
    },
  });

  await tx.usuarios.update({
    where: { idUsuario: usuario.idUsuario },
    data: {
      filialId: novaFilial.id,
      tipoAuth: UsuarioAuthTipo.OPERACIONAL,
    },
  });

  return novaFilial;
};

const ensureFilialByUsuario = async (tx: TxClient, usuario: UsuarioModel): Promise<FilialModel | null> => {
  if (!usuario) return null;
  if (usuario.filialId) {
    const filial = await tx.filial.findUnique({ where: { id: usuario.filialId } });
    if (filial) return filial;
  }
  return tx.filial.findFirst({ where: { usuarioId: usuario.idUsuario } });
};

const ensureTipoConta = async (
  tx: TxClient,
  tipoDaConta: string,
  prefixoConta: string
): Promise<TipoContaModel> => {
  const existing = await tx.tipoConta.findFirst({ where: { tipoDaConta } });
  if (existing) return existing;

  return tx.tipoConta.create({
    data: {
      tipoDaConta,
      prefixoConta,
      descricao: `${tipoDaConta} gerada automaticamente`,
      permissoes: JSON.stringify([]),
    },
  });
};

const ensureNumeroConta = async (tx: TxClient, prefixo: string): Promise<string> => {
  const contasExistentes = await tx.conta.findMany({
    where: { numeroConta: { startsWith: prefixo } },
    select: { numeroConta: true },
    orderBy: { numeroConta: "desc" },
    take: 1,
  });

  let proximoNumero = 1;
  if (contasExistentes.length > 0) {
    const numeroExtraido = contasExistentes[0].numeroConta.replace(prefixo, "");
    proximoNumero = parseInt(numeroExtraido, 10) + 1;
  }

  return `${prefixo}${proximoNumero.toString().padStart(6, "0")}`;
};

const ensureMatrizAccount = async (
  tx: TxClient,
  usuario: UsuarioModel,
  matriz: MatrizModel
): Promise<ContaModel> => {
  const existing = await tx.conta.findFirst({ where: { usuarioId: usuario.idUsuario } });
  if (existing) return existing;

  const tipoConta = await ensureTipoConta(tx, "Matriz", "MTZ");
  const numeroConta = await ensureNumeroConta(tx, "MTZ");

  return tx.conta.create({
    data: {
      usuarioId: usuario.idUsuario,
      matrizId: matriz.id,
      filialId: null,
      clienteId: null,
      tipoContaId: tipoConta.idTipoConta,
      numeroConta,
      nomeFranquia: matriz.nome,
      limiteCredito: 0,
      limiteUtilizado: 0,
      limiteDisponivel: 0,
      saldoPermuta: 0,
      saldoDinheiro: 0,
      limiteVendaMensal: 0,
      limiteVendaTotal: 0,
      limiteVendaEmpresa: 0,
      valorVendaMensalAtual: 0,
      valorVendaTotalAtual: 0,
      dataDeAfiliacao: new Date(),
      diaFechamentoFatura: 25,
      dataVencimentoFatura: 10,
      permissoesEspecificas: JSON.stringify([]),
      status: "ATIVA",
    },
  });
};

const ensureFilialConta = async (
  tx: TxClient,
  usuario: UsuarioModel,
  matriz: MatrizModel,
  filial: FilialModel,
  options: {
    saldoPermuta?: number;
    saldoDinheiro?: number;
    limiteCredito?: number;
    limiteUtilizado?: number;
    limiteVendaMensal?: number;
    limiteVendaTotal?: number;
    limiteVendaEmpresa?: number;
    planoId?: number | null;
    dataVencimentoFatura?: number;
    taxaRepasseMatriz?: number;
    formaPagamentoPlano?: string | null;
    valorPlanoPermuta?: number;
    valorPlanoDinheiro?: number;
  }
): Promise<ContaModel> => {
  const existing = await tx.conta.findFirst({ where: { usuarioId: usuario.idUsuario } });
  if (existing) return existing;

  const tipoConta = await ensureTipoConta(tx, "Franquia", "FRQ");
  const numeroConta = await ensureNumeroConta(tx, "FRQ");

  const limiteCredito = options.limiteCredito ?? 0;
  const limiteUtilizado = options.limiteUtilizado ?? 0;
  const limiteDisponivel = Math.max(0, limiteCredito - limiteUtilizado);

  return tx.conta.create({
    data: {
      usuarioId: usuario.idUsuario,
      matrizId: matriz.id,
      filialId: filial.id,
      clienteId: null,
      tipoContaId: tipoConta.idTipoConta,
      numeroConta,
      nomeFranquia: filial.nomeFantasia,
      limiteCredito,
      limiteUtilizado,
      limiteDisponivel,
      saldoPermuta: options.saldoPermuta ?? 0,
      saldoDinheiro: options.saldoDinheiro ?? 0,
      formaPagamentoPlano: options.formaPagamentoPlano ?? "0",
      valorPlanoPermuta: options.valorPlanoPermuta ?? 0,
      valorPlanoDinheiro: options.valorPlanoDinheiro ?? 0,
      limiteVendaMensal: options.limiteVendaMensal ?? 0,
      limiteVendaTotal: options.limiteVendaTotal ?? 0,
      limiteVendaEmpresa: options.limiteVendaEmpresa ?? 0,
      valorVendaMensalAtual: 0,
      valorVendaTotalAtual: 0,
      dataDeAfiliacao: new Date(),
      diaFechamentoFatura: options.dataVencimentoFatura ?? 25,
      dataVencimentoFatura: options.dataVencimentoFatura ?? 10,
      planoId: options.planoId ?? null,
      taxaRepasseMatriz: options.taxaRepasseMatriz ?? 0,
      permissoesEspecificas: JSON.stringify([]),
      status: "ATIVA",
    },
  });
};

const createClienteRecord = async (
  tx: TxClient,
  usuario: UsuarioModel,
  matriz: MatrizModel,
  filial: FilialModel
): Promise<ClienteModel> => {
  const contatos = buildContatoJson({
    nomeContato: usuario.nomeContato,
    telefone: usuario.telefone,
    celular: usuario.celular,
    emailContato: usuario.emailContato,
    emailSecundario: usuario.emailSecundario,
    site: usuario.site,
  });

  const endereco = buildEnderecoJson({
    logradouro: usuario.logradouro,
    numero: usuario.numero,
    complemento: usuario.complemento,
    bairro: usuario.bairro,
    cidade: usuario.cidade,
    estado: usuario.estado,
    cep: usuario.cep,
    regiao: usuario.regiao,
  });

  const documento = trimOrNull(usuario.cpf) || trimOrNull(usuario.cnpj) || `CL-${usuario.idUsuario}`;
  const tipoDocumento = documento && documento.length === 11 ? TipoDocumento.CPF : TipoDocumento.CNPJ;

  const cliente = await tx.cliente.create({
    data: {
      matrizId: matriz.id,
      filialId: filial.id,
      razaoSocial: trimOrNull(usuario.razaoSocial) || usuario.nome,
      nomeFantasia: trimOrNull(usuario.nomeFantasia) || usuario.nome,
      documento,
      tipoDocumento,
      situacao: ClienteStatus.ATIVO,
      contatos,
      endereco,
      limitesPadrao: undefined,
    },
  });

  await tx.usuarios.update({
    where: { idUsuario: usuario.idUsuario },
    data: {
      tipoAuth: UsuarioAuthTipo.CLIENTE,
      clienteId: cliente.id,
      filialId: filial.id,
    },
  });

  return cliente;
};

interface FilterParams {
  [key: string]: any;
}

export const getTipoDeContaUsuario = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10); // Certifique-se de usar o parâmetro correto

    const usuarioComTipoDaConta = await prisma.usuarios.findUnique({
      where: {
        idUsuario: userId,
      },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
          },
        },
      },
    });

    if (!usuarioComTipoDaConta) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const tipoDeConta = usuarioComTipoDaConta.conta?.tipoDaConta?.tipoDaConta;

    if (!tipoDeConta) {
      return res
        .status(404)
        .json({ error: "Tipo de conta não encontrado para este usuário" });
    }

    res.json({ tipoDeConta });
  } catch (error) {
    console.error("Erro ao buscar tipo de conta do usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para upload de imagem separada
export const uploadImagem = async (req: Request, res: Response) => {
  try {
    const imagemFile = Array.isArray(req.files) ? req.files.find((file: any) => file.fieldname === 'image') : null;
    
    if (!imagemFile) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const imagePath = `/uploads/images/${imagemFile.filename}`;
    
    res.json({
      message: 'Upload realizado com sucesso',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Função criarUsuario com middleware de upload
export const criarUsuario = [
  upload.single('imagem'),
  async (req: Request, res: Response) => {
    try {
      const {
        nome,
        cpf,
        email,
        senha,
        statusConta,
        reputacao,
        razaoSocial,
        nomeFantasia,
        cnpj,
        inscEstadual,
        inscMunicipal,
        mostrarNoSite,
        descricao,
        tipo,
        tipoDeMoeda,
        status,
        restricao,
        nomeContato,
        telefone,
        celular,
        emailContato,
        emailSecundario,
        site,
        logradouro,
        numero,
        cep,
        complemento,
        bairro,
        cidade,
        estado,
        regiao,
        aceitaOrcamento,
        aceitaVoucher,
        tipoOperacao,
        categoriaId,
        subcategoriaId,
        usuarioCriadorId,
        // Campos específicos para conta (quando for gerente)
        limiteCredito,
        taxaGerente,
        dataVencimentoFatura,
        planoId,
        gerente,
        formaPagamento,
        saldoDinheiro,
        saldoPermuta,
        limiteVendaMensal,
        limiteVendaTotal,
        limiteVendaEmpresa
      } = req.body;

      // Verificar se tem imagem enviada e definir o caminho
      let imagemPath: string | null = null;
      
      // Com upload.single('imagem'), o arquivo fica em req.file (singular)
      if (req.file) {
        imagemPath = `/uploads/images/${req.file.filename}`;
        console.log("📸 Imagem processada:", req.file.filename, "-> Path:", imagemPath);
      } else {
        console.log("⚠️  Nenhuma imagem enviada no req.file");
      }

      if (typeof senha !== "string") {
        return res.status(400).json({ error: "A senha deve ser uma string." });
      }

      // Verificar se já existe usuário com mesmo email ou CPF


      let matrizId: number | null = null;

      // Lógica para determinar matriz
      if (usuarioCriadorId) {
        
        const usuarioCriador = await prisma.usuarios.findUnique({
          where: { idUsuario: parseInt(usuarioCriadorId, 10) },
          include: {
            conta: {
              include: {
                tipoDaConta: true,
              },
            },
          },
        });

        if (!usuarioCriador) {
          return res
            .status(404)
            .json({ error: "Usuário criador não encontrado." });
        }

        const tipoConta = usuarioCriador.conta?.tipoDaConta?.tipoDaConta;
        
        if (tipoConta === "Matriz") {
          matrizId = usuarioCriador.idUsuario;
        } else if (usuarioCriador.matrizId) {
          matrizId = usuarioCriador.matrizId;
        } else {
          // Buscar matriz na hierarquia
          let usuarioAtual = usuarioCriador;
          let tentativas = 0;
          const maxTentativas = 10;

          while (
            usuarioAtual?.conta?.tipoDaConta?.tipoDaConta !== "Matriz" &&
            usuarioAtual.usuarioCriadorId &&
            tentativas < maxTentativas
          ) {
            tentativas++;
            usuarioAtual = await prisma.usuarios.findUnique({
              where: { idUsuario: usuarioAtual.usuarioCriadorId },
              include: {
                conta: {
                  include: {
                    tipoDaConta: true,
                  },
                },
              },
            }) as any;

            if (!usuarioAtual) break;
          }

          if (usuarioAtual?.conta?.tipoDaConta?.tipoDaConta === "Matriz") {
            matrizId = usuarioAtual.idUsuario;
          } else {
            return res
              .status(500)
              .json({ error: "Não foi possível encontrar a matriz associada." });
          }
        }
      }

      // FUNÇÃO PARA BUSCAR TIPO DE CONTA DINAMICAMENTE
      const buscarTipoConta = async (client: TxClient, tipoUsuario: string): Promise<number> => {
        const normalized = tipoUsuario.toLowerCase();
        let key = tipoUsuario;

        if (normalized.includes("agencia")) {
          key = normalized.includes("master") ? "AgenciaMaster" : "Agencia";
        } else if (normalized.includes("franquia")) {
          key = normalized.includes("master") ? "FranquiaMaster" : "Franquia";
        }

        const mapeamentoTipos: Record<string, { tipoConta: string; prefixo: string }> = {
          Gerente: { tipoConta: "Premium", prefixo: "GER" },
          Associado: { tipoConta: "Associado", prefixo: "ASS" },
          Matriz: { tipoConta: "Matriz", prefixo: "MTZ" },
          Franquia: { tipoConta: "Franquia", prefixo: "FRQ" },
          FranquiaMaster: { tipoConta: "Franquia", prefixo: "FRQ" },
          Agencia: { tipoConta: "Franquia", prefixo: "FRQ" },
          AgenciaMaster: { tipoConta: "Franquia", prefixo: "FRQ" },
        };

        const config = mapeamentoTipos[key] || { tipoConta: tipoUsuario, prefixo: "CNT" };
        const tipoConta = await ensureTipoConta(client, config.tipoConta, config.prefixo);
        return tipoConta.idTipoConta;
      };

      // FUNÇÃO PARA GERAR NÚMERO DE CONTA ÚNICO
      const gerarNumeroConta = (client: TxClient, prefixo: string) => ensureNumeroConta(client, prefixo);

      // Usar transação para garantir consistência
      const resultado = await prisma.$transaction(async (tx) => {
        const usuarioExistente = await tx.usuarios.findFirst({
          where: {
            OR: [
              { email: email },
              { cpf: cpf },
            ],
          },
        });

        if (usuarioExistente) {
          throw new Error("Usuário com o mesmo e-mail ou CPF já existe.");
        }
        // Criptografar senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Dados básicos do usuário
        const dadosUsuario = {
          nome,
          cpf,
          email,
          senha: hashedPassword,
          imagem: imagemPath,
          statusConta: statusConta === 'true' || statusConta === true,
          reputacao: parseInt(reputacao) || 0,
          razaoSocial,
          nomeFantasia,
          cnpj,
          inscEstadual,
          inscMunicipal,
          mostrarNoSite: mostrarNoSite === 'true' || mostrarNoSite === true,
          descricao,
          tipo,
          tipoDeMoeda: tipoDeMoeda || 'BRL',
          status: status === 'true' || status === true,
          restricao,
          nomeContato,
          telefone,
          celular,
          emailContato,
          emailSecundario,
          site,
          logradouro,
          numero: numero ? parseInt(numero, 10) : null,
          cep,
          complemento,
          bairro,
          cidade,
          estado,
          regiao,
          aceitaOrcamento: aceitaOrcamento === 'true' || aceitaOrcamento === true,
          aceitaVoucher: aceitaVoucher === 'true' || aceitaVoucher === true,
          tipoOperacao: tipoOperacao ? parseInt(tipoOperacao, 10) : 1,
          categoriaId: categoriaId ? parseInt(categoriaId, 10) : null,
          subcategoriaId: subcategoriaId ? parseInt(subcategoriaId, 10) : null,
          // CORREÇÃO: Salvar taxaGerente como taxaComissaoGerente (em centésimos)
          taxaComissaoGerente: taxaGerente ? Math.round(parseFloat(taxaGerente) * 100) : 0,
          tipoAuth: UsuarioAuthTipo.OPERACIONAL,
          clienteId: null,
          filialId: null,
        };

        // Adicionar campos específicos se usuarioCriadorId existir
        if (usuarioCriadorId) {
          (dadosUsuario as any).usuarioCriadorId = parseInt(usuarioCriadorId, 10);
          (dadosUsuario as any).matrizId = matrizId;
        }


        // Criar usuário base
        const novoUsuario = await tx.usuarios.create({
          data: dadosUsuario,
        });

        const tipoNormalizado = (tipo || "").toLowerCase();
        const criadorId = usuarioCriadorId ? parseInt(usuarioCriadorId, 10) : null;
        const criadorUsuario = criadorId
          ? await tx.usuarios.findUnique({ where: { idUsuario: criadorId } })
          : null;

        let matrizRecord: MatrizModel | null = null;
        let matrizUsuarioBase: UsuarioModel | null = null;
        let filialRecord: FilialModel | null = null;
        let clienteRecord: ClienteModel | null = null;
        let novaConta: any = null;

        const isMatriz = tipoNormalizado === "matriz";
        const isFranquia = tipoNormalizado.includes("franquia");
        const isAgencia = tipoNormalizado.includes("agencia");
        const isFilialMaster = (isFranquia || isAgencia) && tipoNormalizado.includes("master");
        const isFilialComum = (isFranquia || isAgencia) && !tipoNormalizado.includes("master") && (isFranquia || isAgencia);
        const isAssociado = tipoNormalizado === "associado";

        if (isMatriz) {
          matrizRecord = await ensureMatrizRecord(tx, novoUsuario);
          matrizUsuarioBase = novoUsuario;
          novaConta = await ensureMatrizAccount(tx, novoUsuario, matrizRecord);
          await tx.usuarios.update({
            where: { idUsuario: novoUsuario.idUsuario },
            data: {
              tipoAuth: UsuarioAuthTipo.OPERACIONAL,
              matrizId: novoUsuario.idUsuario,
              clienteId: null,
              filialId: null,
            },
          });
        } else {
          if (!matrizId) {
            throw new Error("Matriz não identificada para o cadastro.");
          }

          const matrizUsuario = await tx.usuarios.findUnique({
            where: { idUsuario: matrizId },
          });

          if (!matrizUsuario) {
            throw new Error("Matriz associada não encontrada.");
          }

          matrizRecord = await ensureMatrizRecord(tx, matrizUsuario);
          matrizUsuarioBase = matrizUsuario;
        }

        if (isFilialMaster || isFilialComum) {
          const filialPai = isFilialMaster
            ? null
            : criadorUsuario
            ? await ensureFilialByUsuario(tx, criadorUsuario)
            : null;

          filialRecord = await ensureFilialRecord(
            tx,
            novoUsuario,
            matrizRecord!,
            isFilialMaster ? FilialTipo.MASTER : FilialTipo.COMUM,
            filialPai ?? undefined
          );

          await tx.usuarios.update({
            where: { idUsuario: novoUsuario.idUsuario },
            data: {
              tipoAuth: UsuarioAuthTipo.OPERACIONAL,
              filialId: filialRecord.id,
            },
          });

          const valorPermuta = parseNumeric(saldoPermuta) ?? 0;
          const valorDinheiro = parseNumeric(saldoDinheiro) ?? 0;
          const limiteCreditoAgencia = parseNumeric(limiteCredito) ?? 0;
          const limiteVendaMensalAgencia = parseNumeric(limiteVendaMensal) ?? 0;
          const limiteVendaTotalAgencia = parseNumeric(limiteVendaTotal) ?? 0;
          const limiteVendaEmpresaAgencia = parseNumeric(limiteVendaEmpresa) ?? 0;
          const dataVencimentoAgencia = dataVencimentoFatura ? parseInt(dataVencimentoFatura, 10) : 10;
          const planoIdNumero = planoId ? parseInt(planoId, 10) : null;
          const taxaRepasse = parseNumeric(taxaGerente) ?? 0;

          await ensureMatrizAccount(tx, matrizUsuarioBase!, matrizRecord!);

          const pagamentoSelecionado =
            formaPagamento ??
            (valorPermuta > 0 && valorDinheiro > 0
              ? "50"
              : valorPermuta > 0
              ? "100"
              : "0");

          const contaFilial = await ensureFilialConta(tx, novoUsuario, matrizRecord!, filialRecord, {
            saldoPermuta: 0,
            saldoDinheiro: 0,
            limiteCredito: limiteCreditoAgencia,
            limiteVendaMensal: limiteVendaMensalAgencia,
            limiteVendaTotal: limiteVendaTotalAgencia,
            limiteVendaEmpresa: limiteVendaEmpresaAgencia,
            planoId: planoIdNumero,
            dataVencimentoFatura: dataVencimentoAgencia,
            taxaRepasseMatriz: taxaRepasse,
            formaPagamentoPlano: pagamentoSelecionado,
            valorPlanoPermuta: valorPermuta,
            valorPlanoDinheiro: valorDinheiro,
          });

          novaConta = contaFilial;
        }

        if (isAssociado) {
          const filialParaCliente = filialRecord
            ? filialRecord
            : criadorUsuario
            ? await ensureFilialByUsuario(tx, criadorUsuario)
            : null;

          if (!filialParaCliente) {
            throw new Error("Filial responsável não encontrada para o associado.");
          }

          clienteRecord = await createClienteRecord(tx, novoUsuario, matrizRecord!, filialParaCliente);
          filialRecord = filialParaCliente;
        } else if (!isMatriz && !isFilialMaster && !isFilialComum) {
          const filialPadrao = filialRecord
            ? filialRecord
            : criadorUsuario
            ? await ensureFilialByUsuario(tx, criadorUsuario)
            : null;

          if (filialPadrao) {
            await tx.usuarios.update({
              where: { idUsuario: novoUsuario.idUsuario },
              data: { filialId: filialPadrao.id },
            });
            filialRecord = filialPadrao;
          }
        }

        // CRIAR CONTA AUTOMATICAMENTE BASEADO NO TIPO
        if (tipoNormalizado === "gerente") {
          const filialParaConta = filialRecord
            ? filialRecord
            : criadorUsuario
            ? await ensureFilialByUsuario(tx, criadorUsuario)
            : null;

          // Buscar tipo de conta dinamicamente
          const tipoContaId = await buscarTipoConta(tx, 'Gerente');

          // Gerar número único para a conta
          const numeroConta = await gerarNumeroConta(tx, 'GER');

          // Dados da conta
          const dadosConta = {
            numeroConta: numeroConta,
            tipoContaId: tipoContaId, // Busca dinâmica
            usuarioId: novoUsuario.idUsuario,
            nomeFranquia: filialParaConta?.nomeFantasia || nomeFantasia || nome,
            limiteCredito: limiteCredito ? parseFloat(limiteCredito.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 0,
            taxaRepasseMatriz: 0, // CORREÇÃO: taxaGerente agora vai para taxaComissaoGerente na tabela Usuarios
            dataVencimentoFatura: dataVencimentoFatura ? parseInt(dataVencimentoFatura, 10) : 10,
            diaFechamentoFatura: 25, // Padrão
            planoId: planoId ? parseInt(planoId, 10) : null,
            gerenteContaId: usuarioCriadorId ? parseInt(usuarioCriadorId, 10) : null,
            // Valores do formulário ou padrão
            limiteUtilizado: 0,
            saldoPermuta: saldoPermuta ? parseFloat(saldoPermuta.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 0,
            saldoDinheiro: saldoDinheiro ? parseFloat(saldoDinheiro.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 0,
            formaPagamentoPlano: formaPagamento ?? "0",
            valorPlanoPermuta: 0,
            valorPlanoDinheiro: 0,
            limiteVendaMensal: limiteVendaMensal ? parseFloat(limiteVendaMensal.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 100000,
            limiteVendaTotal: limiteVendaTotal ? parseFloat(limiteVendaTotal.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 500000,
            limiteVendaEmpresa: limiteVendaEmpresa ? parseFloat(limiteVendaEmpresa.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 250000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            dataDeAfiliacao: new Date(),
            permissoesEspecificas: JSON.stringify(["ACCOUNT_MANAGEMENT", "REPORT_ACCESS"]),
            clienteId: null,
            filialId: filialParaConta?.id ?? null,
            matrizId: matrizRecord?.id ?? null,
          };

          novaConta = await tx.conta.create({
            data: dadosConta,
          });

        }

        // CRIAR CONTA PARA ASSOCIADOS
        else if (isAssociado) {

          // Buscar tipo de conta dinamicamente
          const tipoContaId = await buscarTipoConta(tx, 'Associado');

          // Gerar número único para a conta com prefixo ASS
          const numeroConta = await gerarNumeroConta(tx, 'ASS');

          // Calcular saldo inicial baseado na forma de pagamento e plano
          let saldoPermutaInicial = 0;
          let limiteUtilizadoInicial = 0;
          let limiteCreditoCalculado = limiteCredito ? parseFloat(limiteCredito.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 5000;

          // Aplicar débito baseado na forma de pagamento
          if (planoId && formaPagamento) {
            const plano = await tx.plano.findUnique({
              where: { idPlano: parseInt(planoId, 10) }
            });

            if (plano) {
              let valorDebito = 0;

              if (formaPagamento === "100") {
                // 100% permuta - debita valor total do plano
                valorDebito = plano.taxaInscricao;
              } else if (formaPagamento === "50") {
                // Permuta/Dinheiro - usa valor informado no campo saldoPermuta
                if (saldoPermuta) {
                  valorDebito = parseFloat(saldoPermuta.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
                }
              }
              // formaPagamento === "0" (dinheiro) - não aplica débito

              if (valorDebito > 0) {
                // Aplicar débito no saldoPermuta (fica negativo)
                saldoPermutaInicial = -valorDebito;
                
                // Se limite de crédito for 0, usar o valor do débito como limite e como utilizado
                if (limiteCreditoCalculado === 0) {
                  limiteCreditoCalculado = valorDebito;
                  limiteUtilizadoInicial = valorDebito;
                } else if (limiteCreditoCalculado >= valorDebito) {
                  limiteUtilizadoInicial = valorDebito;
                }
              }
            }
          }

          const valorPlanoPermutaAssociado = saldoPermuta ? parseFloat(saldoPermuta.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) || 0 : 0;
          const valorPlanoDinheiroAssociado = saldoDinheiro ? parseFloat(saldoDinheiro.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) || 0 : 0;

          // Dados da conta para associado
          const dadosConta = {
            numeroConta: numeroConta,
            tipoContaId: tipoContaId, // Busca dinâmica
            usuarioId: novoUsuario.idUsuario,
            nomeFranquia: filialRecord?.nomeFantasia || nomeFantasia || nome,
            limiteCredito: limiteCreditoCalculado,
            taxaRepasseMatriz: 0, // Associados não têm taxa de repasse
            dataVencimentoFatura: 10, // Padrão
            diaFechamentoFatura: 25, // Padrão
            planoId: planoId ? parseInt(planoId, 10) : 1, // Plano básico como padrão
            gerenteContaId: gerente ? parseInt(gerente, 10) : null,
            // Valores calculados baseados na forma de pagamento
            limiteUtilizado: limiteUtilizadoInicial,
            saldoPermuta: saldoPermutaInicial,
            saldoDinheiro: saldoDinheiro ? parseFloat(saldoDinheiro.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 0,
            formaPagamentoPlano: formaPagamento ?? "0",
            valorPlanoPermuta: valorPlanoPermutaAssociado,
            valorPlanoDinheiro: valorPlanoDinheiroAssociado,
            limiteVendaMensal: limiteVendaMensal ? parseFloat(limiteVendaMensal.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 50000,
            limiteVendaTotal: limiteVendaTotal ? parseFloat(limiteVendaTotal.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 200000,
            limiteVendaEmpresa: limiteVendaEmpresa ? parseFloat(limiteVendaEmpresa.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) : 100000,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            dataDeAfiliacao: new Date(),
            permissoesEspecificas: JSON.stringify(["BASIC_OPERATIONS", "PROFILE_MANAGEMENT"]),
            clienteId: clienteRecord?.id ?? null,
            filialId: filialRecord?.id ?? null,
            matrizId: matrizRecord?.id ?? null,
          };

          novaConta = await tx.conta.create({
            data: dadosConta,
          });

        }

        return {
          usuario: novoUsuario,
          conta: novaConta,
          matriz: matrizRecord,
          filial: filialRecord,
          cliente: clienteRecord,
        };
      });

      const { usuario: usuarioCriado, conta: contaCriada, matriz: matrizCriada, filial: filialCriada, cliente: clienteCriado } = resultado;

      // Buscar usuário criado com relacionamentos
      const usuarioCompleto = await prisma.usuarios.findUnique({
        where: { idUsuario: usuarioCriado.idUsuario },
        include: {
          categoria: true,
          subcategoria: true,
          conta: {
            include: {
              tipoDaConta: true,
              plano: true,
            }
          },
          clienteAuth: true,
          filialAuth: {
            include: { matriz: true },
          },
          matrizPerfil: true,
          matriz: {
            select: {
              nome: true,
              celular: true,
              email: true,
              nomeFantasia: true,
              cnpj: true,
              inscEstadual: true,
              inscMunicipal: true,
              idUsuario: true,
            },
          },
        },
      });

      // Enviar email de boas-vindas
      try {
        const destinatario = email;
        const assunto = "Bem-vindo à Plataforma RedeTrade!";
        
        let tipoUsuario = tipo || 'Usuário';
        const nomeCompleto = nome || nomeContato || 'Usuário';
        
        const corpo = `Olá ${nomeCompleto},

Bem-vindo à Plataforma RedeTrade! Agradecemos por escolher nossa plataforma para suas necessidades comerciais.

Você foi cadastrado como: ${tipoUsuario}
${resultado.conta ? `Número da conta: ${resultado.conta.numeroConta}` : ''}

Acesse sua conta usando as seguintes credenciais:
E-mail: ${email}
Senha: ${senha}

${nomeFantasia ? `Empresa: ${nomeFantasia}` : ''}
${razaoSocial ? `Razão Social: ${razaoSocial}` : ''}

Estamos entusiasmados em tê-lo a bordo. Se precisar de assistência ou tiver alguma dúvida, não hesite em entrar em contato conosco.

Atenciosamente,
Equipe RedeTrade`;

        await enviarEmail(destinatario, assunto, corpo);
        
      } catch (emailError) {
      }
      
      
      if (!usuarioCompleto) {
        throw new Error('Não foi possível carregar o usuário recém-criado.');
      }

      const contaResolved = usuarioCompleto.conta
        ? usuarioCompleto.conta
        : contaCriada
        ? contaCriada
        : {
            idConta: null,
            numeroConta: null,
            nomeFranquia:
              filialCriada?.nomeFantasia ||
              matrizCriada?.nome ||
              usuarioCompleto.nomeFantasia ||
              usuarioCompleto.nome,
            limiteCredito: 0,
            limiteUtilizado: 0,
            saldoPermuta: 0,
            saldoDinheiro: 0,
            limiteVendaMensal: 0,
            limiteVendaTotal: 0,
            limiteVendaEmpresa: 0,
            valorVendaMensalAtual: 0,
            valorVendaTotalAtual: 0,
            tipoDaConta: null,
            plano: null,
          };

      return res.status(201).json({
        ...usuarioCompleto,
        senha: undefined, // Não retornar a senha na resposta
        conta: contaResolved,
        clienteAuth: usuarioCompleto.clienteAuth || clienteCriado || null,
        filialAuth: usuarioCompleto.filialAuth || filialCriada || null,
        matrizPerfil: usuarioCompleto.matrizPerfil || matrizCriada || null,
      });
    } catch (error: any) {
      console.error("❌ Erro ao criar usuário:", error);
      return res.status(500).json({ 
        error: "Erro interno do servidor.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
];

export const buscarFranquiasPorMatriz = async (req: Request, res: Response) => {
  try {
    const { matrizId } = req.params;

    // Buscar todas as franquias e franquias masters pela matriz
    const franquias = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(matrizId, 10),
        conta: {
          tipoDaConta: {
            tipoDaConta: { in: ["Franquia", "Franquia Master"] },
          },
        },
      },
      select: {
        idUsuario: true,
        usuarioCriadorId: true,
        matrizId: true,
        nome: true,
        cpf: true,
        email: true,
        imagem: true,
        statusConta: true,
        reputacao: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        inscEstadual: true,
        inscMunicipal: true,
        mostrarNoSite: true,
        descricao: true,
        tipo: true,
        tipoDeMoeda: true,
        status: true,
        restricao: true,
        nomeContato: true,
        telefone: true,
        celular: true,
        emailContato: true,
        emailSecundario: true,
        site: true,
        logradouro: true,
        numero: true,
        cep: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        regiao: true,
        aceitaOrcamento: true,
        aceitaVoucher: true,
        tipoOperacao: true,
        categoriaId: true,
        subcategoriaId: true,
        taxaComissaoGerente: true,
        permissoesDoUsuario: true,
      },
    });
    return res.status(200).json(franquias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const listarUsuariosAssociados = async (req: Request, res: Response) => {
  try {
    const { usuarioCriadorId } = req.params;

    const usuariosAssociados = await prisma.usuarios.findMany({
      where: {
        usuarioCriadorId: parseInt(usuarioCriadorId, 10),
        conta: {
          tipoDaConta: {
            tipoDaConta: "Associado",
          },
        },
      },
      include: {
        conta: {
          include: {
            tipoDaConta: true,
            plano: true,
          }
        },
        categoria: true,
        subcategoria: true,
      }
    });
    
    // Mapeia os resultados e remove a senha (mesmo se lista vazia)
    const usuariosAssociadosSemSenha = usuariosAssociados.map((usuario) => {
      const { senha, tokenResetSenha, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    });

    // Retorna lista vazia se não houver associados ao invés de erro 404
    return res.status(200).json(usuariosAssociadosSemSenha);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export async function BuscarUsuariosParams(req: Request, res: Response) {
  try {
    const queryParams = req.query;
    const filter: FilterParams = {};
    const page = parseInt(queryParams.page as string) || 1;
    const pageSize = parseInt(queryParams.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    // Adicionar filtros baseados nos query params - BUSCA PARCIAL MELHORADA
    if (queryParams.nome) {
      const searchTerm = queryParams.nome.toString().trim();
      if (searchTerm) {
        filter["OR"] = [
          { nome: { contains: searchTerm, mode: 'insensitive' } },
          { nomeFantasia: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }
    }
    
    // Manter compatibilidade com nomeFantasia separado se necessário
    if (queryParams.nomeFantasia && !queryParams.nome) {
      filter["nomeFantasia"] = { contains: queryParams.nomeFantasia.toString(), mode: 'insensitive' };
    }
    
    if (queryParams.razaoSocial) {
      filter["razaoSocial"] = queryParams.razaoSocial.toString();
    }
    
    if (queryParams.nomeContato) {
      filter["nomeContato"] = queryParams.nomeContato.toString();
    }
    
    if (queryParams.estado) {
      filter["estado"] = queryParams.estado.toString().trim();
    }
    
    if (queryParams.cidade) {
      filter["cidade"] = { contains: queryParams.cidade.toString().trim(), mode: 'insensitive' };
    }
    
    if (queryParams.usuarioCriadorId) {
      filter["usuarioCriadorId"] = parseInt(
        queryParams.usuarioCriadorId.toString()
      );
    }

    // NOVOS FILTROS: agência e conta
    if (queryParams.agencia) {
      // Vai ser adicionado ao objeto conta mais abaixo
    }
    if (queryParams.account) {
      // Vai ser adicionado ao objeto conta mais abaixo  
    }

    // Adicionar filtro de tipo de conta
    if (queryParams.tipoDaConta) {
      const tipoConta = await prisma.tipoConta.findFirst({
        where: {
          tipoDaConta: queryParams.tipoDaConta.toString(),
        },
        include: {
          contasAssociadas: true,
        },
      });

      if (tipoConta) {
        filter["conta"] = {
          tipoDaConta: {
            tipoDaConta: tipoConta.tipoDaConta,
          },
        };
      }
    } else {
      // Se nenhum tipo de conta for fornecido, aplicar filtro para "Associado" por padrão
      const tipoContaAssociado = await prisma.tipoConta.findFirst({
        where: {
          tipoDaConta: "Associado",
        },
      });

      if (tipoContaAssociado) {
        filter["conta"] = {
          tipoDaConta: {
            tipoDaConta: tipoContaAssociado.tipoDaConta,
          },
        };
      }
    }

    // ADICIONAR FILTROS DE AGÊNCIA E CONTA AO OBJETO CONTA
    if (filter["conta"]) {
      if (queryParams.agencia) {
        filter["conta"]["nomeFranquia"] = { contains: queryParams.agencia.toString().trim(), mode: 'insensitive' };
      }
      if (queryParams.account) {
        filter["conta"]["numeroConta"] = { contains: queryParams.account.toString().trim(), mode: 'insensitive' };
      }
    }

    // Excluir o próprio usuário logado da listagem
    const excludeUserId = (req as any).excludeUserId;
    if (excludeUserId) {
      filter["idUsuario"] = {
        not: excludeUserId
      };
    }

    // Realizar a consulta no banco com paginação
    const [users, totalUsers] = await Promise.all([
      prisma.usuarios.findMany({
        where: filter,
        take: pageSize,
        skip: skip,
        include: {
          usuarioCriador: true,
          conta: true,
        },
      }),
      prisma.usuarios.count({
        where: filter,
      }),
    ]);

    const totalPages = Math.ceil(totalUsers / pageSize);
    let nextPage: string | null = null;

    // Verificar se há uma próxima página
    if (page < totalPages) {
      const nextPageNumber = page + 1;
      nextPage = `${req.protocol}://${req.get("host")}${req.baseUrl}?page=${nextPageNumber}&pageSize=${pageSize}`;
    }

    res.json({
      data: users,
      meta: {
        totalResults: totalUsers,
        totalPages: totalPages,
        currentPage: page,
        pageSize: pageSize,
        nextPage: nextPage,
      },
    });
  } catch (error) {
    console.error("Erro ao pesquisar usuários:", error);
    res.status(500).json({ error: "Erro ao pesquisar usuários" });
  }
}
