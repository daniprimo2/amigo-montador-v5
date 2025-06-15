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

  return server;
}