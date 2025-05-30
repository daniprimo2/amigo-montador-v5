import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { User as SelectUser, InsertBankAccount } from "@shared/schema";

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
        console.log('Tentativa de login com username:', username);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log('Usuário não encontrado');
          return done(null, false);
        }
        
        const validPassword = await comparePasswords(password, user.password);
        if (!validPassword) {
          console.log('Senha incorreta');
          return done(null, false);
        }
        
        console.log('Login bem-sucedido para:', username);
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
      console.log("=== INÍCIO DO REGISTRO ===");
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
      
      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Usuário já existe:", req.body.username);
        return res.status(400).json({ message: "Usuário já existe" });
      }

      // Hash da senha
      const hashedPassword = await hashPassword(req.body.password);

      // Processar foto de perfil se fornecida, caso contrário usar avatar padrão
      let profilePhotoUrl = '/default-avatar.svg'; // Valor padrão obrigatório
      if (req.files && req.files.profilePicture) {
        const profileFile = req.files.profilePicture as any;
        
        // Verificar tipo de arquivo
        if (!profileFile.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
        }
        
        // Verificar tamanho (max 5MB)
        if (profileFile.size > 5 * 1024 * 1024) {
          return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
        }
        
        // Gerar nome de arquivo único
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${profileFile.name}`;
        const profileUploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
        
        // Criar diretório se não existir
        if (!fs.existsSync(profileUploadsDir)) {
          fs.mkdirSync(profileUploadsDir, { recursive: true });
        }
        
        const uploadPath = path.join(profileUploadsDir, fileName);
        
        // Mover arquivo para diretório de uploads
        await profileFile.mv(uploadPath);
        profilePhotoUrl = `/uploads/profiles/${fileName}`;
      }

      // Separar dados baseados no tipo de usuário
      const { userType } = req.body;
      let userId, user;

      // Criação de usuário base
      user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        profilePhotoUrl,
      });

      userId = user.id;

      // Criar registro específico baseado no tipo (lojista ou montador)
      if (userType === 'lojista') {
        console.log("Criando dados da loja...");
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
          logoUrl: req.body.logoUrl || '',
          materialTypes: req.body.materialTypes || []
        };
        await storage.createStore(storeData);
        console.log("Loja criada com sucesso");

        // Criar informações bancárias para lojista
        console.log("Verificando dados bancários para lojista...");
        console.log("bankName:", req.body.bankName);
        console.log("accountNumber:", req.body.accountNumber);
        
        if (req.body.bankName && req.body.accountNumber) {
          console.log("Criando conta bancária para lojista...");
          const bankAccountData: InsertBankAccount = {
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
          console.log("Dados bancários do lojista a serem criados:", bankAccountData);
          await storage.createBankAccount(bankAccountData);
          console.log("Conta bancária do lojista criada com sucesso");
        } else {
          console.log("Dados bancários do lojista não fornecidos - pulando criação da conta bancária");
        }
      } else if (userType === 'montador') {
        console.log("Criando dados do montador...");
        const assemblerData = {
          userId,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          specialties: req.body.specialties || [],
          technicalAssistance: req.body.technicalAssistance || false,
          experience: req.body.experience || '',
          workRadius: req.body.radius || 20,
          rating: 0,
          documents: req.body.documents || {},
          documentType: req.body.documentType || 'cpf',
          documentNumber: req.body.documentNumber || '',
          // Documentos obrigatórios
          rgFrontUrl: req.body.rgFrontUrl || '/placeholder-document.pdf',
          rgBackUrl: req.body.rgBackUrl || '/placeholder-document.pdf',
          proofOfAddressUrl: req.body.proofOfAddressUrl || '/placeholder-document.pdf',
          certificatesUrls: req.body.certificatesUrls || null
        };
        console.log("Dados do montador a serem criados:", assemblerData);
        await storage.createAssembler(assemblerData);
        console.log("Montador criado com sucesso");

        // Criar informações bancárias se fornecidas
        console.log("Verificando dados bancários...");
        console.log("bankName:", req.body.bankName);
        console.log("accountNumber:", req.body.accountNumber);
        
        if (req.body.bankName && req.body.accountNumber) {
          console.log("Criando conta bancária...");
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
          console.log("Dados bancários a serem criados:", bankAccountData);
          await storage.createBankAccount(bankAccountData);
          console.log("Conta bancária criada com sucesso");
        } else {
          console.log("Dados bancários não fornecidos - pulando criação da conta bancária");
        }
      }

      // Login automático após registro
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      return res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
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
