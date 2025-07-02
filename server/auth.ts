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

declare global {
  namespace Express {
    interface User extends SelectUser {}
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
        
        // Como useTempFiles está ativado, precisamos ler do arquivo temporário
        if (logoFile.tempFilePath && fs.existsSync(logoFile.tempFilePath)) {
          logoBuffer = fs.readFileSync(logoFile.tempFilePath);
        } else if (logoFile.data && logoFile.data.length > 0) {
          // Fallback para dados em memória
          logoBuffer = logoFile.data;
        } else {
          return res.status(400).json({ message: "Dados do logo não foram recebidos corretamente" });
        }
        
        logoData = `data:${logoFile.mimetype};base64,${logoBuffer.toString('base64')}`;
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
        const assemblerData = {
            userId: user.id,
            birthDate: new Date().toISOString().split('T')[0],
            address: req.body.address || '',
            addressNumber: req.body.addressNumber || '',
            neighborhood: req.body.neighborhood || '',
            cep: req.body.cep || '',
            city: req.body.city || '',
            state: req.body.state || '',
            specialties: req.body.specialties || [],
            technicalAssistance: req.body.technicalAssistance === 'yes',
            experience: req.body.experience || '',
            workRadius: parseInt(req.body.workRadius) || 0,
            rating: 0,
            documents: req.body.documents || [],
            rgFrontData: req.body.rgFrontData || '',
            rgBackData: req.body.rgBackData || '',
            proofOfAddressData: req.body.proofOfAddressData || '',
            professionalDescription: req.body.professionalDescription || '',
            certificatesData: req.body.certificatesData || []
          };
        await storage.createAssembler(assemblerData);
        // Criar informações bancárias se fornecidas
        if (req.body.bankName && req.body.accountNumber) {
          const bankAccountData = {
            userId,
            bankName: req.body.bankName,
            accountType: req.body.accountType,
            accountNumber: req.body.accountNumber,
            agency: req.body.agency,
            holderName: req.body.holderName,
            holderDocumentType: req.body.holderDocumentType,
            holderDocumentNumber: req.body.holderDocumentNumber,
            pixKey: req.body.pixKey || null,
            pixKeyType: req.body.pixKeyType || null
          };
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
