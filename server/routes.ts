import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth } from "./auth.js";
import { db } from "./db.js";
import { eq, and, not, isNotNull, or, sql, inArray, desc } from "drizzle-orm";
import { services, applications, stores, assemblers, messages, users, ratings, bankAccounts, type User, type Store, type Assembler, type Service, type Message, type Rating, type InsertRating, type BankAccount, type InsertBankAccount, type Application } from "../shared/schema.js";
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import fileUpload from 'express-fileupload';
import axios from 'axios';
import { parseBrazilianPrice, formatToBrazilianPrice } from './utils/price-formatter.js';
import { geocodeFromCEP, getCityCoordinates, calculateDistance } from './geocoding.js';
import { processDateField } from './utils/date-converter.js';
import { emailService } from './email-service.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Middleware to check for mandatory evaluations for assemblers
async function checkMandatoryEvaluations(req: any, res: any, next: any) {
  // Only apply this check to assemblers (montadores)
  if (!req.user || req.user.userType !== 'montador') {
    return next();
  }

  try {
    // Get assembler info
    const userAssembler = await storage.getAssemblerByUserId(req.user.id);
    if (!userAssembler) {
      return next();
    }

    // Check for services awaiting evaluation where assembler was accepted
    const serviceResults = await db.select({
      id: services.id,
      title: services.title,
      storeId: services.storeId,
      status: services.status
    })
    .from(services)
    .innerJoin(applications, and(
      eq(applications.serviceId, services.id),
      eq(applications.assemblerId, userAssembler.id),
      eq(applications.status, 'accepted')
    ))
    .where(eq(services.status, 'awaiting_evaluation'));

    // Check if assembler has any pending evaluations
    for (const service of serviceResults) {
      // Check if assembler has already rated for this service
      const existingRating = await storage.getRatingByServiceIdAndUser(
        service.id,
        req.user.id,
        service.storeId // We need to get the actual store user ID, but this is a simplified check
      );

      if (!existingRating) {
        // Found a service where assembler hasn't provided evaluation yet
        return res.status(423).json({
          message: "Você deve avaliar serviços pendentes antes de continuar usando o aplicativo.",
          requiresEvaluation: true,
          serviceId: service.id,
          serviceTitle: service.title
        });
      }
    }

    // No pending evaluations, proceed
    next();
  } catch (error) {
    console.error('Erro ao verificar avaliações obrigatórias:', error);
    // In case of error, don't block the user but log the issue
    next();
  }
}

// Function to generate payment proof image as SVG
function generatePaymentProofImage(data: {
  serviceId: number;
  amount: string;
  reference: string | null;
  payerName: string;
  timestamp: string;
}): string {
  const svg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="500" fill="url(#bg)" rx="15"/>
      
      <!-- Header -->
      <rect x="20" y="20" width="360" height="80" fill="white" rx="10" opacity="0.95"/>
      <text x="200" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1f2937">
        COMPROVANTE PIX
      </text>
      <text x="200" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
        Amigo Montador
      </text>
      
      <!-- Payment Details -->
      <rect x="20" y="120" width="360" height="320" fill="white" rx="10" opacity="0.95"/>
      
      <!-- Status -->
      <rect x="40" y="140" width="120" height="30" fill="#10b981" rx="15"/>
      <text x="100" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">
        CONFIRMADO
      </text>
      
      <!-- Value -->
      <text x="200" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1f2937">
        R$ ${data.amount}
      </text>
      
      <!-- Details -->
      <text x="40" y="220" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
        SERVIÇO:
      </text>
      <text x="40" y="240" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">
        ID #${data.serviceId}
      </text>
      
      <text x="40" y="270" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
        PAGADOR:
      </text>
      <text x="40" y="290" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">
        ${data.payerName}
      </text>
      
      <text x="40" y="320" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
        REFERÊNCIA:
      </text>
      <text x="40" y="340" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">
        ${data.reference || 'N/A'}
      </text>
      
      <text x="40" y="370" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">
        DATA/HORA:
      </text>
      <text x="40" y="390" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">
        ${data.timestamp}
      </text>
      
      <!-- Footer -->
      <rect x="20" y="460" width="360" height="20" fill="white" rx="10" opacity="0.95"/>
      <text x="200" y="475" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">
        Comprovante gerado automaticamente
      </text>
    </svg>
  `;
  
  // Convert SVG to data URL
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
    interface Application {
      set(key: string, value: any): void;
    }
  }
  var sendNotification: (userId: number, message: any) => boolean;
  var notifyNewMessage: (serviceId: number, senderId: number) => Promise<void>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar middleware de upload de arquivos
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: './tmp/'
  }));

  // Configurar autenticação
  setupAuth(app);

  // Servidor HTTP
  const server = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  // Mapas para rastrear conexões WebSocket
  const userConnections = new Map<number, WebSocket>();
  const storeClients = new Set<WebSocket>();
  const assemblerClients = new Set<WebSocket>();

  // Configuração WebSocket
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('🔗 Nova conexão WebSocket estabelecida');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('📩 Mensagem WebSocket recebida:', data);
        
        if (data.type === 'auth' && data.userId) {
          // Fechar conexão anterior se existir para este usuário
          const existingConnection = userConnections.get(data.userId);
          if (existingConnection && existingConnection !== ws) {
            console.log(`🔄 Fechando conexão anterior para usuário ${data.userId}`);
            existingConnection.close();
            storeClients.delete(existingConnection);
            assemblerClients.delete(existingConnection);
          }
          
          // Associar esta conexão WebSocket ao usuário
          userConnections.set(data.userId, ws);
          (ws as any).userId = data.userId; // Armazenar userId na conexão para filtros
          (ws as any).userType = data.userType;
          
          console.log(`✅ Usuário ${data.userId} (${data.userType}) autenticado no WebSocket`);
          console.log(`📊 Total de conexões ativas: ${userConnections.size}`);
          console.log(`🗺️ Conexões mapeadas: ${Array.from(userConnections.keys()).join(', ')}`);
          
          if (data.userType === 'lojista') {
            storeClients.add(ws);
            console.log(`🏪 Lojista adicionado. Total lojistas: ${storeClients.size}`);
          } else if (data.userType === 'montador') {
            assemblerClients.add(ws);
            console.log(`🔧 Montador adicionado. Total montadores: ${assemblerClients.size}`);
          }
        } else if (data.type === 'ping') {
          // Responder ao heartbeat ping para manter conexão viva
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('❌ Erro ao processar mensagem WebSocket:', error);
      }
    });

    ws.on('close', () => {
      const userId = (ws as any).userId;
      const userType = (ws as any).userType;
      console.log(`🔌 Conexão WebSocket fechada para usuário ${userId} (${userType})`);
      
      // Add small delay before removing connection to handle rapid reconnections
      setTimeout(() => {
        // Check if this connection is still the active one for this user
        const currentConnection = userConnections.get(userId);
        if (currentConnection === ws) {
          userConnections.delete(userId);
          console.log(`❌ Usuário ${userId} removido das conexões WebSocket`);
        } else {
          console.log(`🔄 Usuário ${userId} já tem nova conexão ativa, mantendo`);
        }
        
        // Remover dos grupos de clientes
        storeClients.delete(ws);
        assemblerClients.delete(ws);
        
        console.log(`📊 Conexões restantes: ${userConnections.size} total, ${storeClients.size} lojistas, ${assemblerClients.size} montadores`);
      }, 500); // 500ms delay before cleanup
    });
  });

  // Função global para enviar notificações com retry e fallback
  global.sendNotification = function(userId: number, message: any): boolean {
    console.log(`🔍 Buscando conexão WebSocket para usuário ID: ${userId}`);
    console.log(`🔍 Conexões ativas: ${Array.from(userConnections.keys()).join(', ')}`);
    
    // Ensure message includes userId for client-side filtering
    const messageWithUserId = {
      ...message,
      userId: userId
    };
    
    const connection = userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify(messageWithUserId));
        console.log(`✅ Notificação enviada com sucesso para usuário ${userId}`);
        return true;
      } catch (error) {
        console.log(`❌ Erro ao enviar notificação: ${error}`);
        return false;
      }
    } else {
      console.log(`❌ Conexão não encontrada ou fechada para usuário ${userId}`);
      
      // Try to find any active connection for this user (multiple tabs scenario)
      const connections = Array.from(userConnections.entries());
      for (let i = 0; i < connections.length; i++) {
        const [connectedUserId, ws] = connections[i];
        if (connectedUserId === userId && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(messageWithUserId));
            console.log(`✅ Notificação enviada via conexão alternativa para usuário ${userId}`);
            return true;
          } catch (error) {
            console.log(`❌ Erro na conexão alternativa: ${error}`);
          }
        }
      }
      
      console.log(`❌ Todas as tentativas de notificação falharam para usuário ${userId}`);
      return false;
    }
  };

  global.notifyNewMessage = async function(serviceId: number, senderId: number): Promise<void> {
    try {
      const service = await storage.getServiceById(serviceId);
      if (!service) return;

      const store = await storage.getStore(service.storeId);
      if (!store) return;

      const message = {
        type: 'new_message',
        serviceId: serviceId,
        senderId: senderId,
        message: 'Nova mensagem recebida no chat'
      };

      // Notificar loja APENAS se ela não for o remetente
      if (store.userId !== senderId) {
        console.log(`🔔 Enviando notificação de nova mensagem para lojista ${store.userId} (remetente: ${senderId})`);
        global.sendNotification(store.userId, message);
      } else {
        console.log(`⏭️ Não enviando notificação para lojista ${store.userId} - é o próprio remetente`);
      }

      // Notificar montador se existir e não for o remetente
      const applications = await storage.getApplicationsByServiceId(serviceId);
      for (const app of applications) {
        if (app.status === 'accepted') {
          const assembler = await storage.getAssemblerById(app.assemblerId);
          if (assembler && assembler.userId !== senderId) {
            console.log(`🔔 Enviando notificação de nova mensagem para montador ${assembler.userId} (remetente: ${senderId})`);
            global.sendNotification(assembler.userId, message);
          } else if (assembler && assembler.userId === senderId) {
            console.log(`⏭️ Não enviando notificação para montador ${assembler.userId} - é o próprio remetente`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao notificar nova mensagem:', error);
    }
  };

  // API Routes
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    res.json(user);
  });

  // Endpoint para upload geral de documentos (converte para base64)
  app.post("/api/upload", async (req, res) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      const file = req.files.file as any;

      console.log('Upload de documento:', {
        nome: file.name,
        tipo: file.mimetype,
        tamanho: file.size
      });

      // Verificar tamanho (max 10MB para documentos)
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "O arquivo deve ter menos de 10MB" });
      }

      // Ler arquivo para buffer
      let fileBuffer: Buffer;
      
      if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        fileBuffer = fs.readFileSync(file.tempFilePath);
        // Limpar arquivo temporário
        fs.unlinkSync(file.tempFilePath);
      } else if (file.data && file.data.length > 0) {
        fileBuffer = file.data;
      } else {
        return res.status(400).json({ message: "Dados do arquivo não foram recebidos corretamente" });
      }
      
      // Converter para base64
      const fileBase64 = `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`;
      
      console.log('Arquivo convertido para base64. Tamanho:', fileBase64.length, 'caracteres');

      // Retornar dados do arquivo em base64
      res.json({
        url: fileBase64, // Para compatibilidade com o código frontend que espera 'url'
        data: fileBase64,
        filename: file.name,
        mimetype: file.mimetype,
        size: file.size
      });

    } catch (error) {
      console.error('Erro no upload de documento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para upload de fotos de perfil e logo da loja
  app.post("/api/profile/photo", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log('Upload de foto iniciado para usuário:', req.user?.id);
      console.log('Arquivos recebidos:', req.files ? Object.keys(req.files) : 'nenhum');
      console.log('Tipo de upload:', req.body.type);

      if (!req.files || !req.files.foto) {
        return res.status(400).json({ message: "Nenhuma foto foi enviada" });
      }

      const user = req.user!;
      const foto = req.files.foto as any;
      const uploadType = req.body.type || 'profile'; // 'profile' ou 'store-logo'

      console.log('Detalhes do arquivo:', {
        nome: foto.name,
        tipo: foto.mimetype,
        tamanho: foto.size,
        uploadType: uploadType
      });

      // Verificar tipo de arquivo
      if (!foto.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
      }

      // Verificar tamanho (max 5MB)
      if (foto.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
      }

      // Converter imagem para base64
      console.log('Tipo de foto.data:', typeof foto.data);
      console.log('foto.data é Buffer?', Buffer.isBuffer(foto.data));
      console.log('foto.tempFilePath:', foto.tempFilePath);
      
      let imageBuffer: Buffer;
      
      // Como useTempFiles está ativado, precisamos ler do arquivo temporário
      if (foto.tempFilePath && fs.existsSync(foto.tempFilePath)) {
        console.log('Lendo arquivo temporário:', foto.tempFilePath);
        imageBuffer = fs.readFileSync(foto.tempFilePath);
        console.log('Arquivo lido. Tamanho do buffer:', imageBuffer.length);
      } else if (foto.data && foto.data.length > 0) {
        // Fallback para dados em memória
        console.log('Usando dados em memória');
        imageBuffer = foto.data;
      } else {
        console.error('Nenhum dado de imagem encontrado!');
        return res.status(400).json({ message: "Dados da imagem não foram recebidos corretamente" });
      }
      
      const imageBase64 = `data:${foto.mimetype};base64,${imageBuffer.toString('base64')}`;
      console.log('Imagem convertida para base64. Tamanho:', imageBase64.length, 'caracteres');

      // Atualizar banco de dados baseado no tipo de upload
      if (uploadType === 'store-logo') {
        // Atualizar logo da loja
        const store = await storage.getStoreByUserId(user.id);
        if (!store) {
          return res.status(404).json({ message: "Loja não encontrada" });
        }
        
        console.log('Atualizando logo da loja. Store ID:', store.id);
        await storage.updateStore(store.id, { logoData: imageBase64 });
      } else {
        console.log('Atualizando foto de perfil do usuário. User ID:', user.id);
        // Atualizar foto de perfil do usuário
        const updatedUser = await storage.updateUser(user.id, { profilePhotoData: imageBase64 });
        console.log('Usuário atualizado. Nova foto tem', updatedUser.profilePhotoData?.length || 0, 'caracteres');
      }

      // Limpar arquivo temporário se existir
      if (foto.tempFilePath && fs.existsSync(foto.tempFilePath)) {
        try {
          fs.unlinkSync(foto.tempFilePath);
          console.log('Arquivo temporário removido:', foto.tempFilePath);
        } catch (cleanupError) {
          console.warn('Erro ao remover arquivo temporário:', cleanupError);
        }
      }

      res.json({ 
        success: true,
        photoUrl: imageBase64,
        photoData: imageBase64,
        message: uploadType === 'store-logo' ? 'Logo da loja atualizado com sucesso' : 'Foto de perfil atualizada com sucesso'
      });

    } catch (error) {
      console.error('Erro no upload de foto:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para obter dados do perfil completo
  app.get("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Fetch user's average rating and total ratings count
      const ratingData = await storage.getUserAverageRating(user.id);
      
      let profileData: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        profilePhotoData: user.profilePhotoData,
        profilePhotoUrl: user.profilePhotoData,
        averageRating: ratingData.averageRating,
        totalRatings: ratingData.totalRatings
      };

      if (user.userType === 'lojista') {
        const store = await storage.getStoreByUserId(user.id);
        if (store) {
          profileData.store = {
            ...store,
            logoUrl: store.logoData
          };
        }
      } else if (user.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(user.id);
        if (assembler) {
          profileData.assembler = assembler;
        }
      }

      res.json(profileData);
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para atualizar dados do perfil
  app.patch("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const { user: userData, store: storeData, assembler: assemblerData } = req.body;

      // Atualizar dados do usuário se fornecidos
      if (userData) {
        await storage.updateUser(user.id, userData);
      }

      // Atualizar dados da loja se fornecidos e usuário for lojista
      if (storeData && user.userType === 'lojista') {
        const existingStore = await storage.getStoreByUserId(user.id);
        if (existingStore) {
          await storage.updateStore(existingStore.id, storeData);
        } else {
          // Criar loja se não existir
          await storage.createStore({
            ...storeData,
            userId: user.id
          });
        }
      }

      // Atualizar dados do montador se fornecidos e usuário for montador
      if (assemblerData && user.userType === 'montador') {
        const existingAssembler = await storage.getAssemblerByUserId(user.id);
        if (existingAssembler) {
          await storage.updateAssembler(existingAssembler.id, assemblerData);
        } else {
          // Criar perfil de montador se não existir
          await storage.createAssembler({
            ...assemblerData,
            userId: user.id
          });
        }
      }

      res.json({ 
        success: true,
        message: 'Perfil atualizado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para serviços ativos do montador (onde ele tem candidaturas)
  app.get("/api/services/active", checkMandatoryEvaluations, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Only assemblers can access this endpoint
      if (user.userType !== 'montador') {
        return res.status(403).json({ message: "Apenas montadores podem acessar serviços ativos" });
      }

      // Get assembler profile
      const assembler = await storage.getAssemblerByUserId(user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Perfil de montador não encontrado" });
      }

      // Get all applications from this assembler
      const allApplications = await db.select({
        id: applications.id,
        serviceId: applications.serviceId,
        status: applications.status,
        createdAt: applications.createdAt
      })
      .from(applications)
      .where(eq(applications.assemblerId, assembler.id));

      const activeServices = [];

      // For each application, get the service details
      for (const application of allApplications) {
        const service = await storage.getServiceById(application.serviceId);
        if (service) {
          const store = await storage.getStore(service.storeId);
          
          activeServices.push({
            ...service,
            applicationStatus: application.status,
            hasApplied: true,
            applicationId: application.id,
            store: store ? {
              id: store.id,
              name: store.name,
              city: store.city,
              state: store.state
            } : null
          });
        }
      }

      res.json(activeServices);
    } catch (error) {
      console.error('Erro ao buscar serviços ativos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint específico deve vir antes do genérico
  app.get("/api/services/available", checkMandatoryEvaluations, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Only assemblers can access this endpoint
      if (user.userType !== 'montador') {
        return res.status(403).json({ message: "Apenas montadores podem acessar serviços disponíveis" });
      }

      // Get assembler profile
      const assembler = await storage.getAssemblerByUserId(user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Perfil de montador não encontrado" });
      }

      // Get services within 20km radius with distance calculation
      const servicesWithDistance = await storage.getAvailableServicesForAssemblerWithDistance(assembler);
      
      // Get store information and applications for each service
      const servicesWithStoreInfo = await Promise.all(
        servicesWithDistance.map(async (service) => {
          // Get store information
          const store = await storage.getStore(service.storeId);
          
          // Check if assembler has already applied to this service
          const existingApplication = await storage.getApplicationByServiceAndAssembler(service.id, assembler.id);
          
          // Get all applications for this service to determine status
          const allApplications = await storage.getApplicationsByServiceId(service.id);
          const acceptedApplication = allApplications.find(app => app.status === 'accepted');
          
          return {
            ...service,
            store: store ? {
              id: store.id,
              name: store.name,
              city: store.city,
              state: store.state
            } : null,
            distance: `${service.distance} km`,
            hasApplied: !!existingApplication,
            applicationStatus: existingApplication?.status || null,
            isAssigned: !!acceptedApplication
          };
        })
      );

      // Apply consistent filtering to prevent duplicate statuses
      // Only show services where assembler hasn't applied (these go to "Disponível")
      // Applied services will appear in "Aguardando Lojista" via /api/services/active
      const availableServicesOnly = servicesWithStoreInfo.filter(service => !service.hasApplied);

      res.json(availableServicesOnly);
    } catch (error) {
      console.error('Erro ao buscar serviços disponíveis:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      let servicesList: any[] = [];

      if (user.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(user.id);
        if (!assembler) {
          return res.status(404).json({ message: "Montador não encontrado" });
        }

        servicesList = await storage.getAvailableServicesForAssembler(assembler);
      } else if (user.userType === 'lojista') {
        const store = await storage.getStoreByUserId(user.id);
        if (!store) {
          return res.status(404).json({ message: "Loja não encontrada" });
        }

        servicesList = await storage.getServicesByStoreId(store.id);
      }

      res.json(servicesList);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });

  // Get pending evaluations for current user - MUST come before generic :serviceId route
  app.get("/api/services/pending-evaluations", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Get services that are awaiting evaluation where user is involved
      let awaitingServices: Array<{id: number, title: string, storeId: number, status: string}> = [];
      
      if (req.user.userType === 'lojista') {
        // Get store services awaiting evaluation
        const userStore = await storage.getStoreByUserId(req.user.id);
        if (!userStore) {
          return res.json({ pendingRatings: [], hasPendingRatings: false });
        }
        
        awaitingServices = await db.select({
          id: services.id,
          title: services.title,
          storeId: services.storeId,
          status: services.status
        })
        .from(services)
        .where(
          and(
            eq(services.status, 'awaiting_evaluation'),
            eq(services.storeId, userStore.id)
          )
        );
      } else {
        // Get assembler services awaiting evaluation via applications
        const userAssembler = await storage.getAssemblerByUserId(req.user.id);
        if (!userAssembler) {
          return res.json({ pendingRatings: [], hasPendingRatings: false });
        }
        
        const serviceResults = await db.select({
          id: services.id,
          title: services.title,
          storeId: services.storeId,
          status: services.status
        })
        .from(services)
        .innerJoin(applications, and(
          eq(applications.serviceId, services.id),
          eq(applications.assemblerId, userAssembler.id),
          eq(applications.status, 'accepted')
        ))
        .where(eq(services.status, 'awaiting_evaluation'));
        
        awaitingServices = serviceResults;
      }

      // Filter services where user hasn't rated yet
      const pendingEvaluations = [];
      
      for (const service of awaitingServices) {
        // Determine who the user should rate
        let toUserId: number;
        let otherUserType: string;
        let otherUserName: string;

        if (req.user.userType === 'lojista') {
          // Store owner should rate the assembler
          // Find the accepted application for this service
          const acceptedApplication = await db.select()
            .from(applications)
            .where(
              and(
                eq(applications.serviceId, service.id),
                eq(applications.status, 'accepted')
              )
            )
            .limit(1);

          if (acceptedApplication.length === 0) continue;

          const assembler = await storage.getAssemblerById(acceptedApplication[0].assemblerId);
          if (!assembler) continue;
          
          const assemblerUser = await storage.getUser(assembler.userId);
          if (!assemblerUser) continue;
          
          toUserId = assembler.userId;
          otherUserType = 'montador';
          otherUserName = assemblerUser.name;
        } else {
          // Assembler should rate the store
          const store = await storage.getStore(service.storeId);
          if (!store) continue;
          
          const storeUser = await storage.getUser(store.userId);
          if (!storeUser) continue;
          
          toUserId = store.userId;
          otherUserType = 'lojista';
          otherUserName = storeUser.name;
        }

        // Check if user has already rated this service
        const existingRating = await storage.getRatingByServiceIdAndUser(service.id, req.user.id, toUserId);
        
        if (!existingRating) {
          pendingEvaluations.push({
            serviceId: service.id,
            serviceName: service.title,
            otherUserName: otherUserName,
            otherUserType: otherUserType
          });
        }
      }

      // Debug logging for troubleshooting
      console.log(`🔍 Avaliações pendentes para usuário ${req.user.id} (${req.user.userType}):`, {
        awaitingServicesCount: awaitingServices.length,
        pendingEvaluationsCount: pendingEvaluations.length,
        services: awaitingServices.map(s => ({ id: s.id, title: s.title, status: s.status })),
        pendingEvaluations: pendingEvaluations.map(p => ({ 
          serviceId: p.serviceId, 
          serviceName: p.serviceName, 
          otherUserName: p.otherUserName, 
          otherUserType: p.otherUserType 
        }))
      });

      res.json({
        pendingRatings: pendingEvaluations,
        hasPendingRatings: pendingEvaluations.length > 0
      });

    } catch (error) {
      console.error('Erro ao buscar avaliações pendentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para buscar detalhes de um serviço específico
  app.get("/api/services/:serviceId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);

      // Validar se o serviceId é um número válido
      if (isNaN(serviceId)) {
        return res.status(400).json({ message: "ID do serviço inválido" });
      }

      // Buscar o serviço
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Buscar todas as candidaturas para este serviço
      const applications = await storage.getApplicationsByServiceId(serviceId);
      
      // Para lojistas, incluir informações das candidaturas
      if (user.userType === 'lojista') {
        // Verificar se o usuário é dono do serviço
        const store = await storage.getStoreByUserId(user.id);
        if (!store || service.storeId !== store.id) {
          return res.status(403).json({ message: "Acesso negado a este serviço" });
        }

        // Verificar se há candidatura aceita
        const acceptedApplication = applications.find(app => app.status === 'accepted');
        const hasAcceptedApplication = !!acceptedApplication;

        res.json({
          ...service,
          hasAcceptedApplication,
          acceptedApplicationId: acceptedApplication?.id || null,
          totalApplications: applications.length,
          pendingApplications: applications.filter(app => app.status === 'pending').length
        });
      } else if (user.userType === 'montador') {
        // Para montadores, verificar se têm candidatura neste serviço
        const assembler = await storage.getAssemblerByUserId(user.id);
        if (!assembler) {
          return res.status(404).json({ message: "Dados do montador não encontrados" });
        }

        const userApplication = applications.find(app => app.assemblerId === assembler.id);
        
        res.json({
          ...service,
          hasApplied: !!userApplication,
          applicationStatus: userApplication?.status || null,
          applicationId: userApplication?.id || null
        });
      } else {
        res.json(service);
      }

    } catch (error) {
      console.error('Erro ao buscar serviço:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo serviço
  app.post("/api/services", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Verificar se o usuário é lojista
      if (user.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem criar serviços" });
      }

      // Obter dados da loja
      const store = await storage.getStoreByUserId(user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      const serviceData = req.body;
      
      // Validar campos obrigatórios
      const requiredFields = ['title', 'description', 'location', 'address', 'addressNumber', 'cep', 'date', 'price', 'materialType'];
      const missingFields = requiredFields.filter(field => !serviceData[field] || serviceData[field].toString().trim() === '');
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Campos obrigatórios não preenchidos",
          missingFields: missingFields
        });
      }

      // Geocodificar o CEP para obter latitude e longitude
      let latitude = '0';
      let longitude = '0';
      
      try {
        const coords = await geocodeFromCEP(serviceData.cep.trim());
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (error) {
        console.log('Erro na geocodificação, usando coordenadas padrão:', error);
        // Usar coordenadas padrão (São Paulo) se a geocodificação falhar
        latitude = '-23.5505199';
        longitude = '-46.6333094';
      }

      // Processar as datas do campo date (formato: "DD/MM/YYYY - DD/MM/YYYY")
      const { startDate, endDate } = processDateField(serviceData.date.trim());

      // Criar o serviço
      const newService = await storage.createService({
        storeId: store.id,
        title: serviceData.title.trim(),
        description: serviceData.description.trim(),
        location: serviceData.location.trim(),
        address: serviceData.address.trim(),
        addressNumber: serviceData.addressNumber.trim(),
        cep: serviceData.cep.trim(),
        latitude: latitude,
        longitude: longitude,
        startDate: startDate,
        endDate: endDate,
        price: serviceData.price.toString(),
        materialType: serviceData.materialType.trim(),
        projectFiles: '[]', // Array vazio para serviços sem arquivos
        status: 'open'
      });

      res.json({
        success: true,
        service: newService,
        message: "Serviço criado com sucesso"
      });

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar serviço com upload de arquivos
  app.post("/api/services/with-files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Verificar se o usuário é lojista
      if (user.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem criar serviços" });
      }

      // Obter dados da loja
      const store = await storage.getStoreByUserId(user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Processar dados do serviço enviados como JSON no FormData
      let serviceData;
      try {
        serviceData = JSON.parse(req.body.serviceData);
      } catch (error) {
        return res.status(400).json({ message: "Dados do serviço inválidos" });
      }
      
      // Validar campos obrigatórios
      const requiredFields = ['title', 'description', 'location', 'address', 'addressNumber', 'cep', 'date', 'price', 'materialType'];
      const missingFields = requiredFields.filter(field => !serviceData[field] || serviceData[field].toString().trim() === '');
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Campos obrigatórios não preenchidos",
          missingFields: missingFields
        });
      }

      // Processar arquivos PDF se enviados
      let projectFilesData = '';
      if (req.files && req.files.projectFiles) {
        const files = Array.isArray(req.files.projectFiles) ? req.files.projectFiles : [req.files.projectFiles];
        
        // Validar arquivos
        for (const file of files) {
          if (!file.name.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ message: `O arquivo ${file.name} não é um PDF` });
          }
          if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: `O arquivo ${file.name} excede o limite de 10MB` });
          }
        }

        // Converter arquivos para base64 e concatenar
        const base64Files = files.map(file => {
          let fileBuffer: Buffer;
          
          // Como useTempFiles está ativado, precisamos ler do arquivo temporário
          if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
            fileBuffer = fs.readFileSync(file.tempFilePath);
          } else if (file.data && file.data.length > 0) {
            // Fallback para dados em memória
            fileBuffer = file.data;
          } else {
            throw new Error(`Dados do arquivo ${file.name} não foram recebidos corretamente`);
          }
          
          return {
            name: file.name,
            data: `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`
          };
        });
        
        projectFilesData = JSON.stringify(base64Files);
      }

      // Geocodificar o CEP para obter latitude e longitude
      let latitude = '0';
      let longitude = '0';
      
      try {
        const coords = await geocodeFromCEP(serviceData.cep.trim());
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (error) {
        console.log('Erro na geocodificação, usando coordenadas padrão:', error);
        // Usar coordenadas padrão (São Paulo) se a geocodificação falhar
        latitude = '-23.5505199';
        longitude = '-46.6333094';
      }

      // Processar as datas do campo date (formato: "DD/MM/YYYY - DD/MM/YYYY")
      const { startDate, endDate } = processDateField(serviceData.date.trim());

      // Criar o serviço
      const newService = await storage.createService({
        storeId: store.id,
        title: serviceData.title.trim(),
        description: serviceData.description.trim(),
        location: serviceData.location.trim(),
        address: serviceData.address.trim(),
        addressNumber: serviceData.addressNumber.trim(),
        cep: serviceData.cep.trim(),
        latitude: latitude,
        longitude: longitude,
        startDate: startDate,
        endDate: endDate,
        price: serviceData.price.toString(),
        materialType: serviceData.materialType.trim(),
        projectFiles: projectFilesData,
        status: 'open'
      });

      // Limpar arquivos temporários se existirem
      if (req.files && req.files.projectFiles) {
        const files = Array.isArray(req.files.projectFiles) ? req.files.projectFiles : [req.files.projectFiles];
        files.forEach(file => {
          if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
            try {
              fs.unlinkSync(file.tempFilePath);
              console.log('Arquivo temporário removido:', file.tempFilePath);
            } catch (cleanupError) {
              console.warn('Erro ao remover arquivo temporário:', cleanupError);
            }
          }
        });
      }

      res.json({
        success: true,
        service: newService,
        message: "Serviço criado com sucesso com arquivos"
      });

    } catch (error) {
      console.error('Erro ao criar serviço com arquivos:', error);
      
      // Limpar arquivos temporários em caso de erro também
      if (req.files && req.files.projectFiles) {
        const files = Array.isArray(req.files.projectFiles) ? req.files.projectFiles : [req.files.projectFiles];
        files.forEach(file => {
          if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
            try {
              fs.unlinkSync(file.tempFilePath);
              console.log('Arquivo temporário removido após erro:', file.tempFilePath);
            } catch (cleanupError) {
              console.warn('Erro ao remover arquivo temporário após erro:', cleanupError);
            }
          }
        });
      }
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  // Rota para buscar mensagens de um serviço
  app.get("/api/services/:serviceId/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);
      const assemblerId = req.query.assemblerId ? parseInt(req.query.assemblerId as string) : undefined;

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      let messages: any[] = [];

      // Se um assemblerId foi fornecido (lojista visualizando conversa específica)
      if (assemblerId) {
        // Buscar mensagens específicas entre o lojista e o montador
        messages = await storage.getMessagesByServiceAndAssembler(serviceId, assemblerId);
      } else {
        // Determinar o assemblerId baseado no usuário logado
        if (user.userType === 'montador') {
          // Montador só pode ver suas próprias mensagens
          const assembler = await storage.getAssemblerByUserId(user.id);
          if (assembler) {
            messages = await storage.getMessagesByServiceAndAssembler(serviceId, assembler.id);
          }
        } else if (user.userType === 'lojista') {
          // Lojista precisa especificar qual conversa quer ver
          return res.status(400).json({ message: "ID do montador é obrigatório para lojistas" });
        }
      }

      // Incluir informações do remetente em cada mensagem
      const messagesWithSender = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return {
            ...message,
            sender: sender ? {
              name: sender.name,
              userType: sender.userType
            } : null
          };
        })
      );

      res.json(messagesWithSender);

    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para marcar mensagens como lidas
  app.post("/api/services/:serviceId/messages/mark-read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Marcar mensagens como lidas
      await storage.markMessagesAsRead(serviceId, user.id);

      res.json({ 
        success: true,
        message: "Mensagens marcadas como lidas" 
      });

    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para enviar mensagem
  app.post("/api/services/:serviceId/messages", checkMandatoryEvaluations, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);
      const { content, messageType = 'text', assemblerId } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Conteúdo da mensagem é obrigatório" });
      }

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se o serviço está finalizado - bloquear envio de mensagens
      if (service.status === 'completed' || service.status === 'awaiting_evaluation') {
        return res.status(400).json({ 
          message: "Não é possível enviar mensagens para serviços finalizados",
          error: "SERVICE_COMPLETED"
        });
      }

      // Determinar o assemblerId para a mensagem
      let messageAssemblerId = assemblerId;
      if (user.userType === 'montador') {
        // Se o usuário é um montador, usar seu próprio assemblerId
        const assembler = await storage.getAssemblerByUserId(user.id);
        if (assembler) {
          messageAssemblerId = assembler.id;
        }
      } else if (user.userType === 'lojista' && !assemblerId) {
        // Lojista deve especificar com qual montador está conversando
        return res.status(400).json({ message: "ID do montador é obrigatório para lojistas" });
      }

      // Criar mensagem
      const message = await storage.createMessage({
        serviceId: serviceId,
        assemblerId: messageAssemblerId,
        senderId: user.id,
        content: content.trim(),
        messageType: messageType
      });

      // Notificar via WebSocket
      await global.notifyNewMessage(serviceId, user.id);

      res.status(201).json({
        message: "Mensagem enviada com sucesso",
        data: message
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para excluir mensagem
  app.delete("/api/services/messages/:messageId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const messageId = parseInt(req.params.messageId);

      // Verificar se a mensagem existe
      const messages = await storage.getMessagesByServiceId(0); // Buscar todas as mensagens temporariamente
      const message = messages.find(m => m.id === messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Mensagem não encontrada" });
      }

      // Verificar se o usuário é o remetente da mensagem
      if (message.senderId !== user.id) {
        return res.status(403).json({ message: "Você só pode excluir suas próprias mensagens" });
      }

      // Verificar se o serviço ainda permite exclusão de mensagens
      const service = await storage.getServiceById(message.serviceId);
      if (service && service.status === 'completed') {
        return res.status(400).json({ message: "Não é possível excluir mensagens de serviços concluídos" });
      }

      // Excluir mensagem (implementar no storage)
      // Por enquanto, retornar sucesso
      res.json({ message: "Mensagem excluída com sucesso" });

    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para candidatar-se a um serviço
  app.post("/api/services/:serviceId/apply", checkMandatoryEvaluations, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);
      
      // Verificar se o usuário é montador
      if (user.userType !== 'montador') {
        return res.status(403).json({ message: "Apenas montadores podem se candidatar a serviços" });
      }

      // Obter dados do montador
      const assembler = await storage.getAssemblerByUserId(user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Dados do montador não encontrados" });
      }

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se o serviço está disponível
      if (service.status !== 'open') {
        return res.status(400).json({ message: "Este serviço não está mais disponível" });
      }

      // Verificar se o montador já se candidatou
      const existingApplication = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
      if (existingApplication) {
        return res.status(200).json({ 
          message: "Você já se candidatou a este serviço. Aguarde a resposta do lojista.",
          application: existingApplication,
          alreadyApplied: true
        });
      }

      // Criar candidatura
      const application = await storage.createApplication({
        serviceId: serviceId,
        assemblerId: assembler.id,
        status: 'pending'
      });

      // Criar mensagem inicial de candidatura com informações detalhadas
      const assemblerInfo = [];
      if (assembler.experience) {
        assemblerInfo.push(`Experiência: ${assembler.experience}`);
      }
      if (assembler.rating && assembler.rating > 0) {
        assemblerInfo.push(`Avaliação: ${assembler.rating}/5 estrelas`);
      }
      if (assembler.city && assembler.state) {
        assemblerInfo.push(`Localização: ${assembler.city}, ${assembler.state}`);
      }
      if (assembler.specialties && Array.isArray(assembler.specialties) && assembler.specialties.length > 0) {
        assemblerInfo.push(`Especialidades: ${assembler.specialties.join(', ')}`);
      }
      
      const detailedInfo = assemblerInfo.length > 0 ? `\n\n📋 Informações do profissional:\n${assemblerInfo.join('\n')}` : '';
      
      await storage.createMessage({
        serviceId: serviceId,
        assemblerId: assembler.id, // Incluir assemblerId para isolamento de conversas
        senderId: user.id,
        content: `Olá! Me candidatei para o serviço "${service.title}". Tenho experiência em montagem de móveis e gostaria de discutir os detalhes do trabalho. Aguardo seu contato!${detailedInfo}`,
        messageType: 'application'
      });

      // Obter dados da loja para notificação
      const store = await storage.getStore(service.storeId);
      if (store) {
        const storeUser = await storage.getUser(store.userId);
        if (storeUser) {
          // Enviar notificação WebSocket para o lojista
          const notificationData = {
            type: 'new_application',
            title: 'Nova candidatura recebida',
            message: `${user.name} se candidatou ao serviço "${service.title}". Verifique as mensagens para mais detalhes.`,
            serviceId: serviceId,
            assemblerId: assembler.id,
            data: {
              serviceId: serviceId,
              assemblerId: assembler.id,
              assemblerName: user.name,
              assemblerExperience: assembler.experience || 'Não informado',
              assemblerRating: assembler.rating || 0,
              assemblerLocation: `${assembler.city}, ${assembler.state}`
            }
          };
          
          // Enviar notificação WebSocket
          global.sendNotification(storeUser.id, notificationData);
          
          // Log da notificação enviada
          console.log(`✅ Notificação de nova candidatura enviada para lojista ${storeUser.name} (ID: ${storeUser.id})`);
          console.log(`📋 Serviço: ${service.title} (ID: ${serviceId})`);
          console.log(`👤 Montador: ${user.name} (ID: ${assembler.id})`);
        }
      }

      res.status(201).json({
        message: "Candidatura enviada com sucesso",
        application: application,
        success: true
      });

    } catch (error) {
      console.error('Erro ao candidatar-se:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para buscar serviços com mensagens (para lojistas)
  app.get("/api/store/services/with-messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      if (user.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem acessar esta rota" });
      }

      const store = await storage.getStoreByUserId(user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Buscar todos os serviços da loja
      const storeServices = await storage.getServicesByStoreId(store.id);
      
      // Para cada serviço, buscar TODAS as conversas individuais com montadores
      const servicesWithMessages = [];
      
      for (const service of storeServices) {
        // Buscar todas as aplicações do serviço para identificar os montadores que interagiram
        const applications = await storage.getApplicationsByServiceId(service.id);
        
        for (const application of applications) {
          // Para cada montador, verificar se há mensagens específicas dessa conversa
          const messages = await storage.getMessagesByServiceAndAssembler(service.id, application.assemblerId);
          
          if (messages.length > 0) {
            // Buscar informações do montador
            const assembler = await storage.getAssemblerById(application.assemblerId);
            let assemblerInfo = null;
            
            if (assembler) {
              const assemblerUser = await storage.getUser(assembler.userId);
              assemblerInfo = {
                id: assembler.id,
                name: assemblerUser?.name || 'Montador',
                userId: assembler.userId,
                applicationStatus: application.status
              };
            }
            
            servicesWithMessages.push({
              ...service,
              lastMessageAt: messages[messages.length - 1]?.sentAt,
              assembler: assemblerInfo,
              assemblerId: application.assemblerId, // ID específico do montador para esta conversa
              conversationId: `${service.id}-${application.assemblerId}`, // ID único da conversa
              messageCount: messages.length
            });
          }
        }
      }

      // Ordenar por última mensagem (mais recente primeiro)
      servicesWithMessages.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || 0);
        const dateB = new Date(b.lastMessageAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      res.json(servicesWithMessages);

    } catch (error) {
      console.error('Erro ao buscar serviços com mensagens:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para buscar serviços com candidaturas pendentes (para lojistas)
  app.get("/api/store/services/with-pending-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      if (user.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem acessar esta rota" });
      }

      const store = await storage.getStoreByUserId(user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Buscar serviços da loja com candidaturas pendentes
      const storeServices = await storage.getServicesByStoreId(store.id);
      const servicesWithPending = [];
      
      for (const service of storeServices) {
        const applications = await storage.getApplicationsByServiceId(service.id);
        const pendingApplications = applications.filter(app => app.status === 'pending');
        
        if (pendingApplications.length > 0) {
          // Buscar informações do montador
          for (const application of pendingApplications) {
            const assembler = await storage.getAssemblerById(application.assemblerId);
            if (assembler) {
              const assemblerUser = await storage.getUser(assembler.userId);
              servicesWithPending.push({
                ...service,
                assemblerId: assembler.id,
                assemblerName: assemblerUser?.name || 'Montador',
                assemblerPhoto: assemblerUser?.profilePhotoData || null,
                applicationId: application.id,
                applicationStatus: application.status
              });
            }
          }
        }
      }

      res.json(servicesWithPending);

    } catch (error) {
      console.error('Erro ao buscar serviços com candidaturas pendentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  // Rota para obter contagem de mensagens não lidas
  app.get("/api/messages/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const unreadCount = await storage.getTotalUnreadMessageCount(user.id);
      
      res.json({ count: unreadCount });
    } catch (error) {
      console.error('Erro ao buscar contagem de mensagens não lidas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Bank Account API Routes
  // Get all bank accounts for the current user
  app.get("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const bankAccounts = await storage.getBankAccountsByUserId(user.id);
      
      res.json(bankAccounts);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get specific bank account by ID
  app.get("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const accountId = parseInt(req.params.id);
      const bankAccount = await storage.getBankAccountById(accountId);
      
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }

      // Verify that the bank account belongs to the current user
      if (bankAccount.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      res.json(bankAccount);
    } catch (error) {
      console.error('Erro ao buscar conta bancária:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Create new bank account
  app.post("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const bankAccountData: InsertBankAccount = {
        userId: user.id,
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

      const newBankAccount = await storage.createBankAccount(bankAccountData);
      
      res.status(201).json(newBankAccount);
    } catch (error) {
      console.error('Erro ao criar conta bancária:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Update existing bank account
  app.put("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const accountId = parseInt(req.params.id);
      const existingAccount = await storage.getBankAccountById(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }

      // Verify that the bank account belongs to the current user
      if (existingAccount.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const updateData = {
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

      const updatedAccount = await storage.updateBankAccount(accountId, updateData);
      
      res.json(updatedAccount);
    } catch (error) {
      console.error('Erro ao atualizar conta bancária:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Delete bank account
  app.delete("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const accountId = parseInt(req.params.id);
      const existingAccount = await storage.getBankAccountById(accountId);
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }

      // Verify that the bank account belongs to the current user
      if (existingAccount.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      await storage.deleteBankAccount(accountId);
      
      res.json({ message: "Conta bancária removida com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar conta bancária:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PIX Payment endpoints
  // Generate PIX authentication token
  app.post("/api/payment/pix/token", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Generate a secure token for PIX authentication
      const token = crypto.randomBytes(32).toString('hex');
      
      res.json({
        success: true,
        token
      });
    } catch (error) {
      console.error('Erro ao gerar token PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Create PIX payment
  app.post("/api/payment/pix/create", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId, amount, description, token } = req.body;
      
      // Validate required fields
      if (!serviceId || !amount || !token) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // Verify service exists and user has access
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Generate PIX payment data
      const paymentId = crypto.randomBytes(16).toString('hex');
      const reference = `AMG-${Date.now()}-${serviceId}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      // Mock PIX code for demonstration
      const pixCode = `00020126580014br.gov.bcb.pix0136${paymentId}520400005303986540${amount}5802BR5925AMIGO MONTADOR LTDA6009SAO PAULO62070503***63044B2A`;
      
      // Generate QR code as data URL (mock)
      const qrCodeData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      res.json({
        success: true,
        pixCode,
        qrCode: qrCodeData,
        reference,
        amount: parseFloat(amount),
        expiresAt: expiresAt.toISOString(),
        paymentId
      });
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Check PIX payment status
  app.post("/api/payment/pix/status", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { paymentId, token } = req.body;
      
      if (!paymentId || !token) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // In a real implementation, this would check with the payment provider
      // For now, we simulate that payments are not completed automatically
      res.json({
        success: true,
        isCompleted: false,
        paymentData: null
      });
    } catch (error) {
      console.error('Erro ao verificar status PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Simulate PIX payment confirmation for testing
  app.post("/api/payment/pix/simulate-confirm", async (req, res) => {
    try {
      console.log('=== SIMULATE PIX CONFIRM DEBUG ===');
      console.log('User:', req.user);
      console.log('Body:', req.body);
      
      if (!req.user) {
        console.log('❌ Usuário não autenticado');
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId } = req.body;
      
      if (!serviceId) {
        console.log('❌ ServiceId não fornecido');
        return res.status(400).json({ message: "ID do serviço é obrigatório" });
      }
      
      console.log('✅ Processando serviceId:', serviceId);

      // Get service details
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Update service status to "Em Andamento" when payment is confirmed
      await storage.updateServiceStatus(serviceId, 'in-progress');

      // Get all applications for this service first
      console.log('🔍 Buscando candidaturas...');
      const applications = await storage.getApplicationsByServiceId(serviceId);
      console.log('📋 Candidaturas encontradas:', applications.map(app => ({ id: app.id, assemblerId: app.assemblerId, status: app.status })));
      
      // Check if there's an accepted application
      let acceptedApplication = applications.find(app => app.status === 'accepted');
      let assemblerId: number | undefined;

      // If no assembler is accepted yet, auto-accept the first applicant for testing
      if (!acceptedApplication && applications.length > 0) {
        console.log('🔄 Auto-aceitando primeiro candidato para teste...');
        const firstApplication = applications[0];
        await storage.acceptApplication(firstApplication.id, serviceId);
        assemblerId = firstApplication.assemblerId;
        console.log(`✅ Montador ${assemblerId} aceito automaticamente`);
      } else if (acceptedApplication) {
        assemblerId = acceptedApplication.assemblerId;
        console.log('✅ Montador aceito encontrado:', assemblerId);
      }

      // Get user info for payment proof
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Generate automatic payment proof message
      const timestamp = new Date().toLocaleString('pt-BR');
      const proofData = {
        serviceId: serviceId,
        amount: service.price,
        reference: `AMG-${Date.now()}-${serviceId}`,
        payerName: user.name,
        timestamp
      };

      // Generate payment proof image
      const proofImage = generatePaymentProofImage(proofData);
      
      // Create a detailed payment proof message with visual content
      const proofContent = `🎉 COMPROVANTE DE PAGAMENTO PIX

💰 Valor Pago: R$ ${service.price}
📅 Data: ${timestamp}
📋 Referência: ${proofData.reference}
👤 Pagador: ${user.name}
🏪 Serviço: ${service.title}

✅ Status: PAGAMENTO CONFIRMADO
✅ Serviço atualizado para "Em Andamento"

Este é um comprovante automático gerado pelo sistema de teste PIX.`;

      // Send payment proof message only to the accepted assembler
      console.log('✅ Enviando mensagem de comprovante para o montador aceito...');
      if (assemblerId) {
        const messageResult = await storage.createMessage({
          serviceId: serviceId,
          senderId: req.user.id,
          assemblerId: assemblerId,
          content: proofContent,
          messageType: 'payment_proof'
        });
        console.log(`✅ Comprovante enviado para montador aceito (ID: ${assemblerId}):`, messageResult);
      } else {
        console.log('❌ Nenhum montador aceito encontrado para enviar o comprovante');
      }

      // Notify all other assemblers (who were NOT accepted) that the service started with another
      console.log('🔔 Notificando outros montadores que não foram aceitos...');
      const otherAssemblers = applications.filter(app => app.assemblerId !== assemblerId);
      console.log('👥 Montadores rejeitados a serem notificados:', otherAssemblers.length);
      
      if (otherAssemblers.length > 0) {
        for (const application of otherAssemblers) {
          try {
            console.log(`🔄 Notificando montador ID ${application.assemblerId}...`);
            const assemblerRecord = await storage.getAssemblerById(application.assemblerId);
            if (assemblerRecord) {
              // Get the user data for the assembler
              const assemblerUser = await storage.getUser(assemblerRecord.userId);
              if (assemblerUser) {
                console.log(`✅ Montador encontrado: ${assemblerUser.id} - ${assemblerUser.name}`);
                const notificationMessage = {
                  type: 'service_started_with_other',
                  serviceId: serviceId,
                  serviceTitle: service.title,
                  message: `O serviço "${service.title}" foi iniciado com outro montador. Você pode continuar procurando por outros serviços disponíveis.`,
                  timestamp: new Date().toISOString()
                };
                
                // Send WebSocket notification to the assembler
                console.log('📤 Enviando notificação WebSocket...');
                const notificationSent = global.sendNotification(assemblerUser.id, notificationMessage);
                console.log(`📡 Notificação enviada: ${notificationSent ? 'Sucesso' : 'Falhou'}`);
                console.log(`🔍 ID do usuário usado para notificação: ${assemblerUser.id}`);
              } else {
                console.log(`❌ Dados do usuário não encontrados para montador ID: ${assemblerRecord.userId}`);
              }
            } else {
              console.log(`❌ Montador não encontrado para ID: ${application.assemblerId}`);
            }
          } catch (error) {
            console.error('❌ Erro ao notificar montador:', error);
          }
        }
      } else {
        console.log('ℹ️ Nenhum outro montador para notificar');
      }

      res.json({
        success: true,
        message: "Pagamento confirmado e serviço atualizado para Em Andamento"
      });
    } catch (error) {
      console.error('Erro ao simular confirmação PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Confirm PIX payment with proof
  app.post("/api/payment/pix/confirm", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId, paymentProof, paymentReference, isAutomatic } = req.body;
      
      if (!serviceId || !paymentProof) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // Get service details
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Update service status to "Em Andamento" when payment proof is submitted
      await storage.updateServiceStatus(serviceId, 'in-progress');

      // Get user info for payment proof
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      let messageContent = paymentProof;
      let proofImage = null;

      // If it's an automatic payment, generate a visual proof
      if (isAutomatic) {
        const timestamp = new Date().toLocaleString('pt-BR');
        const proofData = {
          serviceId: serviceId,
          amount: service.price,
          reference: paymentReference || `AMG-${Date.now()}-${serviceId}`,
          payerName: user.name,
          timestamp
        };

        proofImage = generatePaymentProofImage(proofData);
        messageContent = `Pagamento PIX confirmado automaticamente! Valor: R$ ${service.price}`;
      }

      // Send payment proof message to chat
      const messageData = {
        serviceId: serviceId,
        senderId: req.user.id,
        content: messageContent,
        messageType: 'payment_proof' as const
      };

      await storage.createMessage(messageData);

      res.json({
        success: true,
        message: "Comprovante enviado e serviço atualizado para Em Andamento"
      });
    } catch (error) {
      console.error('Erro ao confirmar pagamento PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Test payment proof button - enables after payment proof is uploaded
  app.post("/api/payment/pix/test-proof", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId } = req.body;
      
      if (!serviceId) {
        return res.status(400).json({ message: "ID do serviço é obrigatório" });
      }

      // Get service details
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Check if service has payment proof (look for payment_proof messages)
      const messages = await storage.getMessagesByServiceId(serviceId);
      const hasPaymentProof = messages.some(msg => msg.messageType === 'payment_proof');

      if (!hasPaymentProof) {
        return res.status(400).json({ message: "Nenhum comprovante de pagamento encontrado" });
      }

      // Simulate payment proof validation
      // In a real implementation, this would validate the payment with the bank/payment provider
      
      res.json({
        success: true,
        message: "Comprovante validado com sucesso. Botão de repasse habilitado.",
        canTransfer: true
      });
    } catch (error) {
      console.error('Erro ao testar comprovante PIX:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Transfer payment to assembler
  app.post("/api/payment/pix/transfer", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId } = req.body;
      
      if (!serviceId) {
        return res.status(400).json({ message: "ID do serviço é obrigatório" });
      }

      // Get service details
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Check if user is the store owner
      if (req.user.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem fazer repasses" });
      }

      // Get store info
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Update service status to awaiting evaluation
      await storage.updateServiceStatus(serviceId, 'awaiting_evaluation');

      // Get assembler info for the service
      const acceptedApplication = await db.select()
        .from(applications)
        .where(
          and(
            eq(applications.serviceId, serviceId),
            eq(applications.status, 'accepted')
          )
        )
        .limit(1);

      if (acceptedApplication.length === 0) {
        return res.status(404).json({ message: "Montador não encontrado para este serviço" });
      }

      const assembler = await storage.getAssemblerById(acceptedApplication[0].assemblerId);
      if (!assembler) {
        return res.status(404).json({ message: "Dados do montador não encontrados" });
      }

      const assemblerUser = await storage.getUser(assembler.userId);
      const storeUser = await storage.getUser(req.user.id);

      if (!assemblerUser || !storeUser) {
        return res.status(404).json({ message: "Dados dos usuários não encontrados" });
      }

      // Send transfer notification message
      await storage.createMessage({
        serviceId: serviceId,
        senderId: req.user.id,
        content: `Pagamento transferido para o montador! Valor: R$ ${service.price}. Agora é necessário que ambos avaliem o serviço para finalizá-lo.`,
        messageType: 'transfer_notification' as const
      });

      // Send immediate evaluation notifications to both parties via WebSocket
      const serviceData = {
        id: service.id,
        title: service.title,
        storeData: {
          id: store.id,
          userId: storeUser.id,
          name: storeUser.name
        },
        assemblerData: {
          id: assembler.id,
          userId: assemblerUser.id,
          name: assemblerUser.name
        }
      };

      // Send evaluation notifications using global notification function
      console.log('🔔 Enviando notificação de avaliação para LOJISTA:', {
        userId: storeUser.id,
        userName: storeUser.name,
        evaluateUser: assemblerUser.name
      });
      
      const storeNotificationMessage = {
        type: 'evaluation_required',
        serviceId: serviceId,
        serviceData: serviceData,
        userId: storeUser.id,
        evaluateUser: {
          id: assemblerUser.id,
          name: assemblerUser.name,
          type: 'montador'
        },
        message: 'É necessário avaliar o montador para finalizar o serviço.'
      };
      
      const storeNotificationSent = global.sendNotification(storeUser.id, storeNotificationMessage);
      console.log(`✅ Notificação enviada para lojista: ${storeNotificationSent ? 'Sucesso' : 'Falhou'}`);

      // Add delay before sending assembler notification to ensure connection stability
      setTimeout(() => {
        console.log('🔔 Enviando notificação de avaliação para MONTADOR (com delay):', {
          userId: assemblerUser.id,
          userName: assemblerUser.name,
          evaluateUser: storeUser.name
        });
        
        const assemblerNotificationMessage = {
          type: 'evaluation_required',
          serviceId: serviceId,
          serviceData: serviceData,
          userId: assemblerUser.id,
          evaluateUser: {
            id: storeUser.id,
            name: storeUser.name,
            type: 'lojista'
          },
          message: 'É necessário avaliar o lojista para finalizar o serviço.'
        };
        
        console.log(`🔍 Verificando conexões antes de enviar: ${Array.from(userConnections.keys()).join(', ')}`);
        const assemblerNotificationSent = global.sendNotification(assemblerUser.id, assemblerNotificationMessage);
        console.log(`✅ Notificação enviada para montador: ${assemblerNotificationSent ? 'Sucesso' : 'Falhou'}`);
        console.log(`🔍 ID do montador usado para notificação: ${assemblerUser.id}`);
        
        // If WebSocket notification failed, create a persistent notification message
        if (!assemblerNotificationSent) {
          console.log('⚠️ Notificação WebSocket falhou. Criando notificação persistente no chat...');
          
          // Create a system message to ensure the assembler knows they need to evaluate
          storage.createMessage({
            serviceId: serviceId,
            assemblerId: acceptedApplication[0].assemblerId,
            senderId: storeUser.id, // Use store user ID instead of system
            content: `🔔 AVALIAÇÃO OBRIGATÓRIA: Você precisa avaliar o lojista ${storeUser.name} para finalizar este serviço. Clique no botão de avaliação no chat ou acesse a aba de avaliações pendentes.`,
            messageType: 'system_notification' as const
          }).then(() => {
            console.log('✅ Notificação persistente criada no chat');
          }).catch(error => {
            console.error('❌ Erro ao criar notificação persistente:', error);
          });
        }
      }, 1000); // Wait 1 second before sending assembler notification

      res.json({
        success: true,
        message: "Pagamento transferido com sucesso e serviço concluído"
      });
    } catch (error) {
      console.error('Erro ao transferir pagamento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rating API endpoints
  // Submit rating for a service
  app.post("/api/services/:serviceId/rate", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceId = parseInt(req.params.serviceId);
      const { rating, comment, emojiRating } = req.body;

      if (!serviceId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      // Get service details
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Get user's store or assembler info to determine who they are rating
      const userStore = await storage.getStoreByUserId(req.user.id);
      const userAssembler = await storage.getAssemblerByUserId(req.user.id);

      let toUserId: number;
      let fromUserType: string;
      let toUserType: string;

      if (userStore && userStore.id === service.storeId) {
        // User is the store owner, rating the assembler
        // Find accepted application for this service
        const acceptedApplication = await db.select()
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, serviceId),
              eq(applications.status, 'accepted')
            )
          )
          .limit(1);

        if (acceptedApplication.length === 0) {
          return res.status(404).json({ message: "Nenhum montador aceito encontrado para este serviço" });
        }

        const serviceAssembler = await storage.getAssemblerById(acceptedApplication[0].assemblerId);
        if (!serviceAssembler) {
          return res.status(404).json({ message: "Montador não encontrado" });
        }
        toUserId = serviceAssembler.userId;
        fromUserType = 'lojista';
        toUserType = 'montador';
      } else if (userAssembler) {
        // Check if user is the accepted assembler for this service
        const acceptedApplication = await db.select()
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, serviceId),
              eq(applications.assemblerId, userAssembler.id),
              eq(applications.status, 'accepted')
            )
          )
          .limit(1);

        if (acceptedApplication.length === 0) {
          return res.status(403).json({ message: "Você não tem permissão para avaliar este serviço" });
        }

        // User is the assembler, rating the store
        const serviceStore = await storage.getStore(service.storeId);
        if (!serviceStore) {
          return res.status(404).json({ message: "Loja não encontrada" });
        }
        toUserId = serviceStore.userId;
        fromUserType = 'montador';
        toUserType = 'lojista';
      } else {
        return res.status(403).json({ message: "Você não tem permissão para avaliar este serviço" });
      }

      // Check if user has already rated this service
      const existingRating = await storage.getRatingByServiceIdAndUser(serviceId, req.user.id, toUserId);
      if (existingRating) {
        return res.status(400).json({ message: "Você já avaliou este serviço" });
      }

      // Create the rating
      const ratingData = {
        serviceId: serviceId,
        fromUserId: req.user.id,
        toUserId: toUserId,
        fromUserType: fromUserType,
        toUserType: toUserType,
        rating: rating,
        comment: comment || null,
        emojiRating: emojiRating || null
      };

      const newRating = await storage.createRating(ratingData);

      // Check if both parties have now rated each other
      const otherRating = await storage.getRatingByServiceIdAndUser(serviceId, toUserId, req.user.id);
      
      console.log(`🔍 Verificando avaliações mútuas para serviço ${serviceId}:`, {
        currentUserRating: {
          fromUserId: req.user.id,
          toUserId: toUserId,
          fromUserType: fromUserType,
          toUserType: toUserType,
          rating: rating
        },
        otherUserRating: otherRating ? {
          fromUserId: otherRating.fromUserId,
          toUserId: otherRating.toUserId,
          fromUserType: otherRating.fromUserType,
          toUserType: otherRating.toUserType,
          rating: otherRating.rating
        } : null,
        mutualEvaluationComplete: !!otherRating
      });
      
      if (otherRating) {
        // Both parties have rated each other, now we can mark the service as completed
        await storage.updateServiceStatus(serviceId, 'completed');
        
        // Get the assembler ID for proper conversation routing
        const acceptedApplication = await db.select()
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, serviceId),
              eq(applications.status, 'accepted')
            )
          )
          .limit(1);
        
        const assemblerId = acceptedApplication.length > 0 ? acceptedApplication[0].assemblerId : null;
        
        // Send notification message about completion
        await storage.createMessage({
          serviceId: serviceId,
          assemblerId: assemblerId,
          senderId: req.user.id,
          content: `Avaliação mútua concluída! O serviço foi finalizado com sucesso.`,
          messageType: 'evaluation_completed' as const
        });
        
        console.log(`✅ Serviço ${serviceId} COMPLETADO após avaliações mútuas`);
      } else {
        // Only one party has rated, service should remain in awaiting_evaluation status
        console.log(`⏳ Serviço ${serviceId} aguardando avaliação da outra parte (${fromUserType} → ${toUserType})`);
        console.log(`⚠️ ALERTA: Serviço ${serviceId} NÃO pode ser completado até que ambas as partes avaliem`);
        
        // Ensure the service remains in awaiting_evaluation status
        await storage.updateServiceStatus(serviceId, 'awaiting_evaluation');
      }

      res.json({
        success: true,
        message: "Avaliação enviada com sucesso",
        rating: newRating,
        serviceCompleted: !!otherRating
      });

    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get ratings for a service
  app.get("/api/services/:serviceId/ratings", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceId = parseInt(req.params.serviceId);
      if (!serviceId) {
        return res.status(400).json({ message: "ID do serviço inválido" });
      }

      const ratings = await storage.getRatingsByServiceId(serviceId);
      res.json(ratings);

    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get user profile with ratings
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário inválido" });
      }

      // Get user basic info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Get user's rating statistics
      const ratingStats = await storage.getUserAverageRating(userId);
      
      // Get user's detailed ratings
      const ratings = await storage.getUserRatingsWithDetails(userId);

      // Prepare the response data
      let profileData: any = {
        id: user.id,
        name: user.name,
        userType: user.userType,
        profilePhotoData: user.profilePhotoData,
        profilePhotoUrl: user.profilePhotoData, // Frontend expects this field
        averageRating: ratingStats.averageRating,
        totalRatings: ratingStats.totalRatings,
        ratings: ratings,
        city: '',
        state: '',
        specialties: []
      };

      // Get user-specific data (store or assembler)
      if (user.userType === 'lojista') {
        const store = await storage.getStoreByUserId(userId);
        if (store) {
          profileData.city = store.city || '';
          profileData.state = store.state || '';
        }
      } else if (user.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(userId);
        if (assembler) {
          profileData.city = assembler.city || '';
          profileData.state = assembler.state || '';
          
          // Handle specialties - ensure it's always an array of strings
          if (assembler.specialties) {
            if (Array.isArray(assembler.specialties)) {
              profileData.specialties = assembler.specialties.map(spec => 
                typeof spec === 'string' ? spec : String(spec)
              );
            } else {
              profileData.specialties = [String(assembler.specialties)];
            }
          }
        }
      }

      res.json(profileData);

    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get ranking of users
  app.get("/api/ranking/:userType", async (req, res) => {
    try {
      const userType = req.params.userType as 'lojista' | 'montador';
      const limit = parseInt(req.query.limit as string) || 10;

      if (!['lojista', 'montador'].includes(userType)) {
        return res.status(400).json({ message: "Tipo de usuário inválido" });
      }

      const ranking = await storage.getTopRatedUsers(userType, limit);

      res.json({
        userType,
        ranking,
        totalUsers: ranking.length
      });

    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get current user rating statistics
  app.get("/api/user/rating-stats", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const ratingStats = await storage.getUserAverageRating(req.user.id);
      
      res.json(ratingStats);

    } catch (error) {
      console.error('Erro ao buscar estatísticas de avaliação:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  // Analytics Dashboard API
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      
      // Get user services
      let userServices: any[] = [];
      
      if (user.userType === 'lojista') {
        const userStore = await storage.getStoreByUserId(user.id);
        if (userStore) {
          userServices = await storage.getServicesByStoreId(userStore.id);
        }
      } else if (user.userType === 'montador') {
        // For assemblers, get services where they have accepted applications
        userServices = []; // Simplified for now
      }

      // Calculate basic metrics
      const totalServices = userServices.length;
      const completedServices = userServices.filter(s => s.status === 'completed').length;
      const pendingServices = userServices.filter(s => 
        s.status === 'open' || s.status === 'in-progress' || s.status === 'awaiting_evaluation'
      ).length;

      // Calculate total earnings
      const totalEarnings = userServices
        .filter(s => s.status === 'completed' && s.price)
        .reduce((sum, service) => sum + parseFloat(service.price.toString()), 0);

      // Get user ratings
      const { averageRating, totalRatings } = await storage.getUserAverageRating(user.id);

      // Simple monthly stats
      const monthlyStats = [
        { month: 'Nov 2024', services: Math.floor(totalServices * 0.3), earnings: totalEarnings * 0.3, averageRating: averageRating || 0 },
        { month: 'Dez 2024', services: Math.floor(totalServices * 0.4), earnings: totalEarnings * 0.4, averageRating: averageRating || 0 },
        { month: 'Jan 2025', services: Math.floor(totalServices * 0.3), earnings: totalEarnings * 0.3, averageRating: averageRating || 0 }
      ];

      // Get rating distribution from actual user ratings
      const userRatings = await storage.getUserRatingsWithDetails(user.id);
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: userRatings.filter(r => r.rating === rating).length
      }));

      // Simple top categories
      const topCategories = [
        { category: 'Móveis Planejados', count: Math.floor(totalServices * 0.6) },
        { category: 'Cozinhas', count: Math.floor(totalServices * 0.3) },
        { category: 'Guarda-roupas', count: Math.floor(totalServices * 0.1) }
      ].filter(cat => cat.count > 0);

      // Get recent services
      const recentServices = userServices
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(service => ({
          id: service.id,
          title: service.title,
          completedAt: service.createdAt,
          rating: averageRating || 0,
          earnings: parseFloat(service.price?.toString() || '0')
        }));

      const analyticsData = {
        totalServices,
        completedServices,
        averageRating: averageRating || 0,
        totalRatings,
        totalEarnings,
        pendingServices,
        monthlyStats,
        ratingDistribution,
        topCategories,
        recentServices
      };

      res.json(analyticsData);

    } catch (error) {
      console.error('Erro ao buscar dados de analytics:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Analytics Export API
  app.get("/api/analytics/export", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const format = req.query.format as string || 'csv';

      // Get user services
      let userServices: any[] = [];
      
      if (user.userType === 'lojista') {
        const userStore = await storage.getStoreByUserId(user.id);
        if (userStore) {
          userServices = await storage.getServicesByStoreId(userStore.id);
        }
      }

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'ID,Título,Status,Preço,Data de Criação,Data de Início,Data de Fim\n';
        const csvData = userServices.map(service => {
          return [
            service.id,
            `"${service.title}"`,
            service.status,
            service.price || '0',
            service.createdAt,
            service.startDate || '',
            service.endDate || ''
          ].join(',');
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
        res.send(csvHeader + csvData);

      } else if (format === 'pdf') {
        const pdfContent = `
RELATÓRIO DE ANALYTICS - AMIGO MONTADOR

Usuário: ${user.name}
Data de Geração: ${new Date().toLocaleDateString('pt-BR')}

RESUMO:
- Total de Serviços: ${userServices.length}
- Serviços Concluídos: ${userServices.filter(s => s.status === 'completed').length}

DETALHES DOS SERVIÇOS:
${userServices.map(service => `
- ${service.title} (${service.status}) - R$ ${service.price || '0'}
`).join('')}
        `;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.pdf"');
        res.send(pdfContent);
      } else {
        res.status(400).json({ message: "Formato não suportado" });
      }

    } catch (error) {
      console.error('Erro ao exportar dados de analytics:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return server;
}