import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }

      // Hash da senha
      const hashedPassword = await hashPassword(req.body.password);

      // Separar dados baseados no tipo de usuário
      const { userType } = req.body;
      let userId, user;

      // Criação de usuário base
      user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      userId = user.id;

      // Criar registro específico baseado no tipo (lojista ou montador)
      if (userType === 'lojista') {
        const storeData = {
          userId,
          name: req.body.storeName,
          cnpj: req.body.cnpj,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          phone: req.body.storePhone,
          logoUrl: req.body.logoUrl || '',
          materialTypes: req.body.materialTypes || []
        };
        await storage.createStore(storeData);
      } else if (userType === 'montador') {
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
          documents: req.body.documents || {}
        };
        await storage.createAssembler(assemblerData);
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
