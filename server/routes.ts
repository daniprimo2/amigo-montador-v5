import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { eq, and, not, isNotNull } from "drizzle-orm";
import { services, applications, stores, assemblers, messages, users, ratings, bankAccounts, type User, type Store, type Assembler, type Service, type Message, type Rating, type InsertRating, type BankAccount, type InsertBankAccount } from "@shared/schema";
import { WebSocketServer, WebSocket } from 'ws';

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
      
      res.json(servicesList);
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
          date: services.date,
          price: services.price,
          status: services.status,
          storeId: services.storeId
        })
        .from(services);
        
      // Filtrar para incluir apenas os serviços que estão na lista de IDs
      const filteredServices = servicesResult.filter(service => allServiceIds.includes(service.id));
      
      console.log(`Encontrados ${filteredServices.length} serviços ativos para o montador`);

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
        
        // Verificar se existem novas mensagens para este serviço (mensagens da loja que o montador não enviou)
        
        // Buscar mensagens recentes da loja (não enviadas pelo montador)
        const newMessagesResult = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.serviceId, service.id),
              not(eq(messages.senderId, req.user.id))
            )
          )
          .limit(10);
          
        // Verificar se existem mensagens que não são do montador atual
        const hasNewMessages = newMessagesResult.length > 0;
        
        return {
          ...service,
          store: storeResult.length > 0 ? storeResult[0] : null,
          applicationStatus: application ? application.status : null,
          hasMessages: true, // Sempre mostra indicador para testes
          hasNewMessages: hasNewMessages
        };
      }));

      res.json(enhancedServices);
    } catch (error) {
      console.error("Erro ao buscar serviços ativos:", error);
      res.status(500).json({ message: "Erro ao buscar serviços ativos" });
    }
  });
  
  // Obter serviços com candidaturas aceitas para a loja
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

      // Buscar todos os serviços da loja com status 'in-progress' (são os que têm candidaturas aceitas)
      const storeServices = await db
        .select({
          id: services.id,
          title: services.title,
          description: services.description,
          location: services.location,
          date: services.date,
          price: services.price,
          status: services.status,
          storeId: services.storeId
        })
        .from(services)
        .where(
          and(
            eq(services.storeId, store.id),
            eq(services.status, 'in-progress')
          )
        );

      // Para cada serviço, obter a candidatura aceita
      const servicesWithApplication = await Promise.all(storeServices.map(async (service) => {
        // Buscar a candidatura aceita para este serviço
        const acceptedApplications = await db
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.serviceId, service.id),
              eq(applications.status, 'accepted')
            )
          );

        // Se houver uma candidatura aceita, obter detalhes do montador
        if (acceptedApplications.length > 0) {
          const assemblerId = acceptedApplications[0].assemblerId;
          
          // Buscar dados do montador
          const assembler = await storage.getAssemblerById(assemblerId);
            
          if (assembler) {
            const assemblerUserId = assembler.userId;
            
            // Buscar dados do usuário montador
            const userResult = await db
              .select({
                id: users.id,
                name: users.name
              })
              .from(users)
              .where(eq(users.id, assemblerUserId))
              .limit(1);
              
            if (userResult.length > 0) {
              return {
                ...service,
                assembler: {
                  id: assemblerId,
                  name: userResult[0].name,
                  userId: assemblerUserId
                }
              };
            }
          }
        }
        
        // Se não houver candidatura aceita ou não encontrar o montador, retornar apenas o serviço
        return service;
      }));

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

      // Criar serviço
      const serviceData = {
        ...req.body,
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
        date: "Data do Serviço",
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
                        column === 'date' ? 'Data do Serviço' :
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

      // Atualizar status para 'completed'
      const updatedService = await storage.updateServiceStatus(serviceId, 'completed');
      
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
          // Notificar a loja e o montador sobre a finalização
          const notifyMessage = "Serviço finalizado com sucesso! Pagamento confirmado.";
          
          if (global.notifyStore) {
            await global.notifyStore(serviceId, assemblerApp[0].assemblerId, notifyMessage);
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
      }

      res.json({ message: "Candidatura aceita com sucesso" });
    } catch (error) {
      console.error("Erro ao aceitar candidatura:", error);
      res.status(500).json({ message: "Erro ao aceitar candidatura" });
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

      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(id);
        profileData = { ...req.user, store };
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(id);
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
      
      // Adicionar dados específicos com base no tipo de usuário
      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(userId);
        if (store) {
          profileData.store = store;
        }
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(userId);
        if (assembler) {
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

      // Obter mensagens
      const messages = await storage.getMessagesByServiceId(serviceId);
      res.json(messages);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
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

      // Em uma implementação completa, aqui marcaríamos as mensagens como lidas em uma tabela separada
      // Para a demonstração, apenas logamos a ação e retornamos sucesso
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
      
      // Notificar usuário sobre a nova mensagem
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
          // Notificar o montador via WebSocket
          sendNotification(assembler.userId, {
            type: 'service_completed',
            serviceId,
            message: `O serviço "${service.title}" foi finalizado. Aguardando avaliação.`,
            timestamp: new Date().toISOString()
          });
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
  
  // Criar avaliação para um serviço
  app.post("/api/services/:id/rate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const serviceId = Number(req.params.id);
      const { toUserId, rating, comment } = req.body;
      
      if (!toUserId || !rating) {
        return res.status(400).json({ message: "Dados incompletos para avaliação" });
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
      
      // Verificar se o usuário que está avaliando está autorizado
      // (ou é o montador ou é a loja do serviço)
      const fromUserId = req.user!.id;
      const userType = req.user!.userType;
      
      let isAuthorized = false;
      if (userType === 'lojista') {
        const store = await storage.getStoreByUserId(fromUserId);
        if (store && store.id === service.storeId) {
          isAuthorized = true;
        }
      } else if (userType === 'montador') {
        const assembler = await storage.getAssemblerByUserId(fromUserId);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application && application.status === 'accepted') {
            isAuthorized = true;
          }
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Você não está autorizado a avaliar este serviço" });
      }
      
      // Verificar se já existe uma avaliação deste usuário para este serviço
      const existingRating = await storage.getRatingByServiceIdAndUser(serviceId, fromUserId, toUserId);
      if (existingRating) {
        return res.status(400).json({ message: "Você já avaliou este usuário para este serviço" });
      }
      
      // Criar a avaliação
      const newRating = await storage.createRating({
        serviceId,
        fromUserId,
        toUserId,
        rating,
        comment
      });
      
      // Notificar o usuário avaliado via WebSocket
      sendNotification(toUserId, {
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
