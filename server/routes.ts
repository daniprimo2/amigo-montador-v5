import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { eq, and, not, isNotNull, or, sql } from "drizzle-orm";
import { services, applications, stores, assemblers, messages, users, ratings, bankAccounts, type User, type Store, type Assembler, type Service, type Message, type Rating, type InsertRating, type BankAccount, type InsertBankAccount } from "@shared/schema";
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import fileUpload from 'express-fileupload';
import axios from 'axios';

// Declarar as funções globais de notificação
declare global {
  var notifyStore: (serviceId: number, montadorId: number, mensagem: string) => Promise<void>;
  var notifyNewMessage: (serviceId: number, senderId: number) => Promise<void>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Log das requisições
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  
  // Configurar middleware de upload de arquivos
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));
  
  // Configurar pasta de uploads para ser acessível publicamente
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Criar pasta para uploads de PDFs de projetos se não existir
  const projectUploadsDir = path.join(process.cwd(), 'uploads', 'projects');
  if (!fs.existsSync(projectUploadsDir)) {
    fs.mkdirSync(projectUploadsDir, { recursive: true });
  }
  
  // Configurar autenticação
  setupAuth(app);

  // API para serviços
  app.get("/api/services", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Obter query params para filtros
      const { status, userType } = req.query;
      
      console.log(`[${new Date().toISOString()}] Buscando serviços para usuário tipo: ${req.user?.userType}`);
      
      let servicesList: Service[] = [];
      
      // Buscar serviços baseado no tipo de usuário
      if (req.user?.userType === 'lojista') {
        // Lojistas veem seus próprios serviços
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store) {
          return res.status(404).json({ message: "Loja não encontrada" });
        }
        
        console.log(`Buscando serviços para o lojista (store_id: ${store.id})`);
        servicesList = await storage.getServicesByStoreId(store.id, status as string);
      } else if (req.user?.userType === 'montador') {
        // Montadores veem serviços disponíveis na sua região
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (!assembler) {
          return res.status(404).json({ message: "Montador não encontrado" });
        }
        
        console.log(`Buscando serviços disponíveis para o montador (id: ${assembler.id})`);
        // Buscar serviços disponíveis para montador (incluindo nome da loja)
        servicesList = await storage.getAvailableServicesForAssembler(assembler);
      } else {
        // Tipo de usuário não reconhecido
        return res.status(403).json({ message: "Tipo de usuário não autorizado" });
      }

      // Garantir que sempre retorne um array, mesmo vazio
      if (!Array.isArray(servicesList)) {
        servicesList = [];
      }
      
      console.log(`Encontrados ${servicesList.length} serviços para o usuário tipo: ${req.user?.userType}`);
      
      // Log detalhado dos serviços antes da formatação
      if (req.user?.userType === 'montador' && servicesList.length > 0) {
        console.log("Dados completos do primeiro serviço:", JSON.stringify(servicesList[0], null, 2));
      }
      
      // Formatar dados para o frontend (especialmente para montadores)
      if (req.user?.userType === 'montador') {
        const formattedServices = servicesList.map(service => {
          // Calcular distância simulada (em uma implementação real, usaria geolocalização)
          const mockDistance = "2.5 km";
          
          // Criar endereço completo quando disponível
          let fullAddress = service.location || 'Localização não especificada';
          if (service.address && service.addressNumber) {
            fullAddress = `${service.address}, ${service.addressNumber} - ${service.location}`;
            if (service.cep) {
              fullAddress += ` - CEP: ${service.cep}`;
            }
          }
          
          // Processar projectFiles para garantir que sejam incluídos corretamente
          let projectFiles = [];
          if (service.projectFiles) {
            try {
              // Se projectFiles estiver como string JSON, fazer parse
              if (typeof service.projectFiles === 'string') {
                projectFiles = JSON.parse(service.projectFiles);
              } else if (Array.isArray(service.projectFiles)) {
                projectFiles = service.projectFiles;
              }
            } catch (error) {
              console.error(`Erro ao processar projectFiles para serviço ${service.id}:`, error);
              projectFiles = [];
            }
          }
          
          return {
            id: service.id,
            title: service.title,
            description: service.description || '',
            location: fullAddress,
            address: service.address || '',
            addressNumber: service.addressNumber || '',
            cep: service.cep || '',
            distance: mockDistance,
            date: service.startDate && service.endDate 
              ? `${service.startDate.toISOString().split('T')[0]} - ${service.endDate.toISOString().split('T')[0]}`
              : 'Data não especificada',
            startDate: service.startDate ? service.startDate.toISOString() : null,
            endDate: service.endDate ? service.endDate.toISOString() : null,
            price: service.price || 'Preço não informado',
            store: (service as any).storeName || 'Loja não especificada',
            type: service.materialType || 'Material não especificado',
            status: service.status,
            projectFiles: projectFiles
          };
        });
        
        res.json(formattedServices);
      } else {
        res.json(servicesList);
      }
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });
  
  // Obter serviços ativos (em andamento) para um montador
  app.get("/api/services/active", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (req.user?.userType !== 'montador') {
        return res.status(403).json({ message: "Acesso permitido apenas para montadores" });
      }

      // Obter o assembler do usuário
      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Montador não encontrado" });
      }

      console.log("Buscando serviços ativos para o montador id:", assembler.id);

      // Buscar TODAS as candidaturas do montador (tanto aceitas como pendentes)
      const allApplications = await db
        .select()
        .from(applications)
        .where(eq(applications.assemblerId, assembler.id));

      console.log(`Encontradas ${allApplications.length} candidaturas para o montador`);

      // Extrair os IDs dos serviços das candidaturas
      const serviceIdsFromApplications = allApplications.map(app => app.serviceId);
      
      // Também buscar serviços onde o montador enviou mensagens
      const messageServices = await db
        .select({
          serviceId: messages.serviceId
        })
        .from(messages)
        .where(eq(messages.senderId, req.user.id));
      
      // Combinar IDs de serviços de candidaturas e mensagens (sem duplicatas)
      const serviceIdsFromMessages = messageServices.map(msg => msg.serviceId);
      
      // Unir as duas listas e remover duplicatas
      const allServiceIds: number[] = [];
      
      // Adicionar IDs de serviços das candidaturas
      serviceIdsFromApplications.forEach(id => {
        if (!allServiceIds.includes(id)) {
          allServiceIds.push(id);
        }
      });
      
      // Adicionar IDs de serviços das mensagens
      serviceIdsFromMessages.forEach(id => {
        if (!allServiceIds.includes(id)) {
          allServiceIds.push(id);
        }
      });
      
      // Se não há serviços, retornar array vazio
      if (allServiceIds.length === 0) {
        console.log("Nenhum serviço ativo encontrado para o montador");
        return res.json([]);
      }
      
      console.log(`Total de ${allServiceIds.length} serviços ativos (candidaturas + mensagens)`);

      // Buscar os serviços correspondentes
      const servicesResult = await db
        .select({
          id: services.id,
          title: services.title,
          description: services.description,
          location: services.location,
          startDate: services.startDate,
          endDate: services.endDate,
          price: services.price,
          status: services.status,
          storeId: services.storeId
        })
        .from(services);
        
      // Filtrar para incluir apenas os serviços que estão na lista de IDs
      const filteredServices = servicesResult.filter(service => 
        allServiceIds.includes(service.id)
      );
      
      console.log(`Encontrados ${filteredServices.length} serviços ativos para o montador (incluindo concluídos)`);

      // Adicionar informações da loja e status da candidatura a cada serviço
      const enhancedServices = await Promise.all(filteredServices.map(async (service) => {
        // Buscar dados da loja
        const storeResult = await db
          .select({
            id: stores.id,
            name: stores.name
          })
          .from(stores)
          .where(eq(stores.id, service.storeId))
          .limit(1);
        
        // Buscar status da candidatura para este serviço
        const application = allApplications.find(app => app.serviceId === service.id);
        
        // Verificar se existem mensagens não lidas para este serviço
        const hasUnreadMessages = await storage.hasUnreadMessages(service.id, req.user.id);
        
        return {
          ...service,
          store: storeResult.length > 0 ? storeResult[0] : null,
          applicationStatus: application ? application.status : null,
          hasAcceptedApplication: application ? application.status === 'accepted' : false,
          hasUnreadMessages: hasUnreadMessages
        };
      }));

      res.json(enhancedServices);
    } catch (error) {
      console.error("Erro ao buscar serviços ativos:", error);
      res.status(500).json({ message: "Erro ao buscar serviços ativos" });
    }
  });
  
  // IMPORTANTE: Buscar TODOS os serviços que possuem mensagens para garantir que nenhuma conversa desapareça
  app.get("/api/store/services/with-messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem acessar esta rota" });
      }

      // Buscar a loja do usuário
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Primeiro, buscar serviços com mensagens
      const baseServicesWithMessages = await db
        .select({
          serviceId: services.id,
          serviceTitle: services.title,
          serviceStatus: services.status,
          servicePrice: services.price,
          serviceLocation: services.location,
          serviceDescription: services.description,
          messageCount: sql<number>`COUNT(DISTINCT ${messages.id})`,
          lastMessageAt: sql<Date>`MAX(${messages.sentAt})`,
        })
        .from(services)
        .innerJoin(messages, eq(messages.serviceId, services.id))
        .where(eq(services.storeId, store.id))
        .groupBy(
          services.id,
          services.title,
          services.status,
          services.price,
          services.location,
          services.description
        )
        .orderBy(sql`MAX(${messages.sentAt}) DESC`);

      // Depois, buscar informações do montador para cada serviço
      const servicesWithMessages = await Promise.all(
        baseServicesWithMessages.map(async (service) => {
          const acceptedApplication = await db
            .select({
              assemblerId: applications.assemblerId,
              assemblerUserId: users.id,
              assemblerName: users.name,
            })
            .from(applications)
            .leftJoin(assemblers, eq(assemblers.id, applications.assemblerId))
            .leftJoin(users, eq(users.id, assemblers.userId))
            .where(and(
              eq(applications.serviceId, service.serviceId),
              eq(applications.status, 'accepted')
            ))
            .limit(1);

          return {
            ...service,
            assemblerId: acceptedApplication[0]?.assemblerId || null,
            assemblerUserId: acceptedApplication[0]?.assemblerUserId || null,
            assemblerName: acceptedApplication[0]?.assemblerName || null,
          };
        })
      );

      // Formatar dados para o frontend
      const formattedServices = servicesWithMessages.map(service => ({
        id: service.serviceId,
        title: service.serviceTitle,
        status: service.serviceStatus,
        price: service.servicePrice,
        location: service.serviceLocation,
        description: service.serviceDescription,
        messageCount: service.messageCount,
        lastMessageAt: service.lastMessageAt,
        assembler: service.assemblerUserId ? {
          id: service.assemblerId,
          userId: service.assemblerUserId,
          name: service.assemblerName
        } : null,
        hasConversation: true // Garantir que sempre tenha conversa disponível
      }));

      console.log(`[API] Encontrados ${formattedServices.length} serviços com mensagens para a loja ${store.id}`);

      res.json(formattedServices);
    } catch (error: any) {
      console.error("Erro ao buscar serviços com mensagens:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Obter serviços com candidaturas aceitas para a loja
  // Nova rota para buscar serviços com candidaturas pendentes
  app.get("/api/store/services/with-pending-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Acesso permitido apenas para lojistas" });
      }

      // Obter o id da loja do usuário
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Usar storage diretamente para evitar problemas com Drizzle
      const storeServices = await storage.getServicesByStoreId(store.id, 'open');

      const servicesWithPendingApplications = [];

      for (const service of storeServices) {
        try {
          // Buscar candidaturas pendentes para este serviço
          const allApplications = await storage.getApplicationsByServiceId(service.id);
          const pendingApplications = allApplications.filter(app => app.status === 'pending');

          if (pendingApplications.length > 0) {
            // Para cada candidatura pendente, obter informações do montador
            const applicationsWithDetails = [];
            
            for (const application of pendingApplications) {
              try {
                const assembler = await storage.getAssemblerById(application.assemblerId);
                
                if (assembler) {
                  const assemblerUser = await storage.getUser(assembler.userId);
                  
                  applicationsWithDetails.push({
                    ...application,
                    assembler: {
                      id: assembler.id,
                      name: assemblerUser?.name || 'Montador',
                      userId: assembler.userId
                    }
                  });
                } else {
                  applicationsWithDetails.push(application);
                }
              } catch (appError) {
                console.error(`Erro ao processar candidatura ${application.id}:`, appError);
                applicationsWithDetails.push(application);
              }
            }
            
            // Adicionar o serviço com as candidaturas pendentes à lista
            servicesWithPendingApplications.push({
              ...service,
              pendingApplications: applicationsWithDetails
            });
          }
        } catch (serviceError) {
          console.error(`Erro ao processar serviço ${service.id}:`, serviceError);
        }
      }

      res.json(servicesWithPendingApplications);
    } catch (error) {
      console.error("Erro ao buscar serviços com candidaturas pendentes:", error);
      res.status(500).json({ message: "Erro ao buscar serviços com candidaturas pendentes" });
    }
  });

  // Endpoint para buscar serviços com candidaturas aceitas (montadores já atribuídos)
  app.get("/api/store/services/with-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Acesso permitido apenas para lojistas" });
      }

      // Obter o id da loja do usuário
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Buscar serviços em progresso e concluídos usando storage
      const inProgressServices = await storage.getServicesByStoreId(store.id, 'in-progress');
      const completedServices = await storage.getServicesByStoreId(store.id, 'completed');
      const storeServices = [...inProgressServices, ...completedServices];

      // Para cada serviço, obter a candidatura aceita
      const servicesWithApplication = [];
      
      for (const service of storeServices) {
        try {
          // Buscar candidaturas aceitas para este serviço usando storage
          const allApplications = await storage.getApplicationsByServiceId(service.id);
          const acceptedApplications = allApplications.filter(app => app.status === 'accepted');

          // Se houver uma candidatura aceita, obter detalhes do montador
          if (acceptedApplications.length > 0) {
            const application = acceptedApplications[0];
            
            // Buscar dados do montador
            const assembler = await storage.getAssemblerById(application.assemblerId);
              
            if (assembler) {
              // Buscar dados do usuário montador
              const assemblerUser = await storage.getUser(assembler.userId);
                
              if (assemblerUser) {
                // Verificar se há mensagens não lidas para este serviço
                const hasNewMessages = await storage.hasUnreadMessages(service.id, req.user!.id);
                
                servicesWithApplication.push({
                  ...service,
                  assembler: {
                    id: assembler.id,
                    name: assemblerUser.name,
                    userId: assembler.userId
                  },
                  hasNewMessages: hasNewMessages
                });
              } else {
                servicesWithApplication.push(service);
              }
            } else {
              servicesWithApplication.push(service);
            }
          } else {
            // Se não houver candidatura aceita, não incluir o serviço na lista
            // pois esta endpoint é apenas para serviços com candidaturas aceitas
          }
        } catch (serviceError) {
          console.error(`Erro ao processar serviço ${service.id}:`, serviceError);
          // Incluir o serviço sem dados do montador em caso de erro
          servicesWithApplication.push(service);
        }
      }

      res.json(servicesWithApplication);
    } catch (error) {
      console.error("Erro ao buscar serviços com candidaturas:", error);
      res.status(500).json({ message: "Erro ao buscar serviços com candidaturas" });
    }
  });



  // Criar novo serviço (apenas lojistas)
  app.post("/api/services", async (req, res) => {
    try {
      // Log do corpo da requisição para diagnóstico
      console.log("Corpo da requisição recebido:", req.body);
      console.log("Tipo do conteúdo:", req.headers['content-type']);
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Verificar se é lojista
      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem criar serviços" });
      }

      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Processar o campo de data combinado em startDate e endDate
      let serviceData = { ...req.body };
      if (serviceData.date) {
        try {
          const dateRange = serviceData.date.split(' - ');
          if (dateRange.length === 2) {
            serviceData.startDate = new Date(dateRange[0]);
            serviceData.endDate = new Date(dateRange[1]);
          } else {
            // Se não estiver no formato esperado, usar a data como startDate e endDate
            serviceData.startDate = new Date(serviceData.date);
            serviceData.endDate = new Date(serviceData.date);
          }
        } catch (error) {
          return res.status(400).json({ message: "Formato de data inválido" });
        }
        // Remover o campo date original
        delete serviceData.date;
      }

      // Criar serviço
      serviceData = {
        ...serviceData,
        storeId: store.id,
        status: 'open',
        createdAt: new Date()
      };
      
      // Garantir que valores em branco não sejam enviados como string vazia
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key] === '') {
          serviceData[key] = null;
        }
      });

      // Verificar campos obrigatórios antes de enviar para o banco de dados
      const requiredFields = {
        title: "Título do Serviço",
        location: "Cidade/UF",
        startDate: "Data de Início",
        endDate: "Data de Fim",
        price: "Valor",
        materialType: "Material"
      };

      // Log dos dados recebidos para depuração
      console.log("Dados do serviço recebidos no servidor:", serviceData);
      
      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        // Verificação mais detalhada: campo deve existir e não ser vazio/null/undefined
        const value = serviceData[field];
        if (value === null || value === undefined || value === '') {
          missingFields.push(label);
          console.log(`Campo '${field}' faltando. Valor atual: [${value}] (${typeof value})`);
        } else {
          console.log(`Campo '${field}' validado. Valor: [${value}] (${typeof value})`);
        }
      }

      // Log dos campos faltantes
      console.log("Campos faltantes:", missingFields);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Por favor, preencha os seguintes campos: ${missingFields.join(", ")}.`,
          missingFields
        });
      }

      const newService = await storage.createService(serviceData);
      res.status(201).json(newService);
    } catch (error: any) {
      console.error("Erro ao criar serviço:", error);
      
      // Tratamento específico de erros de banco de dados
      if (error.code === '23502') { // Violação de not-null constraint
        const column = error.column;
        let fieldName = column === 'title' ? 'Título do Serviço' :
                        column === 'location' ? 'Cidade/UF' :
                        column === 'start_date' ? 'Data de Início' :
                        column === 'end_date' ? 'Data de Fim' :
                        column === 'price' ? 'Valor' :
                        column === 'material_type' ? 'Material' : column;
        
        return res.status(400).json({ 
          message: `Por favor, preencha o campo: ${fieldName}.`,
          field: column,
          missingFields: [fieldName]
        });
      }
      
      res.status(500).json({ message: "Erro ao criar serviço: " + (error.message || error) });
    }
  });

  // Criar serviço com upload de arquivos PDF (apenas lojistas)
  app.post("/api/services/with-files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Verificar se é lojista
      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem criar serviços" });
      }

      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      // Verificar se há arquivos enviados
      if (!req.files || !req.files.projectFiles) {
        return res.status(400).json({ message: "Nenhum arquivo de projeto enviado" });
      }
      
      // Verificar se os dados do serviço foram enviados
      if (!req.body.serviceData) {
        return res.status(400).json({ message: "Dados do serviço não enviados" });
      }
      
      // Parsing dos dados do serviço do JSON
      let serviceData;
      try {
        serviceData = JSON.parse(req.body.serviceData);
      } catch (error) {
        return res.status(400).json({ message: "Formato inválido dos dados do serviço" });
      }
      
      // Debug: verificar se o campo date existe
      console.log("DEBUG: Verificando campo date em serviceData:", !!serviceData.date);
      console.log("DEBUG: Valor do campo date:", serviceData.date);
      console.log("DEBUG: Todas as chaves de serviceData:", Object.keys(serviceData));
      console.log("DEBUG: serviceData completo:", serviceData);
      
      // Processar o campo de data combinado em startDate e endDate
      if (serviceData.date) {
        console.log("Processando data:", serviceData.date);
        try {
          const dateRange = serviceData.date.split(' - ');
          if (dateRange.length === 2) {
            // Validar se as datas são válidas
            const startDate = new Date(dateRange[0]);
            const endDate = new Date(dateRange[1]);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return res.status(400).json({ message: "Formato de data inválido" });
            }
            
            serviceData.startDate = startDate;
            serviceData.endDate = endDate;
          } else {
            return res.status(400).json({ message: "Formato de data deve ser: YYYY-MM-DD - YYYY-MM-DD" });
          }
          console.log("Data processada - startDate:", serviceData.startDate, "endDate:", serviceData.endDate);
        } catch (error) {
          return res.status(400).json({ message: "Formato de data inválido" });
        }
        // Remover o campo date original
        delete serviceData.date;
      } else {
        console.log("DEBUG: Campo date não encontrado, mas deveria estar presente!");
        return res.status(400).json({ message: "Data de início e fim são obrigatórias" });
      }

      // Adicionar dados do lojista
      serviceData = {
        ...serviceData,
        storeId: store.id,
        status: 'open',
        createdAt: new Date()
      };
      
      // Verificar campos obrigatórios principais
      const requiredFields = {
        title: "Título do Serviço",
        startDate: "Data de Início",
        endDate: "Data de Fim",
        location: "Localização",
        price: "Valor",
        materialType: "Material"
      };
      
      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        if (!serviceData[field]) {
          missingFields.push(label);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Campos obrigatórios não preenchidos", 
          missingFields
        });
      }
      
      // Processar os arquivos PDF
      const projectFilesArray = Array.isArray(req.files.projectFiles) 
        ? req.files.projectFiles 
        : [req.files.projectFiles];
      
      const uploadedFiles = [];
      
      for (const file of projectFilesArray) {
        // Verificar se é um PDF
        if (!file.mimetype.includes('pdf')) {
          return res.status(400).json({ 
            message: `O arquivo "${file.name}" não é um PDF válido` 
          });
        }
        
        // Verificar tamanho (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({ 
            message: `O arquivo "${file.name}" excede o tamanho máximo permitido de 10MB` 
          });
        }
        
        // Gerar nome de arquivo único
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.name}`;
        const uploadPath = path.join(projectUploadsDir, fileName);
        
        // Mover o arquivo
        await file.mv(uploadPath);
        
        // Adicionar à lista de arquivos
        uploadedFiles.push({
          name: file.name,
          path: `/uploads/projects/${fileName}`
        });
      }
      
      // Adicionar os caminhos dos arquivos aos dados do serviço
      serviceData.projectFiles = uploadedFiles;
      
      // Log dos dados antes de salvar no banco
      console.log("Dados que serão salvos no banco:", serviceData);
      
      // Criar o serviço no banco de dados
      const service = await storage.createService(serviceData);
      
      console.log("Serviço criado no banco:", service);
      
      res.status(201).json({
        ...service,
        projectFiles: uploadedFiles
      });
    } catch (error) {
      console.error("Erro ao criar serviço com arquivos:", error);
      res.status(500).json({ message: "Erro ao criar serviço com arquivos" });
    }
  });
  
  // Atualizar status de serviço
  app.patch("/api/services/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!['open', 'in-progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }

      // Verificar se o serviço existe e pertence ao lojista
      const service = await storage.getServiceById(parseInt(id));
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Apenas o lojista dono do serviço pode atualizar o status
      const store = await storage.getStoreByUserId(req.user.id);
      if (req.user?.userType === 'lojista' && store?.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a modificar este serviço" });
      }

      // Atualizar status
      const updatedService = await storage.updateServiceStatus(parseInt(id), status);
      res.json(updatedService);
    } catch (error) {
      console.error("Erro ao atualizar status do serviço:", error);
      res.status(500).json({ message: "Erro ao atualizar status do serviço" });
    }
  });
  
  // Excluir serviço (apenas lojistas)
  app.delete("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);
      
      // Verificar se é lojista
      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem excluir serviços" });
      }
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se o lojista é dono do serviço
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a excluir este serviço" });
      }
      
      // IMPORTANTE: Verificar se o serviço está em andamento ou finalizado
      if (service.status === 'in-progress') {
        return res.status(400).json({ 
          message: "Não é possível excluir um serviço que está em andamento. Conversas de serviços em andamento devem ser preservadas." 
        });
      }
      
      if (service.status === 'completed') {
        return res.status(400).json({ 
          message: "Não é possível excluir um serviço finalizado. O histórico deve ser preservado." 
        });
      }
      
      // Excluir serviço (apenas se status for 'open' ou 'cancelled')
      await storage.deleteService(serviceId);
      
      res.status(200).json({ message: "Serviço excluído com sucesso" });
    } catch (error: any) {
      console.error("Erro ao excluir serviço:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir serviço" });
    }
  });
  
  // Confirmar serviço pelo montador após notificação da loja
  app.patch("/api/services/:id/confirm-assembler", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceId = parseInt(req.params.id, 10);
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se o usuário é montador
      if (req.user?.userType !== 'montador') {
        return res.status(403).json({ message: "Apenas montadores podem confirmar serviços" });
      }
      
      // Verificar se o montador está associado a este serviço
      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Perfil de montador não encontrado" });
      }
      
      // Buscar a candidatura aceita para o serviço
      const acceptedApplication = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.serviceId, serviceId),
            eq(applications.assemblerId, assembler.id),
            eq(applications.status, 'accepted')
          )
        )
        .limit(1);
      
      if (acceptedApplication.length === 0) {
        return res.status(403).json({ 
          message: "Você não está associado a este serviço ou sua candidatura não foi aceita" 
        });
      }
      
      // Atualizar status do serviço para 'confirmed' (status intermediário)
      await db
        .update(services)
        .set({ 
          status: 'confirmed',
          updatedAt: new Date()
        })
        .where(eq(services.id, serviceId));
      
      // Notificar o lojista que o montador confirmou
      try {
        // Buscar informações da loja
        const storeData = await storage.getStore(service.storeId);
        if (storeData) {
          const storeUser = await storage.getUser(storeData.userId);
          
          // Preparar dados para notificação
          const serviceInfo = {
            id: service.id,
            title: service.title,
            storeData: {
              id: storeData.id,
              userId: storeData.userId,
              name: storeUser ? storeUser.name : 'Loja'
            },
            assemblerData: {
              id: assembler.id,
              userId: req.user.id,
              name: req.user.name
            }
          };
          
          // Enviar notificação para o lojista usando a função sendNotification
          sendNotification(storeData.userId, {
            type: 'service_confirmed',
            message: `O montador ${req.user.name} confirmou o serviço "${service.title}". Aguardando pagamento.`,
            serviceId: service.id,
            serviceData: serviceInfo,
            timestamp: new Date().toISOString()
          });
          
          // Após um breve delay, enviar notificação para o montador de que o pagamento está disponível
          setTimeout(() => {
            sendNotification(req.user.id, {
              type: 'payment_ready',
              message: `O serviço "${service.title}" foi confirmado. Você já pode realizar o pagamento.`,
              serviceId: service.id,
              serviceData: serviceInfo,
              timestamp: new Date().toISOString()
            });
          }, 1500);
        }
      } catch (notifyError) {
        console.error("Erro ao enviar notificação de confirmação:", notifyError);
        // Não falhar a API se a notificação não for enviada
      }
      
      res.json({
        success: true,
        message: "Serviço confirmado com sucesso",
        status: 'confirmed'
      });
    } catch (error: any) {
      console.error("Erro ao confirmar serviço:", error);
      res.status(500).json({ message: error.message || "Erro ao confirmar serviço" });
    }
  });

  // Finalizar serviço e confirmar pagamento
  app.patch("/api/services/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const serviceId = parseInt(req.params.id, 10);
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar permissões
      if (req.user?.userType === 'lojista') {
        // Se for lojista, verificar se é o proprietário do serviço
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store || store.id !== service.storeId) {
          return res.status(403).json({ message: "Não autorizado a finalizar este serviço" });
        }
      } else if (req.user?.userType === 'montador') {
        // Se for montador, verificar se tem uma candidatura aceita para este serviço
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (!assembler) {
          return res.status(403).json({ message: "Montador não encontrado" });
        }
        
        // Verificar aplicação
        const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
        if (!application || application.status !== 'accepted') {
          return res.status(403).json({ message: "Você não está autorizado a finalizar este serviço" });
        }
      } else {
        return res.status(403).json({ message: "Tipo de usuário não autorizado" });
      }

      // Atualizar status para 'completed' e gravar data de finalização
      const updatedService = await storage.updateService(serviceId, {
        status: 'completed',
        completedAt: new Date()
      });
      
      // Enviar notificação sobre a finalização do serviço
      try {
        // Obter informações do montador
        const assemblerApp = await db
          .select({
            assemblerId: applications.assemblerId
          })
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, serviceId),
              eq(applications.status, 'accepted')
            )
          )
          .limit(1);
          
        if (assemblerApp.length > 0) {
          // Buscar dados completos do serviço com detalhes da loja e montador para enviar nas notificações
          const serviceData = await storage.getServiceById(serviceId);
          const assemblerId = assemblerApp[0].assemblerId;
          const assemblerData = await storage.getAssemblerById(assemblerId);
          const storeData = await storage.getStore(serviceData.storeId);
          
          // Buscar usuários para obter IDs para as notificações WebSocket
          const assemblerUser = assemblerData ? await storage.getUser(assemblerData.userId) : null;
          const storeUser = storeData ? await storage.getUser(storeData.userId) : null;
          
          if (assemblerUser && storeUser && serviceData) {
            // Preparar dados do serviço para enviar na notificação
            const serviceInfo = {
              id: serviceData.id,
              title: serviceData.title,
              storeData: {
                id: storeData.id, 
                userId: storeData.userId,
                name: storeUser.name
              },
              assemblerData: {
                id: assemblerId,
                userId: assemblerData.userId,
                name: assemblerUser.name
              }
            };
            
            // Notificar a loja sobre finalização e avaliação
            const notifyMessage = "Serviço finalizado com sucesso! Por favor, avalie o montador.";
            
            // Enviar para a loja
            const storeWs = clients.get(storeUser.id.toString());
            if (storeWs) {
              storeWs.send(JSON.stringify({
                type: 'service_completed',
                message: notifyMessage,
                serviceId: serviceData.id,
                serviceData: serviceInfo,
                timestamp: new Date().toISOString()
              }));
            }
            
            // Enviar para o montador
            const assemblerWs = clients.get(assemblerUser.id.toString());
            if (assemblerWs) {
              assemblerWs.send(JSON.stringify({
                type: 'service_completed',
                message: "Serviço finalizado com sucesso! Por favor, avalie a loja.",
                serviceId: serviceData.id,
                serviceData: serviceInfo,
                timestamp: new Date().toISOString()
              }));
            }
            
            console.log(`Notificações de avaliação enviadas para loja (${storeUser.id}) e montador (${assemblerUser.id})`);
          }
        }
      } catch (notifyError) {
        console.error("Erro ao enviar notificação de finalização:", notifyError);
        // Não falhar a API se a notificação não for enviada
      }
      
      res.json({
        success: true,
        message: "Serviço finalizado com sucesso",
        service: updatedService
      });
    } catch (error) {
      console.error("Erro ao finalizar serviço:", error);
      res.status(500).json({ message: "Erro ao finalizar serviço" });
    }
  });

  // Candidatar-se a um serviço (apenas montadores)
  app.post("/api/services/:id/apply", async (req, res) => {
    try {
      console.log("Candidatura recebida para o serviço ID:", req.params.id);
      
      if (!req.isAuthenticated()) {
        console.log("Erro de candidatura: Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log("Usuário autenticado:", req.user);
      
      // Verificar se é montador
      if (req.user?.userType !== 'montador') {
        console.log("Erro de candidatura: Usuário não é montador, é", req.user?.userType);
        return res.status(403).json({ message: "Apenas montadores podem se candidatar a serviços" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);
      console.log("Processando candidatura para serviço ID:", serviceId);

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.log("Erro de candidatura: Serviço não encontrado ID:", serviceId);
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      console.log("Serviço encontrado:", service.title, "- Status atual:", service.status);

      // Verificar se o serviço está aberto
      if (service.status !== 'open') {
        console.log("Erro de candidatura: Serviço não está aberto. Status atual:", service.status);
        return res.status(400).json({ message: "Este serviço não está mais disponível" });
      }

      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        console.log("Erro de candidatura: Montador não encontrado para userId:", req.user.id);
        return res.status(404).json({ message: "Montador não encontrado" });
      }
      
      console.log("Montador encontrado:", assembler.id);

      // Verificar se já se candidatou
      const existingApplication = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
      if (existingApplication) {
        console.log("Erro de candidatura: Montador já se candidatou");
        return res.status(400).json({ message: "Você já se candidatou para este serviço" });
      }

      // Criar candidatura
      const applicationData = {
        serviceId,
        assemblerId: assembler.id,
        status: 'pending',
        createdAt: new Date()
      };
      
      console.log("Criando candidatura com dados:", applicationData);
      const newApplication = await storage.createApplication(applicationData);
      console.log("Candidatura criada com sucesso:", newApplication);
      
      // Não atualizamos mais o status para 'in-progress' aqui
      // O status será alterado quando o lojista clicar no botão "Em Andamento" no chat
      
      // Criar mensagem inicial para iniciar o chat
      const messageData = {
        serviceId,
        senderId: req.user.id,
        content: `Olá! Eu sou ${req.user.name} e me candidatei para realizar este serviço. Estou à disposição para discutirmos os detalhes.`,
        sentAt: new Date()
      };
      
      console.log("Criando mensagem inicial do chat");
      const newMessage = await storage.createMessage(messageData);
      console.log("Mensagem inicial criada:", newMessage);
      
      // Buscar o ID do usuário lojista dono do serviço
      const serviceStore = await storage.getStore(service.storeId);
      if (serviceStore && serviceStore.userId) {
        // Enviar notificação WebSocket para o lojista
        sendNotification(serviceStore.userId, {
          type: 'new_application',
          serviceId,
          message: `Nova candidatura de ${req.user.name} para o serviço "${service.title}"`,
          timestamp: new Date().toISOString()
        });
        console.log(`Notificação WebSocket enviada para o lojista ID: ${serviceStore.userId}`);
      }
      
      // Notificar o lojista sobre a nova candidatura
      if (global.notifyStore) {
        console.log("Enviando notificação para a loja sobre nova candidatura");
        global.notifyStore(serviceId, req.user.id, 
          `${req.user.name} se candidatou ao serviço "${service.title}" e está esperando sua resposta.`
        );
      }
      
      console.log("Candidatura concluída com sucesso");
      res.status(201).json({
        application: newApplication,
        message: "Candidatura enviada com sucesso. O status do serviço foi atualizado para 'Em andamento' e um chat foi iniciado."
      });
    } catch (error) {
      console.error("Erro ao candidatar-se para serviço:", error);
      res.status(500).json({ message: "Erro ao candidatar-se para serviço" });
    }
  });

  // Obter candidaturas para um serviço (apenas lojista dono do serviço)
  app.get("/api/services/:id/applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se é o lojista dono do serviço
      if (req.user?.userType === 'lojista') {
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store || store.id !== service.storeId) {
          return res.status(403).json({ message: "Não autorizado a ver candidaturas deste serviço" });
        }
      } else {
        return res.status(403).json({ message: "Apenas lojistas podem ver candidaturas" });
      }

      // Obter candidaturas
      const applications = await storage.getApplicationsByServiceId(serviceId);
      res.json(applications);
    } catch (error) {
      console.error("Erro ao buscar candidaturas:", error);
      res.status(500).json({ message: "Erro ao buscar candidaturas" });
    }
  });

  // Aceitar candidatura (apenas lojista dono do serviço)
  app.post("/api/applications/:id/accept", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const applicationId = parseInt(id);

      // Verificar se é lojista
      if (req.user?.userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem aceitar candidaturas" });
      }

      // Verificar se a candidatura existe
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidatura não encontrada" });
      }

      // Verificar se é o lojista dono do serviço
      const service = await storage.getServiceById(application.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a aceitar esta candidatura" });
      }

      // Aceitar candidatura e rejeitar outras
      await storage.acceptApplication(application.id, application.serviceId);
      
      // Atualizar status do serviço para 'in-progress'
      await storage.updateServiceStatus(service.id, 'in-progress');
      
      // Buscar o montador para notificação
      const assembler = await storage.getAssemblerById(application.assemblerId);
      if (assembler) {
        console.log(`[AcceptApplication] Enviando notificação para montador userId: ${assembler.userId}`);
        
        const notificationData = {
          type: 'application_accepted',
          serviceId: service.id,
          message: `Sua candidatura para o serviço "${service.title}" foi aceita pelo lojista.`,
          timestamp: new Date().toISOString()
        };
        
        sendNotification(assembler.userId, notificationData);
        
        // Enviar notificação automática que requer confirmação do montador
        setTimeout(() => {
          console.log(`[AcceptApplication] Enviando notificação automática para montador userId: ${assembler.userId}`);
          
          // Preparar dados do serviço para a notificação
          const serviceData = {
            id: service.id,
            title: service.title,
            price: service.price,
            storeId: service.storeId,
            storeName: req.user?.name || 'Lojista',
            status: 'in-progress'
          };
          
          // Enviar notificação automática para confirmar o serviço
          sendNotification(assembler.userId, {
            type: 'automatic_notification',
            message: `[NOTIFICAÇÃO AUTOMÁTICA] O lojista ${req.user?.name} requer confirmação para o serviço "${service.title}".`,
            serviceId: service.id,
            serviceData: serviceData,
            timestamp: new Date().toISOString()
          });
          
          console.log(`[AcceptApplication] Notificação automática enviada para montador userId: ${assembler.userId}`);
        }, 2000); // Pequeno delay para que a primeira notificação seja processada primeiro
      }

      res.json({ message: "Candidatura aceita com sucesso" });
    } catch (error) {
      console.error("Erro ao aceitar candidatura:", error);
      res.status(500).json({ message: "Erro ao aceitar candidatura" });
    }
  });

  // Upload de documentos
  app.post("/api/upload/documents", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Criar pasta para uploads de documentos se não existir
      const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const uploadedDocuments: Record<string, string> = {};

      // Processar cada documento enviado
      for (const [fieldName, file] of Object.entries(req.files)) {
        const uploadedFile = file as fileUpload.UploadedFile;
        
        // Verificar tipo de arquivo (imagens e PDFs)
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(uploadedFile.mimetype)) {
          return res.status(400).json({ 
            message: `Arquivo ${fieldName} deve ser uma imagem ou PDF` 
          });
        }

        // Verificar tamanho (max 10MB)
        if (uploadedFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({ 
            message: `Arquivo ${fieldName} deve ter menos de 10MB` 
          });
        }

        // Gerar nome de arquivo único
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${uploadedFile.name}`;
        const uploadPath = path.join(documentsDir, fileName);

        // Salvar arquivo
        await uploadedFile.mv(uploadPath);
        
        // Salvar o caminho relativo para o banco
        uploadedDocuments[fieldName] = `/uploads/documents/${fileName}`;
      }

      res.json({ documents: uploadedDocuments });
    } catch (error) {
      console.error("Erro ao fazer upload de documentos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Upload de foto de perfil
  app.post("/api/profile/photo", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Verificar se há um arquivo enviado
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      const photoFile = req.files.photo as fileUpload.UploadedFile;
      
      // Verificar tipo de arquivo (apenas imagens)
      if (!photoFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
      }
      
      // Verificar tamanho (max 5MB)
      if (photoFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
      }
      
      // Gerar nome de arquivo único
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${photoFile.name}`;
      const uploadPath = `./uploads/profiles/${fileName}`;
      
      // Criar diretório se não existir
      if (!fs.existsSync('./uploads')) {
        fs.mkdirSync('./uploads');
      }
      if (!fs.existsSync('./uploads/profiles')) {
        fs.mkdirSync('./uploads/profiles');
      }
      
      // Mover arquivo para o diretório
      await photoFile.mv(uploadPath);
      
      // URL pública para a imagem
      const photoUrl = `/uploads/profiles/${fileName}`;
      
      // Verificar se é um upload de logo da loja ou de foto de perfil
      const uploadType = req.body.type || 'profile-photo';
      
      if (uploadType === 'store-logo' && req.user.userType === 'lojista') {
        // Upload de logo da loja
        console.log("Processando upload de logo da loja");
        
        // Buscar a loja do usuário
        const store = await storage.getStoreByUserId(req.user.id);
        
        if (!store) {
          return res.status(404).json({ message: "Loja não encontrada para este usuário" });
        }
        
        // Atualizar a logo da loja
        await storage.updateStore(store.id, {
          logoUrl: photoUrl
        });
        
        console.log(`Logo da loja atualizado para ${photoUrl}`);
      } else {
        // Upload de foto de perfil
        console.log("Processando upload de foto de perfil");
        
        // Atualizar a foto de perfil diretamente no campo profilePhotoUrl
        await storage.updateUser(req.user.id, {
          profilePhotoUrl: photoUrl
        });
        
        console.log(`Foto de perfil atualizada para ${photoUrl}`);
      }
      
      res.status(200).json({ success: true, photoUrl });
    } catch (error) {
      console.error("Erro no upload de foto:", error);
      res.status(500).json({ message: "Erro ao processar upload de foto" });
    }
  });

  // Perfil do usuário
  app.get("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id, userType } = req.user;
      let profileData = {};

      // Obter a média de avaliações do usuário
      const averageRating = await storage.getAverageRatingForUser(id);

      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(id);
        profileData = { 
          ...req.user, 
          store,
          rating: averageRating // Incluir avaliação média para o lojista
        };
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(id);
        // Para montadores, atualizar o rating médio no objeto assembler
        if (assembler) {
          assembler.rating = averageRating;
        }
        profileData = { ...req.user, assembler };
      }

      res.json(profileData);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });
  
  // Obter perfil de um usuário específico (para o chat)
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Buscar usuário pelo ID
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
        
      if (userResult.length === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const user = userResult[0];
      const userType = user.userType;
      
      // Remover a senha dos dados retornados
      const { password, ...userDataWithoutPassword } = user;
      let profileData = { ...userDataWithoutPassword };
      
      // Obter a média de avaliações do usuário
      const averageRating = await storage.getAverageRatingForUser(userId);
      
      // Adicionar dados específicos com base no tipo de usuário
      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(userId);
        if (store) {
          profileData.store = store;
        }
        // Adicionar a avaliação média para lojistas
        profileData.rating = averageRating;
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(userId);
        if (assembler) {
          // Para montadores, adicionar o rating médio no objeto assembler
          assembler.rating = averageRating;
          profileData.assembler = assembler;
        }
      }
      
      res.json(profileData);
    } catch (error) {
      console.error("Erro ao buscar perfil do usuário:", error);
      res.status(500).json({ message: "Erro ao buscar perfil do usuário" });
    }
  });
  
  // Atualizar perfil do usuário
  app.patch("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id, userType } = req.user;
      const userData = req.body.user;
      
      // Atualizar dados básicos do usuário
      if (userData) {
        // Campos que o usuário pode atualizar
        const allowedFields = ['name', 'email', 'phone'];
        const updateData: Partial<User> = {};
        
        allowedFields.forEach(field => {
          if (userData[field] !== undefined) {
            updateData[field as keyof User] = userData[field];
          }
        });
        
        if (Object.keys(updateData).length > 0) {
          const updatedUser = await storage.updateUser(id, updateData);
          req.user = updatedUser; // Atualizar o usuário na sessão
        }
      }
      
      // Atualizar dados específicos com base no tipo de usuário
      if (userType === 'lojista' && req.body.store) {
        const store = await storage.getStoreByUserId(id);
        if (store) {
          // Campos que o lojista pode atualizar
          const allowedFields = ['name', 'address', 'city', 'state', 'phone', 'logoUrl'];
          const updateData: Partial<Store> = {};
          
          allowedFields.forEach(field => {
            if (req.body.store[field] !== undefined) {
              updateData[field as keyof Store] = req.body.store[field];
            }
          });
          
          if (Object.keys(updateData).length > 0) {
            await storage.updateStore(store.id, updateData);
          }
        }
      } else if (userType === 'montador' && req.body.assembler) {
        const assembler = await storage.getAssemblerByUserId(id);
        if (assembler) {
          // Campos que o montador pode atualizar
          const allowedFields = ['cep', 'address', 'city', 'state', 'radius', 'specialties', 'profileImage'];
          const updateData: Partial<Assembler> = {};
          
          allowedFields.forEach(field => {
            if (req.body.assembler[field] !== undefined) {
              updateData[field as keyof Assembler] = req.body.assembler[field];
            }
          });
          
          if (Object.keys(updateData).length > 0) {
            await storage.updateAssembler(assembler.id, updateData);
          }
        }
      }
      
      // Retornar o perfil atualizado
      let profileData = {};
      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(id);
        profileData = { ...req.user, store };
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(id);
        profileData = { ...req.user, assembler };
      }
      
      res.json(profileData);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  // Obter um serviço específico por ID
  app.get("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar a autorização baseada no tipo de usuário
      let hasAccess = false;
      
      if (req.user?.userType === 'lojista') {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === 'montador') {
        // Para montadores, apenas podem ver serviços disponíveis ou serviços nos quais se candidataram
        if (service.status === 'open') {
          hasAccess = true;
        } else {
          const assembler = await storage.getAssemblerByUserId(req.user.id);
          if (assembler) {
            const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
            if (application) {
              hasAccess = true;
            }
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Não autorizado a ver este serviço" });
      }

      // Retornar o serviço com informações da loja
      // Buscar a loja pelo storeId do serviço, não pelo userId
      const storeResult = await db.select().from(stores).where(eq(stores.id, service.storeId));
      const store = storeResult.length > 0 ? storeResult[0] : null;
      
      const serviceWithStore = {
        ...service,
        store: store ? {
          id: store.id,
          name: store.name
        } : null
      };

      res.json(serviceWithStore);
    } catch (error) {
      console.error("Erro ao buscar serviço:", error);
      res.status(500).json({ message: "Erro ao buscar serviço" });
    }
  });

  // Obter mensagens de um serviço
  app.get("/api/services/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);
      // Obter o ID do montador específico da query string (se fornecido)
      const assemblerIdParam = req.query.assemblerId;
      let assemblerId: number | undefined = undefined;
      
      if (assemblerIdParam && typeof assemblerIdParam === 'string') {
        assemblerId = parseInt(assemblerIdParam);
      }

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se é o lojista dono do serviço ou o montador candidato
      let hasAccess = false;
      let userAssemblerId: number | undefined = undefined;
      
      if (req.user?.userType === 'lojista') {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
          // Se não tiver um assemblerId específico na query, buscamos todas as mensagens
          // (o lojista pode ver todas as mensagens de todos os montadores para este serviço)
        }
      } else if (req.user?.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          // Verificar se o montador tem uma candidatura para esse serviço
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
            userAssemblerId = assembler.id;
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Não autorizado a acessar este chat" });
      }

      // Obter mensagens
      let messages;
      
      // Se for montador, sempre mostramos apenas as mensagens entre ele e o lojista
      if (req.user?.userType === 'montador' && userAssemblerId) {
        messages = await storage.getMessagesBetweenStoreAndAssembler(serviceId, userAssemblerId);
      } 
      // Se for lojista e um assemblerId específico foi fornecido, mostramos apenas as mensagens entre ele e este montador
      else if (req.user?.userType === 'lojista' && assemblerId) {
        messages = await storage.getMessagesBetweenStoreAndAssembler(serviceId, assemblerId);
      }
      // Caso contrário, mostramos todas as mensagens (apenas para o lojista)
      else if (req.user?.userType === 'lojista') {
        messages = await storage.getMessagesByServiceId(serviceId);
      } else {
        // Caso de fallback, não deve acontecer com a lógica acima
        messages = [];
      }
      
      // Enriquecer as mensagens com informações do remetente
      const enhancedMessages = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        return {
          ...message,
          sender: sender ? {
            name: sender.name,
            userType: sender.userType
          } : undefined
        };
      }));
      
      res.json(enhancedMessages);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // Endpoint para tentar deletar uma mensagem específica (agora retorna sempre erro)
  app.delete("/api/services/messages/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      // Retornar sempre 403 com a mensagem de que nenhuma mensagem pode ser excluída
      return res.status(403).json({ 
        message: "Nenhuma mensagem poderá ser excluída do chat, garantindo a preservação completa do histórico de conversas."
      });
      
    } catch (error) {
      console.error("Tentativa de excluir mensagem:", error);
      res.status(500).json({ message: "Erro ao processar requisição" });
    }
  });

  // Marcar mensagens como lidas
  app.post("/api/services/:id/messages/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se é o lojista dono do serviço ou o montador candidato
      let hasAccess = false;
      
      if (req.user?.userType === 'lojista') {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          // Verificar se o montador tem uma candidatura para esse serviço
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Não autorizado a acessar este chat" });
      }

      // Marcar todas as mensagens como lidas para este usuário
      await storage.markMessagesAsRead(serviceId, req.user.id);
      console.log(`Usuário ${req.user.id} marcou as mensagens do serviço ${serviceId} como lidas`);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
      res.status(500).json({ message: "Erro ao marcar mensagens como lidas" });
    }
  });
  
  // Enviar mensagem em um serviço
  app.post("/api/services/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);
      const { content } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Conteúdo da mensagem não pode ser vazio" });
      }

      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Verificar se é o lojista dono do serviço ou o montador candidato
      let hasAccess = false;
      
      if (req.user?.userType === 'lojista') {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          // Verificar se o montador tem uma candidatura para esse serviço
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: "Não autorizado a enviar mensagens neste chat" });
      }

      // Criar mensagem
      const messageData = {
        serviceId,
        senderId: req.user.id,
        content,
        sentAt: new Date()
      };

      const newMessage = await storage.createMessage(messageData);
      
      // Enviar notificação imediata via WebSocket para o destinatário
      try {
        // Determinar quem deve receber a notificação
        if (req.user?.userType === 'montador') {
          // Se é montador enviando, notificar o lojista
          const storeResult = await db.select().from(stores).where(eq(stores.id, service.storeId));
          if (storeResult.length > 0) {
            const storeUserId = storeResult[0].userId;
            
            const notificationSent = sendNotification(storeUserId, {
              type: 'new_message',
              serviceId: serviceId,
              message: `Nova mensagem de ${req.user.name} no serviço "${service.title}"`,
              senderName: req.user.name,
              senderType: req.user.userType,
              timestamp: new Date().toISOString()
            });
            
            console.log(`Notificação de nova mensagem enviada para lojista (userId: ${storeUserId}): ${notificationSent ? 'sucesso' : 'falhou'}`);
          }
        } else if (req.user?.userType === 'lojista') {
          // Se é lojista enviando, notificar o(s) montador(es) relacionado(s)
          const acceptedApplications = await db
            .select()
            .from(applications)
            .where(and(
              eq(applications.serviceId, serviceId),
              eq(applications.status, 'accepted')
            ));
          
          for (const app of acceptedApplications) {
            const assemblerDataResult = await db
              .select()
              .from(assemblers)
              .where(eq(assemblers.id, app.assemblerId));
            
            if (assemblerDataResult.length > 0) {
              const assemblerUserId = assemblerDataResult[0].userId;
              
              const notificationSent = sendNotification(assemblerUserId, {
                type: 'new_message',
                serviceId: serviceId,
                message: `Nova mensagem de ${req.user.name} no serviço "${service.title}"`,
                senderName: req.user.name,
                senderType: req.user.userType,
                timestamp: new Date().toISOString()
              });
              
              console.log(`Notificação de nova mensagem enviada para montador (userId: ${assemblerUserId}): ${notificationSent ? 'sucesso' : 'falhou'}`);
            }
          }
        }
      } catch (notificationError) {
        console.error('Erro ao enviar notificação de nova mensagem:', notificationError);
      }
      
      // Notificar usuário sobre a nova mensagem (função global)
      if (global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user.id);
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Armazenar conexões dos clientes
  const clients = new Map<number, WebSocket>();
  
  // Função para enviar notificação via WebSocket
  function sendNotification(userId: number, message: any): boolean {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        console.log(`Notificação enviada para usuário ${userId}:`, message);
        return true;
      } catch (error) {
        console.error(`Erro ao enviar notificação para usuário ${userId}:`, error);
        return false;
      }
    } else {
      console.log(`Usuário ${userId} não está conectado ou WebSocket não está aberto`);
      return false;
    }
  }
  
  wss.on('connection', (ws, request) => {
    console.log('Nova conexão WebSocket');
    
    // Autenticar o cliente
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.log('Conexão rejeitada: userId não fornecido');
      ws.close();
      return;
    }
    
    const userIdNum = parseInt(userId);
    
    // Armazenar a conexão
    clients.set(userIdNum, ws);
    console.log(`Cliente conectado: userId=${userIdNum}`);
    
    // Limpar quando desconectar
    ws.on('close', () => {
      console.log(`Cliente desconectado: userId=${userIdNum}`);
      clients.delete(userIdNum);
    });
    
    // Confirmar conexão
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Conectado com sucesso'
    }));
  });
  
  // (Antiga segunda função removida)
  
  // Função para enviar notificação para o lojista quando um montador se candidatar
  global.notifyStore = async (serviceId: number, montadorId: number, mensagem: string) => {
    try {
      console.log(`[notifyStore] Iniciando envio de notificação: serviço ${serviceId}, montador ${montadorId}`);
      
      // Obter o serviço
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.error(`[notifyStore] Serviço ${serviceId} não encontrado`);
        return;
      }
      
      console.log(`[notifyStore] Serviço encontrado: "${service.title}", storeId: ${service.storeId}`);
      
      // Obter a loja
      const storeResult = await db.select().from(stores).where(eq(stores.id, service.storeId));
      if (!storeResult.length) {
        console.error(`[notifyStore] Loja com ID ${service.storeId} não encontrada`);
        return;
      }
      
      // Obter o userId do lojista
      const storeUserId = storeResult[0].userId;
      console.log(`[notifyStore] UserId do lojista encontrado: ${storeUserId}`);
      
      // Obter o montador para exibir o nome
      const montador = await storage.getUser(montadorId);
      const montadorNome = montador ? montador.name : 'Um montador';
      
      // Montar a mensagem
      const notificationMessage = mensagem || `${montadorNome} se candidatou ao serviço "${service.title}"`;
      
      // Verificar se o cliente WebSocket do lojista está conectado
      console.log(`[notifyStore] Verificando se lojista (userId: ${storeUserId}) está conectado...`);
      const isConnected = clients.has(storeUserId);
      console.log(`[notifyStore] Lojista ${storeUserId} está ${isConnected ? 'conectado' : 'desconectado'}`);
      
      // Enviar notificação
      const notificationData = {
        type: 'new_application',
        serviceId,
        message: notificationMessage,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[notifyStore] Enviando notificação:`, notificationData);
      const sent = sendNotification(storeUserId, notificationData);
      
      console.log(`[notifyStore] Notificação ${sent ? 'enviada com sucesso' : 'não foi entregue'}`);
    } catch (error) {
      console.error('[notifyStore] Erro ao enviar notificação para loja:', error);
    }
  };
  
  // Função para enviar notificação de nova mensagem
  global.notifyNewMessage = async (serviceId: number, senderId: number) => {
    try {
      console.log(`[notifyNewMessage] Iniciando envio de notificação: serviço ${serviceId}, remetente ${senderId}`);
      
      // Obter o serviço
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.error(`[notifyNewMessage] Serviço ${serviceId} não encontrado`);
        return;
      }
      
      // Obter o remetente
      const sender = await storage.getUser(senderId);
      if (!sender) {
        console.error(`[notifyNewMessage] Usuário remetente ${senderId} não encontrado`);
        return;
      }
      
      console.log(`[notifyNewMessage] Remetente: ${sender.name} (${sender.userType})`);
      
      // Obter a loja
      const storeResult = await db.select().from(stores).where(eq(stores.id, service.storeId));
      if (!storeResult.length) {
        console.error(`[notifyNewMessage] Loja do serviço (storeId: ${service.storeId}) não encontrada`);
        return;
      }
      
      const storeUserId = storeResult[0].userId;
      console.log(`[notifyNewMessage] UserId do lojista: ${storeUserId}`);
      
      // Obter as candidaturas aceitas para este serviço
      const acceptedApplications = await db.select()
        .from(applications)
        .where(and(
          eq(applications.serviceId, serviceId),
          eq(applications.status, 'accepted')
        ));
      
      console.log(`[notifyNewMessage] Encontradas ${acceptedApplications.length} candidaturas aceitas para o serviço`);
      
      if (acceptedApplications.length === 0) {
        console.log(`[notifyNewMessage] Nenhuma candidatura aceita para o serviço ${serviceId}, não notificando`);
        return;
      }
      
      // Montador relacionado ao serviço
      let assemblerUserId = null;
      
      for (const app of acceptedApplications) {
        const assemblerDataResult = await db
          .select()
          .from(assemblers)
          .where(eq(assemblers.id, app.assemblerId));
        
        if (assemblerDataResult.length > 0) {
          assemblerUserId = assemblerDataResult[0].userId;
          console.log(`[notifyNewMessage] UserId do montador: ${assemblerUserId}`);
          break;
        }
      }
      
      if (!assemblerUserId) {
        console.error(`[notifyNewMessage] Não foi possível encontrar o montador relacionado`);
        return;
      }
      
      // Determinar para quem enviar a notificação
      if (sender.userType === 'lojista') {
        // Notificar o montador
        console.log(`[notifyNewMessage] Enviando notificação para o montador (userId: ${assemblerUserId})`);
        
        const notificationSent = sendNotification(assemblerUserId, {
          type: 'new_message',
          serviceId,
          message: `Nova mensagem da loja no serviço "${service.title}"`,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[notifyNewMessage] Notificação para montador ${notificationSent ? 'enviada' : 'falhou'}`);
      } else if (sender.userType === 'montador') {
        // Notificar o lojista
        console.log(`[notifyNewMessage] Enviando notificação para o lojista (userId: ${storeUserId})`);
        
        const notificationSent = sendNotification(storeUserId, {
          type: 'new_message',
          serviceId,
          message: `Nova mensagem do montador ${sender.name} no serviço "${service.title}"`,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[notifyNewMessage] Notificação para lojista ${notificationSent ? 'enviada' : 'falhou'}`);
      }
    } catch (error) {
      console.error('[notifyNewMessage] Erro ao enviar notificação de nova mensagem:', error);
    }
  };
  
  // Obter avaliações de um serviço
  app.get("/api/services/:id/ratings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const serviceId = Number(req.params.id);
      const ratings = await storage.getRatingsByServiceId(serviceId);
      
      // Obter informações do usuário que avaliou e do usuário avaliado
      const enhancedRatings = await Promise.all(ratings.map(async (rating) => {
        const fromUser = await storage.getUser(rating.fromUserId);
        const toUser = await storage.getUser(rating.toUserId);
        
        return {
          ...rating,
          fromUser: fromUser ? {
            name: fromUser.name,
            userType: fromUser.userType
          } : undefined,
          toUser: toUser ? {
            name: toUser.name,
            userType: toUser.userType
          } : undefined
        };
      }));
      
      res.json(enhancedRatings);
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      res.status(500).json({ message: "Erro ao buscar avaliações" });
    }
  });
  
  // Atualizar detalhes do serviço
  app.patch("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { id } = req.params;
      const serviceId = parseInt(id);
      const { 
        title, 
        description, 
        price, 
        date, 
        status, 
        materialType 
      } = req.body;
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se é o lojista dono do serviço
      const store = await storage.getStoreByUserId(req.user!.id);
      if (req.user?.userType !== 'lojista' || !store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a modificar este serviço" });
      }
      
      // Verificar se o serviço está em aberto
      if (service.status !== 'open') {
        return res.status(400).json({ 
          message: "Apenas serviços com status 'Em Aberto' podem ser editados" 
        });
      }
      
      // Preparar dados para atualização
      const updateData: Partial<Service> = {};
      
      if (title !== undefined) {
        updateData.title = title;
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (price !== undefined) {
        updateData.price = price.toString();
      }
      
      if (date !== undefined) {
        updateData.date = date;
      }
      
      if (materialType !== undefined) {
        updateData.materialType = materialType;
      }
      
      if (status !== undefined) {
        // Validar status
        if (!['open', 'in-progress', 'completed', 'cancelled'].includes(status)) {
          return res.status(400).json({ message: "Status inválido" });
        }
        updateData.status = status;
      }
      
      // Se não houver dados para atualizar, retornar erro
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      // Atualizar serviço
      const updatedService = await storage.updateService(serviceId, updateData);
      
      // Log para depuração
      console.log(`Serviço ${serviceId} atualizado por ${req.user.name} (${req.user.id}):`, updateData);
      
      // Notificar montador se serviço for iniciado (status = in-progress)
      if (status === 'in-progress') {
        // Buscar candidaturas aceitas para este serviço
        const applications = await storage.getApplicationsByServiceId(serviceId);
        
        for (const application of applications) {
          if (application.status === 'accepted') {
            // Buscar informações do montador
            const assembler = await storage.getAssemblerById(application.assemblerId);
            if (assembler && assembler.userId) {
              // Notificar montador que o serviço foi iniciado
              sendNotification(assembler.userId, {
                type: 'service_update',
                serviceId,
                message: `O serviço "${service.title}" foi atualizado e está em andamento`,
                timestamp: new Date().toISOString()
              });
              
              console.log(`Notificação enviada para o montador ID ${assembler.userId}`);
            }
          }
        }
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      res.status(500).json({ message: "Erro ao atualizar serviço" });
    }
  });

  // Atualizar serviço com arquivos (upload de PDFs e exclusão de arquivos existentes)
  app.post("/api/services/:id/update-with-files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const { id } = req.params;
      const serviceId = parseInt(id);
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se é o lojista dono do serviço
      const store = await storage.getStoreByUserId(req.user!.id);
      if (req.user?.userType !== 'lojista' || !store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a modificar este serviço" });
      }
      
      // Verificar se o serviço está em aberto
      if (service.status !== 'open') {
        return res.status(400).json({ 
          message: "Apenas serviços com status 'Em Aberto' podem ser editados" 
        });
      }
      
      // Preparar dados para atualização
      const updateData: Partial<Service> = {};
      
      // Extrair dados básicos do serviço
      const { title, description, date, price, materialType } = req.body;
      
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (date) updateData.date = date;
      if (price) updateData.price = price.toString();
      if (materialType) updateData.materialType = materialType;
      
      // Tratar exclusão de arquivos
      let filesToDelete: string[] = [];
      if (req.body.filesToDelete) {
        try {
          filesToDelete = JSON.parse(req.body.filesToDelete);
        } catch (e) {
          console.error("Erro ao processar lista de arquivos para exclusão:", e);
        }
      }
      
      // Arquivos existentes que não serão excluídos
      let currentProjectFiles = Array.isArray(service.projectFiles) 
        ? service.projectFiles.filter((file: any) => !filesToDelete.includes(file.path))
        : [];
      
      // Processar novos arquivos enviados
      const uploadedFiles = [];
      
      if (req.files) {
        // Tratamento para arquivos únicos e múltiplos
        const files = req.files.files ? 
          (Array.isArray(req.files.files) ? req.files.files : [req.files.files]) : 
          [];
        
        for (const file of files) {
          // Verificar se é um PDF
          if (!file.mimetype.includes('pdf')) {
            return res.status(400).json({ 
              message: `O arquivo "${file.name}" não é um PDF válido` 
            });
          }
          
          // Verificar tamanho (máximo 10MB)
          if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ 
              message: `O arquivo "${file.name}" excede o tamanho máximo permitido de 10MB` 
            });
          }
          
          // Gerar nome de arquivo único com timestamp
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const fileName = `${timestamp}-${randomId}-${file.name}`;
          
          // Criar diretório se não existir
          const uploadDir = './uploads/projects';
          if (!fs.existsSync('./uploads')) {
            fs.mkdirSync('./uploads');
          }
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
          }
          
          // Caminho completo para o arquivo
          const uploadPath = `${uploadDir}/${fileName}`;
          
          // Mover arquivo para o diretório
          await file.mv(uploadPath);
          
          // Adicionar à lista de arquivos
          uploadedFiles.push({
            name: file.name,
            path: `/uploads/projects/${fileName}`
          });
        }
      }
      
      // Excluir arquivos físicos do sistema de arquivos
      for (const filePath of filesToDelete) {
        try {
          // Obter apenas o nome do arquivo do caminho
          const fileName = filePath.split('/').pop();
          if (fileName) {
            const fullPath = `./uploads/projects/${fileName}`;
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`Arquivo excluído: ${fullPath}`);
            }
          }
        } catch (e) {
          console.error(`Erro ao excluir arquivo ${filePath}:`, e);
          // Continuar mesmo se a exclusão de arquivo falhar
        }
      }
      
      // Combinar arquivos existentes com novos arquivos
      const allProjectFiles = [...currentProjectFiles, ...uploadedFiles];
      
      // Adicionar os arquivos ao objeto de atualização
      updateData.projectFiles = allProjectFiles;
      
      // Atualizar o serviço no banco de dados
      const updatedService = await storage.updateService(serviceId, updateData);
      
      // Log para depuração
      console.log(`Serviço ${serviceId} atualizado com arquivos por ${req.user.name} (${req.user.id}):`, {
        novosArquivos: uploadedFiles.length,
        arquivosExcluidos: filesToDelete.length,
        totalArquivos: allProjectFiles.length
      });
      
      res.status(200).json({
        ...updatedService,
        projectFiles: allProjectFiles
      });
    } catch (error) {
      console.error("Erro ao atualizar serviço com arquivos:", error);
      res.status(500).json({ message: "Erro ao atualizar serviço com arquivos" });
    }
  });

  // Rota para finalizar serviço
  app.post("/api/services/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const serviceId = Number(req.params.id);
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se o usuário é o lojista dono do serviço
      const userType = req.user!.userType;
      if (userType !== 'lojista') {
        return res.status(403).json({ message: "Apenas lojistas podem finalizar serviços" });
      }
      
      const store = await storage.getStoreByUserId(req.user!.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "Não autorizado a finalizar este serviço" });
      }
      
      // Verificar se o serviço está em andamento
      if (service.status !== 'in-progress') {
        return res.status(400).json({ message: "Só é possível finalizar serviços em andamento" });
      }
      
      // Atualizar status do serviço para 'completed'
      const updatedService = await storage.updateServiceStatus(serviceId, 'completed');
      
      // Buscar a candidatura aceita para enviar notificação ao montador
      const acceptedApplication = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.serviceId, serviceId),
            eq(applications.status, 'accepted')
          )
        ).limit(1);
      
      if (acceptedApplication.length > 0) {
        const assemblerId = acceptedApplication[0].assemblerId;
        const assembler = await storage.getAssemblerById(assemblerId);
        
        if (assembler) {
          // Preparar dados do serviço para enviar na notificação
          const assemblerUser = await storage.getUser(assembler.userId);
          
          if (assemblerUser && store) {
            const serviceInfo = {
              id: service.id,
              title: service.title,
              storeData: {
                id: store.id,
                userId: store.userId,
                name: req.user!.name
              },
              assemblerData: {
                id: assemblerId,
                userId: assembler.userId,
                name: assemblerUser.name
              }
            };
            
            // Notificar o lojista (usuário atual)
            sendNotification(Number(req.user!.id), {
              type: 'service_completed',
              serviceId,
              message: `O serviço "${service.title}" foi finalizado. Por favor, avalie o montador.`,
              serviceData: serviceInfo,
              timestamp: new Date().toISOString()
            });
            
            // Notificar o montador
            sendNotification(Number(assembler.userId), {
              type: 'service_completed',
              serviceId,
              message: `O serviço "${service.title}" foi finalizado. Por favor, avalie a loja.`,
              serviceData: serviceInfo,
              timestamp: new Date().toISOString()
            });
            
            console.log(`Notificações de avaliação enviadas para loja (${req.user!.id}) e montador (${assembler.userId})`);
          }
        }
      }
      
      res.json({ 
        message: "Serviço finalizado com sucesso. Agora você pode avaliá-lo.", 
        service: updatedService 
      });
    } catch (error) {
      console.error("Erro ao finalizar serviço:", error);
      res.status(500).json({ message: "Erro ao finalizar serviço" });
    }
  });
  
  // PIX Payment Authentication - Generate Canvi Session Token
  app.post("/api/payment/pix/token", async (req, res) => {
    try {
      console.log("[PIX Token] Iniciando autenticação com Canvi...");
      console.log("[PIX Token] Session ID:", req.sessionID);
      console.log("[PIX Token] User from session:", req.user);
      console.log("[PIX Token] isAuthenticated():", req.isAuthenticated());
      
      if (!req.isAuthenticated()) {
        console.log("[PIX Token] Usuário não autenticado");
        return res.status(401).json({ message: "Não autenticado" });
      }

      console.log("[PIX Token] Usuário autenticado:", req.user?.id);

      // Canvi API credentials
      const clientId = process.env.CANVI_CLIENT_ID || "FA854108C1FF62";
      const privateKey = process.env.CANVI_PRIVATE_KEY || "FBF62108C1FFA85410704AF6254F65C7F93AA106EBBFBF6210";
      
      console.log("[PIX Token] Autenticando com Canvi API...");
      
      // Authenticate with Canvi to get session token
      const authResponse = await axios.post('https://gateway-homol.service-canvi.com.br/bt/token', {
        client_id: clientId,
        private_key: privateKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("[PIX Token] Resposta da autenticação:", authResponse.status);
      console.log("[PIX Token] Dados recebidos:", authResponse.data);
      
      // Extract token from response (Canvi returns the token in the 'token' field)
      const sessionToken = authResponse.data.token;
      
      if (!sessionToken) {
        console.log("[PIX Token] ERRO: Token não recebido da API Canvi");
        console.log("[PIX Token] Resposta completa:", authResponse.data);
        return res.status(500).json({ 
          success: false, 
          message: "Falha na autenticação com gateway de pagamento" 
        });
      }
      
      console.log("[PIX Token] Sucesso - token obtido da Canvi");
      res.json({
        success: true,
        token: sessionToken
      });
    } catch (error) {
      console.error("[PIX Token] Erro ao autenticar com Canvi:", error);
      console.error("[PIX Token] Detalhes do erro:", error.response?.data);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao gerar token de autenticação PIX" 
      });
    }
  });

  // PIX Payment Creation
  app.post("/api/payment/pix/create", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId, amount, description, token } = req.body;

      if (!serviceId || !amount || !token) {
        return res.status(400).json({ message: "Dados obrigatórios não fornecidos" });
      }

      // Verify service exists and user has permission
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Get user information for PIX payment
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Generate unique reference for this payment
      const uniqueReference = `service_${serviceId}_${Date.now()}`;
      
      // Calculate expiration time (1 hour from now)
      const expirationDate = new Date(Date.now() + 60 * 60 * 1000);

      // Create PIX payment with Canvi gateway using exact format from your example
      // Convert amount to cents without decimal points (R$ 10.50 becomes 1050)
      const valorEmCentavos = Math.round(parseFloat(amount) * 100);
      
      const pixPaymentData = {
        valor: valorEmCentavos,
        vencimento: expirationDate.toISOString(),
        descricao: `Pagamento do serviço: ${service.title}`,
        tipo_transacao: "pixCashin",
        texto_instrucao: "Pagamento do serviço de montagem",
        identificador_externo: uniqueReference,
        identificador_movimento: uniqueReference,
        tag: [
          "amigo_montador",
          `service_${serviceId}`
        ],
        cliente: {
          nome: user.name,
          tipo_documento: "cpf",
          numero_documento: "744.674.080-96",
          "e-mail": user.email
        }
      };

      console.log("[PIX Create] Enviando dados para Canvi:", JSON.stringify(pixPaymentData, null, 2));

      const paymentResponse = await axios.post('https://gateway-homol.service-canvi.com.br/bt/pix', pixPaymentData, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${token}`
        }
      });

      console.log("[PIX Create] Resposta da Canvi:", JSON.stringify(paymentResponse.data, null, 2));
      console.log("[PIX Create] Status da resposta:", paymentResponse.status);

      // Store payment reference in service for tracking
      await storage.updateService(serviceId, {
        paymentReference: uniqueReference,
        paymentStatus: 'pending'
      });

      // Extract data from Canvi API response structure
      const responseData = paymentResponse.data.data || paymentResponse.data;
      const qrCodeData = responseData.qrcode || responseData.qr_code || responseData.qr_code_base64;
      const pixCodeData = responseData.brcode || responseData.pix_copia_e_cola || responseData.codigo_pix;
      
      console.log("[PIX Create] QR Code encontrado:", !!qrCodeData);
      console.log("[PIX Create] PIX Code encontrado:", !!pixCodeData);
      console.log("[PIX Create] Response data structure:", JSON.stringify(responseData, null, 2));

      res.json({
        success: true,
        pixCode: pixCodeData,
        qrCode: qrCodeData,
        reference: uniqueReference,
        amount: parseFloat(amount),
        expiresAt: expirationDate.toISOString(),
        paymentId: paymentResponse.data.id || paymentResponse.data.identificador
      });
    } catch (error) {
      console.error("Erro ao criar pagamento PIX:", error);
      console.error("Detalhes do erro:", error.response?.data);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao criar pagamento PIX",
        details: error.response?.data?.message || error.message
      });
    }
  });

  // PIX Payment Status Check
  app.post("/api/payment/pix/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { paymentId, token } = req.body;

      if (!paymentId || !token) {
        return res.status(400).json({ message: "ID do pagamento e token são obrigatórios" });
      }

      // Check payment status with Canvi gateway
      const statusResponse = await axios.get(`https://gateway-homol.service-canvi.com.br/bt/pix/${paymentId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${token}`
        }
      });

      const paymentStatus = statusResponse.data.status || statusResponse.data.situacao;
      const isCompleted = paymentStatus === 'CONCLUIDO' || paymentStatus === 'PAGO' || paymentStatus === 'CONFIRMADO';

      res.json({
        success: true,
        status: paymentStatus,
        isCompleted,
        paymentData: statusResponse.data
      });
    } catch (error) {
      console.error("Erro ao verificar status do pagamento PIX:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao verificar status do pagamento",
        details: error.response?.data?.message || error.message
      });
    }
  });

  // PIX Payment Confirmation via Chat
  app.post("/api/payment/pix/confirm", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId, paymentProof, paymentReference } = req.body;

      if (!serviceId || !paymentProof) {
        return res.status(400).json({ message: "Comprovante de pagamento é obrigatório" });
      }

      // Verify service exists
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      // Generate payment proof image URL
      const proofImageUrl = await generatePaymentProofImage({
        serviceId,
        amount: service.price || '0',
        reference: paymentReference,
        payerName: req.user!.name,
        timestamp: new Date().toLocaleString('pt-BR'),
        paymentProof
      });

      // Create a message in chat with payment confirmation as image
      const paymentMessage = await storage.createMessage({
        serviceId: serviceId,
        senderId: req.user!.id,
        content: proofImageUrl, // URL da imagem do comprovante
        messageType: 'payment_proof'
      });

      // Update service payment status
      await storage.updateService(serviceId, {
        paymentStatus: 'proof_submitted',
        paymentProof: paymentProof
      });

      // Notify the other party about payment proof submission
      const userType = req.user!.userType;
      let targetUserId = null;

      if (userType === 'lojista') {
        // Find the assembler working on this service
        const applications = await db
          .select({ assemblerId: applications.assemblerId })
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, serviceId),
              eq(applications.status, 'accepted')
            )
          )
          .limit(1);

        if (applications.length > 0) {
          const assemblerData = await storage.getAssemblerById(applications[0].assemblerId);
          if (assemblerData) {
            targetUserId = assemblerData.userId;
          }
        }
      } else if (userType === 'montador') {
        // Notify the store owner
        const store = await storage.getStore(service.storeId);
        if (store) {
          targetUserId = store.userId;
        }
      }

      // Send WebSocket notification if target user is found
      if (targetUserId && global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user!.id);
      }

      res.json({
        success: true,
        message: "Comprovante de pagamento enviado com sucesso",
        chatMessage: paymentMessage
      });
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao processar confirmação de pagamento" 
      });
    }
  });

  // PIX Payment Verification/Approval by Receiver
  app.post("/api/payment/pix/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const { serviceId, approved } = req.body;

      if (!serviceId || typeof approved !== 'boolean') {
        return res.status(400).json({ message: "Dados inválidos para aprovação" });
      }

      // Verify service exists
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      const approvalStatus = approved ? 'confirmed' : 'rejected';
      const statusMessage = approved ? 'confirmado' : 'rejeitado';

      // Update service payment status
      await storage.updateService(serviceId, {
        paymentStatus: approvalStatus
      });

      // Create confirmation message in chat
      const confirmationMessage = await storage.createMessage({
        serviceId: serviceId,
        senderId: req.user!.id,
        content: `💰 PAGAMENTO ${statusMessage.toUpperCase()}\n\n${approved ? '✅' : '❌'} O comprovante de pagamento foi ${statusMessage}.\n\n${approved ? 'O serviço pode prosseguir normalmente.' : 'Entre em contato para resolver a situação do pagamento.'}`,
        messageType: 'payment_confirmation'
      });

      // Notify the other party
      if (global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user!.id);
      }

      res.json({
        success: true,
        message: `Pagamento ${statusMessage} com sucesso`,
        chatMessage: confirmationMessage,
        paymentStatus: approvalStatus
      });
    } catch (error) {
      console.error("Erro ao aprovar pagamento:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao processar aprovação de pagamento" 
      });
    }
  });

  // Criar avaliação para um serviço
  app.post("/api/services/:id/rate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const serviceId = Number(req.params.id);
      const { rating, comment } = req.body;
      
      if (!rating) {
        return res.status(400).json({ message: "Avaliação é obrigatória" });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5" });
      }
      
      // Verificar se o serviço existe
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      // Verificar se o serviço está com status 'completed'
      if (service.status !== 'completed') {
        return res.status(400).json({ message: "Só é possível avaliar serviços concluídos" });
      }
      
      // Verificar se o usuário que está avaliando está autorizado e determinar quem será avaliado
      const fromUserId = req.user!.id;
      const userType = req.user!.userType;
      let toUserId: number;
      let isAuthorized = false;
      
      if (userType === 'lojista') {
        // Lojista avaliando montador
        const store = await storage.getStoreByUserId(fromUserId);
        if (store && store.id === service.storeId) {
          isAuthorized = true;
          // Buscar o montador que trabalhou no serviço
          const acceptedApplications = await db
            .select({ assemblerId: applications.assemblerId })
            .from(applications)
            .where(
              and(
                eq(applications.serviceId, serviceId),
                eq(applications.status, 'accepted')
              )
            )
            .limit(1);
          
          if (acceptedApplications.length > 0) {
            const assembler = await storage.getAssemblerById(acceptedApplications[0].assemblerId);
            if (assembler) {
              toUserId = assembler.userId;
            } else {
              return res.status(400).json({ message: "Montador não encontrado para este serviço" });
            }
          } else {
            return res.status(400).json({ message: "Montador não encontrado para este serviço" });
          }
        }
      } else if (userType === 'montador') {
        // Montador avaliando lojista
        const assembler = await storage.getAssemblerByUserId(fromUserId);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application && application.status === 'accepted') {
            isAuthorized = true;
            // Buscar o lojista dono do serviço
            const store = await storage.getStore(service.storeId);
            if (store) {
              toUserId = store.userId;
            } else {
              return res.status(400).json({ message: "Loja não encontrada para este serviço" });
            }
          }
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Você não está autorizado a avaliar este serviço" });
      }
      
      // Verificar se já existe uma avaliação deste usuário para este serviço
      const existingRating = await storage.getRatingByServiceIdAndUser(serviceId, fromUserId, toUserId!);
      if (existingRating) {
        return res.status(400).json({ message: "Você já avaliou este usuário para este serviço" });
      }
      
      // Criar a avaliação
      const newRating = await storage.createRating({
        serviceId,
        fromUserId,
        toUserId: toUserId!,
        rating,
        comment
      });
      
      // Notificar o usuário avaliado via WebSocket
      sendNotification(toUserId!, {
        type: 'new_rating',
        message: `Você recebeu uma nova avaliação para o serviço ${service.title}`,
        serviceId,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json(newRating);
    } catch (error) {
      console.error("Erro ao criar avaliação:", error);
      res.status(500).json({ message: "Erro ao criar avaliação" });
    }
  });
  
  // Rotas para gerenciamento de informações bancárias
  
  // Obter contas bancárias do usuário logado
  app.get("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const bankAccounts = await storage.getBankAccountsByUserId(req.user.id);
      res.json(bankAccounts);
    } catch (error) {
      console.error("Erro ao buscar contas bancárias:", error);
      res.status(500).json({ message: "Erro ao buscar contas bancárias" });
    }
  });
  
  // Obter uma conta bancária específica
  app.get("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta bancária inválido" });
      }

      const bankAccount = await storage.getBankAccountById(bankAccountId);
      
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }
      
      // Verificar se a conta bancária pertence ao usuário logado
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar esta conta bancária" });
      }
      
      res.json(bankAccount);
    } catch (error) {
      console.error("Erro ao buscar conta bancária:", error);
      res.status(500).json({ message: "Erro ao buscar conta bancária" });
    }
  });
  
  // Criar uma nova conta bancária
  app.post("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const bankAccountData: InsertBankAccount = {
        userId: req.user.id,
        bankName: req.body.bankName,
        accountType: req.body.accountType,
        accountNumber: req.body.accountNumber,
        agency: req.body.agency,
        holderName: req.body.holderName,
        holderDocumentType: req.body.holderDocumentType,
        holderDocumentNumber: req.body.holderDocumentNumber,
        pixKey: req.body.pixKey,
        pixKeyType: req.body.pixKeyType
      };
      
      const newBankAccount = await storage.createBankAccount(bankAccountData);
      res.status(201).json(newBankAccount);
    } catch (error) {
      console.error("Erro ao criar conta bancária:", error);
      res.status(500).json({ message: "Erro ao criar conta bancária" });
    }
  });
  
  // Atualizar uma conta bancária existente
  app.patch("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta bancária inválido" });
      }

      const bankAccount = await storage.getBankAccountById(bankAccountId);
      
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }
      
      // Verificar se a conta bancária pertence ao usuário logado
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Você não tem permissão para atualizar esta conta bancária" });
      }
      
      // Campos que podem ser atualizados
      const allowedFields = [
        'bankName',
        'accountType',
        'accountNumber',
        'agency',
        'holderName',
        'holderDocumentType',
        'holderDocumentNumber',
        'pixKey',
        'pixKeyType'
      ];
      
      const updateData: Partial<BankAccount> = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field as keyof BankAccount] = req.body[field];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo válido para atualização" });
      }
      
      const updatedBankAccount = await storage.updateBankAccount(bankAccountId, updateData);
      res.json(updatedBankAccount);
    } catch (error) {
      console.error("Erro ao atualizar conta bancária:", error);
      res.status(500).json({ message: "Erro ao atualizar conta bancária" });
    }
  });
  
  // Excluir uma conta bancária
  app.delete("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta bancária inválido" });
      }

      const bankAccount = await storage.getBankAccountById(bankAccountId);
      
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta bancária não encontrada" });
      }
      
      // Verificar se a conta bancária pertence ao usuário logado
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir esta conta bancária" });
      }
      
      await storage.deleteBankAccount(bankAccountId);
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir conta bancária:", error);
      res.status(500).json({ message: "Erro ao excluir conta bancária" });
    }
  });
  
  return httpServer;
}
