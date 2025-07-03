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
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'auth' && data.userId) {
          userConnections.set(data.userId, ws);
          
          if (data.userType === 'lojista') {
            storeClients.add(ws);
          } else if (data.userType === 'montador') {
            assemblerClients.add(ws);
          }
        }
      } catch (error) {
        // Error logging removed for production
      }
    });

    ws.on('close', () => {
      // Remover conexão do usuário
      const entries = Array.from(userConnections.entries());
      for (const [userId, connection] of entries) {
        if (connection === ws) {
          userConnections.delete(userId);
          break;
        }
      }
      storeClients.delete(ws);
      assemblerClients.delete(ws);
    });
  });

  // Função global para enviar notificações
  global.sendNotification = function(userId: number, message: any): boolean {
    const connection = userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify(message));
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
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
        senderId: senderId
      };

      // Notificar loja
      sendNotification(store.userId, message);

      // Notificar montador se existir
      const applications = await storage.getApplicationsByServiceId(serviceId);
      for (const app of applications) {
        if (app.status === 'accepted') {
          const assembler = await storage.getAssemblerById(app.assemblerId);
          if (assembler) {
            sendNotification(assembler.userId, message);
          }
        }
      }
    } catch (error) {
      // Error logging removed for production
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
      let profileData: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        profilePhotoData: user.profilePhotoData,
        profilePhotoUrl: user.profilePhotoData
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

  // New endpoint for available services with distance filtering for assemblers
  app.get("/api/services/available", async (req, res) => {
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
      console.log(`Buscando serviços para montador ${assembler.id} (CEP: ${assembler.cep})`);
      const servicesWithDistance = await storage.getAvailableServicesForAssemblerWithDistance(assembler);
      console.log(`Encontrados ${servicesWithDistance.length} serviços dentro do raio de 20km`);
      
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
          
          const serviceWithInfo = {
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
          
          console.log(`Serviço ${service.id} processado: hasApplied=${serviceWithInfo.hasApplied}, applicationStatus=${serviceWithInfo.applicationStatus}, isAssigned=${serviceWithInfo.isAssigned}`);
          
          return serviceWithInfo;
        })
      );

      res.json(servicesWithStoreInfo);
    } catch (error) {
      console.error('Erro ao buscar serviços disponíveis:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para buscar mensagens de um serviço
  app.get("/api/services/:serviceId/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceId = parseInt(req.params.serviceId);
      const assemblerId = req.query.assemblerId ? parseInt(req.query.assemblerId as string) : undefined;

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Buscar mensagens do serviço
      const messages = await storage.getMessagesByServiceId(serviceId);

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
  app.post("/api/services/:serviceId/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user!;
      const serviceId = parseInt(req.params.serviceId);
      const { content, messageType = 'text' } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Conteúdo da mensagem é obrigatório" });
      }

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Criar mensagem
      const message = await storage.createMessage({
        serviceId: serviceId,
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
  app.post("/api/services/:serviceId/apply", async (req, res) => {
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

      // Criar mensagem inicial de candidatura
      await storage.createMessage({
        serviceId: serviceId,
        senderId: user.id,
        content: `Olá! Me candidatei para o serviço "${service.title}". Tenho experiência em montagem de móveis e gostaria de discutir os detalhes do trabalho. Aguardo seu contato!`,
        messageType: 'application'
      });

      // Obter dados da loja para notificação
      const store = await storage.getStore(service.storeId);
      if (store) {
        const storeUser = await storage.getUser(store.userId);
        if (storeUser) {
          // Enviar notificação WebSocket para o lojista
          global.sendNotification(storeUser.id, {
            type: 'new_application',
            title: 'Nova candidatura',
            message: `${user.name} se candidatou ao serviço "${service.title}"`,
            serviceId: serviceId,
            assemblerId: assembler.id,
            data: {
              serviceId: serviceId,
              assemblerId: assembler.id,
              assemblerName: user.name
            }
          });
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
      
      // Para cada serviço, verificar se tem mensagens
      const servicesWithMessages = [];
      
      for (const service of storeServices) {
        const messages = await storage.getMessagesByServiceId(service.id);
        if (messages.length > 0) {
          // Buscar aplicações do serviço para obter informações do montador
          const applications = await storage.getApplicationsByServiceId(service.id);
          
          let assemblerInfo = null;
          if (applications.length > 0) {
            const assembler = await storage.getAssemblerById(applications[0].assemblerId);
            if (assembler) {
              const assemblerUser = await storage.getUser(assembler.userId);
              assemblerInfo = {
                id: assembler.id,
                name: assemblerUser?.name || 'Montador',
                userId: assembler.userId
              };
            }
          }
          
          servicesWithMessages.push({
            ...service,
            lastMessageAt: messages[messages.length - 1]?.sentAt,
            assembler: assemblerInfo
          });
        }
      }

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

  // Endpoint para buscar perfil de usuário por ID (usado no chat)
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      let profileData: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        profilePhotoData: user.profilePhotoData,
        profilePhotoUrl: user.profilePhotoData,
        // City e state não existem na tabela users, só nas tabelas stores e assemblers
        city: '',
        state: ''
      };

      if (user.userType === 'lojista') {
        const store = await storage.getStoreByUserId(user.id);
        if (store) {
          // Atualizar city e state do perfil com dados da loja
          profileData.city = store.city || '';
          profileData.state = store.state || '';
          
          profileData.store = {
            id: store.id,
            name: store.name,
            address: store.address,
            city: store.city || '',
            state: store.state || '',
            logoUrl: store.logoData,
            logoData: store.logoData
          };
        }
      } else if (user.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(user.id);
        if (assembler) {
          // Atualizar city e state do perfil com dados do montador
          profileData.city = assembler.city || '';
          profileData.state = assembler.state || '';
          
          profileData.assembler = {
            id: assembler.id,
            experience: assembler.experience,
            description: assembler.professionalDescription || '',
            availability: assembler.availability,
            rating: assembler.rating
          };
          
          // Garantir que specialties seja sempre um array de strings
          if (assembler.specialties) {
            if (Array.isArray(assembler.specialties)) {
              profileData.specialties = assembler.specialties.map(spec => 
                typeof spec === 'string' ? spec : String(spec)
              );
            } else {
              profileData.specialties = [String(assembler.specialties)];
            }
          } else {
            profileData.specialties = [];
          }
        }
      }

      res.json(profileData);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
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

  return server;
}