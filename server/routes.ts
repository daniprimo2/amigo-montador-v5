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

      res.json(servicesWithStoreInfo);
    } catch (error) {
      console.error('Erro ao buscar serviços disponíveis:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return server;
}