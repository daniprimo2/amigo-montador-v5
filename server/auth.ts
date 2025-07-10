import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { User as SelectUser, InsertBankAccount } from "../shared/schema.js";
import { PagarmeService } from "../services/PagarmeService.js";


declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "amigo-montador-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false);
        }

        const validPassword = await comparePasswords(password, user.password);
        if (!validPassword) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        console.error('Erro no login:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }

      // Hash da senha
      const hashedPassword = await hashPassword(req.body.password);

      // Verificar se a foto de perfil foi fornecida (obrigatória)
      if (!req.files || !req.files.profilePicture) {
        return res.status(400).json({ message: "Foto de perfil é obrigatória" });
      }

      const profileFile = req.files.profilePicture as any;

      // Verificar tipo de arquivo
      if (!profileFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
      }

      // Verificar tamanho (max 5MB)
      if (profileFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
      }

      // Converter foto de perfil para base64
      let profileBuffer: Buffer;

      // Como useTempFiles está ativado, precisamos ler do arquivo temporário
      if (profileFile.tempFilePath && fs.existsSync(profileFile.tempFilePath)) {
        profileBuffer = fs.readFileSync(profileFile.tempFilePath);
      } else if (profileFile.data && profileFile.data.length > 0) {
        // Fallback para dados em memória
        profileBuffer = profileFile.data;
      } else {
        return res.status(400).json({ message: "Dados da foto de perfil não foram recebidos corretamente" });
      }

      const profilePhotoData = `data:${profileFile.mimetype};base64,${profileBuffer.toString('base64')}`;

      // Para lojistas, também verificar se o logo foi fornecido (obrigatório)
      let logoData = '';
      if (req.body.userType === 'lojista') {
        if (!req.files || !req.files.logoFile) {
          return res.status(400).json({ message: "Logo da loja é obrigatório" });
        }

        const logoFile = req.files.logoFile as any;

        // Verificar tipo de arquivo do logo
        if (!logoFile.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "O logo deve ser uma imagem" });
        }

        // Verificar tamanho (max 10MB)
        if (logoFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({ message: "O logo deve ter menos de 10MB" });
        }

        // Converter logo para base64
        let logoBuffer: Buffer;

        console.log('Processando logo da loja:', {
          nome: logoFile.name,
          tipo: logoFile.mimetype,
          tamanho: logoFile.size,
          temTempFile: !!logoFile.tempFilePath,
          tempFileExists: logoFile.tempFilePath ? fs.existsSync(logoFile.tempFilePath) : false,
          temData: !!logoFile.data,
          tamanhoData: logoFile.data ? logoFile.data.length : 0
        });

        // Como useTempFiles está ativado, precisamos ler do arquivo temporário
        if (logoFile.tempFilePath && fs.existsSync(logoFile.tempFilePath)) {
          logoBuffer = fs.readFileSync(logoFile.tempFilePath);
          console.log('Logo lido do arquivo temporário, tamanho do buffer:', logoBuffer.length);
        } else if (logoFile.data && logoFile.data.length > 0) {
          // Fallback para dados em memória
          logoBuffer = logoFile.data;
          console.log('Logo lido da memória, tamanho do buffer:', logoBuffer.length);
        } else {
          console.error('Erro: Dados do logo não foram recebidos corretamente');
          console.log('Detalhes do erro:', {
            tempFilePath: logoFile.tempFilePath,
            tempFileExists: logoFile.tempFilePath ? fs.existsSync(logoFile.tempFilePath) : false,
            hasData: !!logoFile.data,
            dataLength: logoFile.data ? logoFile.data.length : 0
          });
          return res.status(400).json({ message: "Dados do logo não foram recebidos corretamente" });
        }

        // Verificar se o buffer não está vazio
        if (!logoBuffer || logoBuffer.length === 0) {
          console.error('Erro: Buffer do logo está vazio');
          return res.status(400).json({ message: "Dados do logo estão corrompidos" });
        }

        logoData = `data:${logoFile.mimetype};base64,${logoBuffer.toString('base64')}`;
        console.log('Logo convertido para base64, tamanho final:', logoData.length, 'caracteres');

        // Limpar arquivo temporário se existir
        if (logoFile.tempFilePath && fs.existsSync(logoFile.tempFilePath)) {
          try {
            fs.unlinkSync(logoFile.tempFilePath);
            console.log('Arquivo temporário do logo removido:', logoFile.tempFilePath);
          } catch (cleanupError) {
            console.warn('Erro ao remover arquivo temporário do logo:', cleanupError);
          }
        }
      }

      // Separar dados baseados no tipo de usuário
      const { userType } = req.body;
      let userId, user;

      // Criação de usuário base
      user = await storage.createUser({
        username: req.body.username || req.body.email,
        password: hashedPassword,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        birthDate: req.body.birthDate,
        userType: req.body.userType,
        profilePhotoData,
        profileData: {}
      });

      userId = user.id;

      // Criar registro específico baseado no tipo (lojista ou montador)
      if (userType === 'lojista') {
        const storeData = {
          userId,
          name: req.body.storeName,
          documentType: req.body.documentType,
          documentNumber: req.body.documentNumber,
          // Adiciona CNPJ se o documento for do tipo CNPJ, caso contrário, usa o documentNumber
          cnpj: req.body.documentType === 'cnpj' ? req.body.documentNumber : req.body.documentNumber,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          phone: req.body.storePhone,
          logoData: logoData,
          materialTypes: req.body.materialTypes || []
        };
        await storage.createStore(storeData);
        // Criar informações bancárias para lojista
        if (req.body.bankName && req.body.accountNumber) {
          const bankAccountData: InsertBankAccount = {
            userId: user.id,
            bankName: 'Banco Padrão',
            accountType: 'corrente',
            accountNumber: '000000',
            agency: '0000',
            holderName: user.name || 'Nome do Titular',
            holderDocumentType: 'cpf',
            holderDocumentNumber: '00000000000'
          };
          await storage.createBankAccount(bankAccountData);
        } else {
        }
      } else if (userType === 'montador') {
        // Log para debug dos dados recebidos
        console.log('Dados do montador recebidos:', {
          documentType: req.body.documentType,
          documentNumber: req.body.documentNumber,
          rgFrontUrl: req.body.rgFrontUrl,
          rgBackUrl: req.body.rgBackUrl,
          proofOfAddressUrl: req.body.proofOfAddressUrl,
          certificatesUrls: req.body.certificatesUrls
        });

        const assemblerData = {
          userId: user.id,
          address: req.body.address || '',
          addressNumber: req.body.addressNumber || '',
          neighborhood: req.body.neighborhood || '',
          cep: req.body.cep || '',
          city: req.body.city || '',
          state: req.body.state || '',
          specialties: req.body.specialties || [],
          technicalAssistance: req.body.technicalAssistance || false,
          experience: req.body.experience || '',
          workRadius: parseInt(req.body.radius) || 20,
          rating: 0,
          documents: req.body.documents || {},
          documentType: req.body.documentType || '',
          documentNumber: req.body.documentNumber || '',
          // Usar os URLs dos documentos que vêm do upload
          rgFrontData: req.body.rgFrontUrl || '',
          rgBackData: req.body.rgBackUrl || '',
          proofOfAddressData: req.body.proofOfAddressUrl || '',
          certificatesData: req.body.certificatesUrls || [],
          professionalDescription: req.body.professionalDescription || ''
        };
        await storage.createAssembler(assemblerData);
        // Criar informações bancárias se fornecidas
        if (req.body.bankName && req.body.accountNumber) {


          //registra dados no pagarme e retorna id_recebedor
          const resultRecebedorPagarme = await PagarmeService.criarRecipient({
            banco: req.body.bankCode,
            agencia: req.body.agency,
            conta: req.body.accountNumber,
            tipoDocumento: req.body.holderDocumentType,
            cpf_cnpj: req.body.holderDocumentNumber,
            nome: req.body.holderName,
            tipoConta: "conta_" + req.body.accountType
          });

          let id_recebedor;

          if (!resultRecebedorPagarme || typeof resultRecebedorPagarme !== 'object') {
            id_recebedor = undefined;
            console.log('Resposta inválida da API (pagarme) para registrar id_recebedor');
          } else {
            id_recebedor = resultRecebedorPagarme.id;
          }

          if (!id_recebedor || typeof id_recebedor !== 'string' || !id_recebedor.startsWith('re_')) {
            id_recebedor = undefined;
            console.log('ID do recebedor ausente ou inválido');
          } else {
            id_recebedor = resultRecebedorPagarme.id;

          }

          // console.log(resultRecebedorPagarme);
          // console.log({
          //   banco: req.body.bankCode,
          //   agencia: req.body.agency,
          //   conta: req.body.accountNumber, 
          //   tipoDocumento: req.body.holderDocumentType,
          //   cpf_cnpj: req.body.holderDocumentNumber,
          //   nome: req.body.holderName,
          // })

          const bankAccountData = {
            userId,
            bankName: req.body.bankName,
            bank_code: req.body.bankCode,
            accountType: req.body.accountType,
            accountNumber: req.body.accountNumber,
            agency: req.body.agency,
            holderName: req.body.holderName,
            holderDocumentType: req.body.holderDocumentType,
            holderDocumentNumber: req.body.holderDocumentNumber,
            pixKey: req.body.pixKey || null,
            pixKeyType: req.body.pixKeyType || null,
            id_recebedor: id_recebedor || null
          };

          console.log(bankAccountData);
 
          await storage.createBankAccount(bankAccountData);
        } else {
        }
      }

      // Limpar arquivos temporários
      if (profileFile && profileFile.tempFilePath && fs.existsSync(profileFile.tempFilePath)) {
        try {
          fs.unlinkSync(profileFile.tempFilePath);
          console.log('Arquivo temporário de perfil removido:', profileFile.tempFilePath);
        } catch (cleanupError) {
          console.warn('Erro ao remover arquivo temporário de perfil:', cleanupError);
        }
      }

      if (req.body.userType === 'lojista' && req.files && req.files.logoFile) {
        const logoFile = req.files.logoFile as any;
        if (logoFile.tempFilePath && fs.existsSync(logoFile.tempFilePath)) {
          try {
            fs.unlinkSync(logoFile.tempFilePath);
            console.log('Arquivo temporário de logo removido:', logoFile.tempFilePath);
          } catch (cleanupError) {
            console.warn('Erro ao remover arquivo temporário de logo:', cleanupError);
          }
        }
      }

      // Login automático após registro
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user); 

      });
    } catch (error) {
      console.error("Erro no registro:", error);

      // Limpar arquivos temporários em caso de erro também
      if (req.files && req.files.profilePicture) {
        const profileFile = req.files.profilePicture as any;
        if (profileFile.tempFilePath && fs.existsSync(profileFile.tempFilePath)) {
          try {
            fs.unlinkSync(profileFile.tempFilePath);
            console.log('Arquivo temporário de perfil removido após erro:', profileFile.tempFilePath);
          } catch (cleanupError) {
            console.warn('Erro ao remover arquivo temporário de perfil após erro:', cleanupError);
          }
        }
      }

      if (req.body.userType === 'lojista' && req.files && req.files.logoFile) {
        const logoFile = req.files.logoFile as any;
        if (logoFile.tempFilePath && fs.existsSync(logoFile.tempFilePath)) {
          try {
            fs.unlinkSync(logoFile.tempFilePath);
            console.log('Arquivo temporário de logo removido após erro:', logoFile.tempFilePath);
          } catch (cleanupError) {
            console.warn('Erro ao remover arquivo temporário de logo após erro:', cleanupError);
          }
        }
      }

      return res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
