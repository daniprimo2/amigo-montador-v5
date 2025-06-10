import { users, type User, type InsertUser, stores, type Store, type InsertStore, assemblers, type Assembler, type InsertAssembler, services, type Service, type InsertService, applications, type Application, type InsertApplication, messages, type Message, type InsertMessage, messageReads, type MessageRead, type InsertMessageRead, ratings, type Rating, type InsertRating, bankAccounts, type BankAccount, type InsertBankAccount } from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, not, desc, asc, or, gt, lt, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Lojas
  getStoreByUserId(userId: number): Promise<Store | undefined>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, storeData: Partial<Store>): Promise<Store>;
  
  // Montadores
  getAssemblerByUserId(userId: number): Promise<Assembler | undefined>;
  getAssemblerById(id: number): Promise<Assembler | undefined>;
  createAssembler(assembler: InsertAssembler): Promise<Assembler>;
  updateAssembler(id: number, assemblerData: Partial<Assembler>): Promise<Assembler>;
  
  // Serviços
  getServiceById(id: number): Promise<Service | undefined>;
  getServicesByStoreId(storeId: number, status?: string): Promise<Service[]>;
  getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateServiceStatus(id: number, status: string): Promise<Service>;
  updateService(id: number, serviceData: Partial<Service>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  
  // Candidaturas
  getApplicationById(id: number): Promise<Application | undefined>;
  getApplicationByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Application | undefined>;
  getApplicationsByServiceId(serviceId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  acceptApplication(id: number, serviceId: number): Promise<void>;
  
  // Mensagens
  getMessagesByServiceId(serviceId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(serviceId: number, userId: number): Promise<void>;
  getUnreadMessageCountForService(serviceId: number, userId: number): Promise<number>;
  hasUnreadMessages(serviceId: number, userId: number): Promise<boolean>;
  getTotalUnreadMessageCount(userId: number): Promise<number>;
  
  // Avaliações
  getRatingByServiceIdAndUser(serviceId: number, fromUserId: number, toUserId: number): Promise<Rating | undefined>;
  getRatingsByServiceId(serviceId: number): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  
  // Informações bancárias
  getBankAccountsByUserId(userId: number): Promise<BankAccount[]>;
  getBankAccountById(id: number): Promise<BankAccount | undefined>;
  createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, bankAccountData: Partial<BankAccount>): Promise<BankAccount>;
  deleteBankAccount(id: number): Promise<void>;
  
  // Sessão
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }
  
  // Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  // Lojas
  async getStoreByUserId(userId: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.userId, userId));
    return store;
  }
  
  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db
      .insert(stores)
      .values(storeData)
      .returning();
    return store;
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store> {
    const [updatedStore] = await db
      .update(stores)
      .set(storeData)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }
  
  // Montadores
  async getAssemblerByUserId(userId: number): Promise<Assembler | undefined> {
    const [assembler] = await db.select().from(assemblers).where(eq(assemblers.userId, userId));
    return assembler;
  }
  
  async getAssemblerById(id: number): Promise<Assembler | undefined> {
    const [assembler] = await db.select().from(assemblers).where(eq(assemblers.id, id));
    return assembler;
  }

  async createAssembler(assemblerData: InsertAssembler): Promise<Assembler> {
    const [assembler] = await db
      .insert(assemblers)
      .values(assemblerData)
      .returning();
    return assembler;
  }

  async updateAssembler(id: number, assemblerData: Partial<Assembler>): Promise<Assembler> {
    const [updatedAssembler] = await db
      .update(assemblers)
      .set(assemblerData)
      .where(eq(assemblers.id, id))
      .returning();
    return updatedAssembler;
  }
  
  // Serviços
  async getServiceById(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServicesByStoreId(storeId: number, status?: string): Promise<Service[]> {
    let query = db.select().from(services).where(eq(services.storeId, storeId));
    
    if (status) {
      // Aplicar filtro de status apenas se for fornecido
      query = db.select()
        .from(services)
        .where(and(
          eq(services.storeId, storeId),
          eq(services.status, status)
        ));
    }
    
    const servicesList = await query.orderBy(desc(services.createdAt));
    
    // Para todos os serviços, verificar se há um montador associado
    const enhancedServices = await Promise.all(servicesList.map(async (service) => {
      // Buscar candidaturas aceitas para este serviço (independente do status)
      const acceptedApplications = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.serviceId, service.id),
            eq(applications.status, 'accepted')
          )
        );
      
      console.log(`[getServicesByStoreId] Serviço ID ${service.id} tem ${acceptedApplications.length} candidaturas aceitas`);
      
      // Se houver candidatura aceita, buscar dados do montador
      if (acceptedApplications.length > 0) {
        const assemblerId = acceptedApplications[0].assemblerId;
        console.log(`[getServicesByStoreId] Buscando montador ID ${assemblerId}`);
        
        const assembler = await this.getAssemblerById(assemblerId);
        
        if (assembler) {
          console.log(`[getServicesByStoreId] Montador encontrado, user_id: ${assembler.userId}`);
          
          // Buscar dados do usuário montador
          const userResult = await db
            .select({
              id: users.id,
              name: users.name,
              phone: users.phone,
              email: users.email,
              profilePhotoUrl: users.profilePhotoUrl
            })
            .from(users)
            .where(eq(users.id, assembler.userId))
            .limit(1);
          
          if (userResult.length > 0) {
            console.log(`[getServicesByStoreId] Nome do montador: ${userResult[0].name}`);
            
            return {
              ...service,
              assembler: {
                id: assemblerId,
                name: userResult[0].name,
                userId: assembler.userId,
                phone: userResult[0].phone,
                email: userResult[0].email,
                photoUrl: userResult[0].profilePhotoUrl,
                city: assembler.city,
                state: assembler.state,
                specialties: assembler.specialties,
                experience: assembler.experience,
                rating: assembler.rating
              }
            };
          }
        }
      }
      
      // Se não houver montador associado, retornar como está
      return service;
    }));
    
    return enhancedServices;
  }

  async getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]> {
    try {
      console.log(`[STORAGE] getAvailableServicesForAssembler chamado para montador ID ${assembler.id} - Raio: ${assembler.workRadius} km`);
      console.log(`[STORAGE] Dados completos do montador:`, JSON.stringify(assembler, null, 2));
      
      // Obter apenas serviços com status 'open' (disponíveis para candidatura)
      const servicesList = await db.select({
        services: {
          id: services.id,
          storeId: services.storeId,
          title: services.title,
          description: services.description,
          location: services.location,
          address: services.address,
          addressNumber: services.addressNumber,
          cep: services.cep,
          latitude: services.latitude,
          longitude: services.longitude,
          startDate: services.startDate,
          endDate: services.endDate,
          price: services.price,
          status: services.status,
          materialType: services.materialType,
          projectFiles: services.projectFiles,
          createdAt: services.createdAt,
          completedAt: services.completedAt
        },
        stores: {
          id: stores.id,
          name: stores.name
        }
      })
        .from(services)
        .leftJoin(stores, eq(services.storeId, stores.id))
        .where(eq(services.status, 'open'))
        .orderBy(desc(services.createdAt));
      
      // Log para depuração
      console.log(`Encontrados ${servicesList.length} serviços no total`);
      
      // Mapear resultados para incluir informações da loja e arquivos do projeto
      const enhancedServices = await Promise.all(servicesList.map(async result => {
        const { services: service, stores: store } = result;
        
        // Verificar se existem arquivos PDF do projeto (projectFiles)
        let projectFiles = null;
        
        if (service.projectFiles) {
          try {
            // Se projectFiles estiver armazenado como string JSON, fazer o parse
            if (typeof service.projectFiles === 'string') {
              projectFiles = JSON.parse(service.projectFiles);
            } else {
              // Se já for um objeto/array, usar diretamente
              projectFiles = service.projectFiles;
            }
          } catch (error) {
            console.error(`Erro ao processar projectFiles para serviço ${service.id}:`, error);
          }
        }
        
        const storeNameFromDb = store?.name || 'Loja não especificada';
        console.log(`[DEBUG Storage] Serviço ID ${service.id}: store.name = "${store?.name}", storeName = "${storeNameFromDb}"`);
        
        return {
          ...service,
          projectFiles,
          storeName: storeNameFromDb,
          // Garantir que todos os campos estejam disponíveis
          description: service.description || '',
          materialType: service.materialType || '',
          address: service.address || '',
          addressNumber: service.addressNumber || '',
          cep: service.cep || ''
        } as Service & { storeName: string };
      }));
      
      // Filtrar serviços por raio de atendimento do montador
      let filteredByDistance: (Service & { storeName: string })[] = [];
      
      console.log(`[FILTRO DEBUG] workRadius: ${assembler.workRadius}, tipo: ${typeof assembler.workRadius}`);
      
      if (assembler.workRadius && assembler.workRadius > 0) {
        console.log(`[FILTRO RAIO] Iniciando filtro: ${assembler.workRadius} km para montador ${assembler.id} em ${assembler.city}, ${assembler.state}`);
        console.log(`[FILTRO RAIO] Total de serviços antes do filtro: ${enhancedServices.length}`);
        
        // Importar função de cálculo de distância
        const { calculateDistance, geocodeFromCEP, getCityCoordinates } = await import('./geocoding');
        
        try {
          // Obter coordenadas do montador
          let assemblerCoords: { latitude: string; longitude: string } | null = null;
          
          if (assembler.cep) {
            try {
              assemblerCoords = await geocodeFromCEP(assembler.cep);
              console.log(`[FILTRO RAIO] Coordenadas do montador (CEP ${assembler.cep}):`, assemblerCoords);
            } catch (error) {
              console.error(`[FILTRO RAIO] Erro ao geocodificar CEP do montador ${assembler.cep}:`, error);
              // Fallback para coordenadas da cidade
              const cityCoords = getCityCoordinates(assembler.city, assembler.state);
              assemblerCoords = {
                latitude: cityCoords.lat.toString(),
                longitude: cityCoords.lng.toString()
              };
            }
          } else {
            // Usar coordenadas da cidade como fallback
            const cityCoords = getCityCoordinates(assembler.city, assembler.state);
            assemblerCoords = {
              latitude: cityCoords.lat.toString(),
              longitude: cityCoords.lng.toString()
            };
          }
          
          // Filtrar serviços dentro do raio
          for (const service of enhancedServices) {
            try {
              let serviceCoords: { latitude: string; longitude: string } | null = null;
              
              // Tentar obter coordenadas do serviço pelo CEP
              if (service.cep) {
                try {
                  serviceCoords = await geocodeFromCEP(service.cep);
                } catch (error) {
                  console.log(`Erro ao geocodificar CEP do serviço ${service.id} (${service.cep}), usando fallback`);
                }
              }
              
              // Se não conseguiu pelo CEP, usar coordenadas da cidade extraindo do location
              if (!serviceCoords && service.location) {
                try {
                  // Tentar extrair cidade e estado do formato "Endereço, Bairro, Número - Cidade, Estado - CEP: xxxxx"
                  let serviceCity = '';
                  let serviceState = '';
                  
                  // Padrão mais comum: "... - Cidade, Estado - CEP: ..."
                  const cityStateMatch = service.location.match(/([^-]+),\s*([A-Z]{2})\s*-\s*CEP/);
                  if (cityStateMatch) {
                    serviceCity = cityStateMatch[1].trim();
                    serviceState = cityStateMatch[2].trim();
                  } else {
                    // Fallback: tentar última parte antes do CEP
                    const parts = service.location.split('-');
                    if (parts.length >= 2) {
                      const lastPart = parts[parts.length - 2].trim();
                      const cityStateParts = lastPart.split(',');
                      if (cityStateParts.length >= 2) {
                        serviceCity = cityStateParts[0].trim();
                        serviceState = cityStateParts[1].trim();
                      }
                    }
                  }
                  
                  if (serviceCity && serviceState && serviceState.length === 2) {
                    console.log(`[FILTRO RAIO] Extraindo coordenadas para ${serviceCity}, ${serviceState}`);
                    const cityCoords = getCityCoordinates(serviceCity, serviceState);
                    serviceCoords = {
                      latitude: cityCoords.lat.toString(),
                      longitude: cityCoords.lng.toString()
                    };
                  } else {
                    console.log(`[FILTRO RAIO] Não foi possível extrair cidade/estado de: "${service.location}"`);
                  }
                } catch (error) {
                  console.error(`[FILTRO RAIO] Erro ao obter coordenadas da cidade para serviço ${service.id}:`, error);
                  continue; // Pular este serviço se não conseguir obter coordenadas
                }
              }
              
              // Calcular distância se temos ambas as coordenadas
              if (assemblerCoords && serviceCoords) {
                const distance = calculateDistance(
                  parseFloat(assemblerCoords.latitude),
                  parseFloat(assemblerCoords.longitude),
                  parseFloat(serviceCoords.latitude),
                  parseFloat(serviceCoords.longitude)
                );
                
                console.log(`[FILTRO RAIO] Serviço ${service.id}: distância ${distance.toFixed(1)} km (raio limite: ${assembler.workRadius} km)`);
                
                // Incluir apenas serviços dentro do raio de atendimento
                if (distance <= assembler.workRadius) {
                  filteredByDistance.push(service);
                  console.log(`[FILTRO RAIO] ✓ Serviço ${service.id} INCLUÍDO (${distance.toFixed(1)} km <= ${assembler.workRadius} km)`);
                } else {
                  console.log(`[FILTRO RAIO] ✗ Serviço ${service.id} EXCLUÍDO (${distance.toFixed(1)} km > ${assembler.workRadius} km)`);
                }
              } else {
                console.warn(`[FILTRO RAIO] ✗ Serviço ${service.id} EXCLUÍDO - não foi possível calcular distância (coordenadas não encontradas)`);
                // NÃO incluir serviços sem coordenadas válidas para manter a precisão do filtro
              }
            } catch (error) {
              console.error(`Erro ao processar serviço ${service.id}:`, error);
            }
          }
          
          console.log(`[FILTRO RAIO] RESULTADO FINAL: ${filteredByDistance.length} de ${enhancedServices.length} serviços dentro do raio de ${assembler.workRadius} km`);
          
          // Log dos serviços que passaram no filtro
          if (filteredByDistance.length > 0) {
            console.log(`[FILTRO RAIO] Serviços que passaram no filtro:`, filteredByDistance.map(s => `ID ${s.id} - ${s.title}`));
          } else {
            console.log(`[FILTRO RAIO] ATENÇÃO: Nenhum serviço passou no filtro de raio!`);
          }
          
        } catch (error) {
          console.error('[FILTRO RAIO] Erro ao filtrar por distância:', error);
          console.error('[FILTRO RAIO] Stack trace:', error);
          // Em caso de erro, aplicar filtro básico por estado para não mostrar serviços muito distantes
          filteredByDistance = enhancedServices.filter(service => {
            if (service.location && service.location.includes(assembler.state)) {
              return true;
            }
            return false;
          });
          console.log(`[FILTRO RAIO] ERRO: Aplicando filtro por estado ${assembler.state}, ${filteredByDistance.length} serviços restantes`);
        }
      } else {
        console.log(`[FILTRO RAIO] Montador sem raio de atendimento definido (workRadius: ${assembler.workRadius}), mostrando todos os serviços`);
        filteredByDistance = enhancedServices;
      }

      // Se o montador tiver especialidades definidas, podemos filtrar por elas
      if (assembler.specialties && Array.isArray(assembler.specialties) && assembler.specialties.length > 0) {
        const assemblerSpecialties = assembler.specialties as string[];
        console.log(`Filtrando por especialidades do montador: ${assemblerSpecialties.join(', ')}`);
        
        // Atualização: mostrar todos os serviços disponíveis para o montador, independente da especialidade
        // Isso permite que o montador veja mais oportunidades de trabalho
        console.log(`Retornando ${filteredByDistance.length} serviços disponíveis para o montador`);
        return filteredByDistance;
      }
      
      console.log(`Nenhuma especialidade definida para o montador, retornando ${filteredByDistance.length} serviços disponíveis`);
      // Se o montador não tiver especialidades definidas, retorna todos os serviços filtrados por distância
      return filteredByDistance;
    } catch (error) {
      console.error('Erro ao buscar serviços disponíveis para montador:', error);
      return []; // Retorna lista vazia em caso de erro
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    // Se não há coordenadas e há CEP, fazer geocodificação
    let finalServiceData = { ...serviceData };
    
    if ((!serviceData.latitude || !serviceData.longitude) && serviceData.cep) {
      try {
        const { geocodeFromCEP } = await import('./geocoding');
        const coordinates = await geocodeFromCEP(serviceData.cep);
        finalServiceData.latitude = coordinates.latitude;
        finalServiceData.longitude = coordinates.longitude;
      } catch (error) {
        console.error('Erro na geocodificação:', error);
        throw new Error('Não foi possível obter coordenadas para o CEP fornecido');
      }
    }

    const [service] = await db
      .insert(services)
      .values(finalServiceData)
      .returning();
    return service;
  }

  async updateServiceStatus(id: number, status: string): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set({ status })
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }
  
  async updateService(id: number, serviceData: Partial<Service>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }
  
  async deleteService(id: number): Promise<void> {
    // Verificar se o serviço existe
    const service = await this.getServiceById(id);
    if (!service) {
      throw new Error(`Serviço com ID ${id} não encontrado`);
    }
    
    // Se o serviço estiver em andamento ou concluído, não permitir exclusão
    if (service.status === 'in-progress' || service.status === 'completed') {
      throw new Error(`Não é possível excluir um serviço que está ${service.status === 'in-progress' ? 'em andamento' : 'concluído'}`);
    }
    
    try {
      // Excluir candidaturas associadas ao serviço
      const deleteApplicationsResult = await db
        .delete(applications)
        .where(eq(applications.serviceId, id));
      console.log(`Candidaturas excluídas para o serviço ${id}`);
      
      // Excluir mensagens associadas ao serviço
      const deleteMessagesResult = await db
        .delete(messages)
        .where(eq(messages.serviceId, id));
      console.log(`Mensagens excluídas para o serviço ${id}`);
      
      // Exclusão de avaliações relacionadas a este serviço, se houver
      const deleteRatingsResult = await db
        .delete(ratings)
        .where(eq(ratings.serviceId, id));
      console.log(`Avaliações excluídas para o serviço ${id}`);
        
      // Finalmente, excluir o serviço
      const deleteServiceResult = await db
        .delete(services)
        .where(eq(services.id, id));
        
      console.log(`Serviço ID ${id} excluído com sucesso junto com seus relacionamentos`);
    } catch (error) {
      console.error(`Erro ao excluir serviço ID ${id}:`, error);
      // Usando casting para acessar a propriedade message do erro
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Erro ao excluir serviço: ${errorMessage}`);
    }
  }
  
  // Candidaturas
  async getApplicationById(id: number): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }

  async getApplicationByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Application | undefined> {
    const [application] = await db.select()
      .from(applications)
      .where(
        and(
          eq(applications.serviceId, serviceId),
          eq(applications.assemblerId, assemblerId)
        )
      );
    return application;
  }

  async getApplicationsByServiceId(serviceId: number): Promise<Application[]> {
    return await db.select()
      .from(applications)
      .where(eq(applications.serviceId, serviceId))
      .orderBy(asc(applications.createdAt));
  }

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(applicationData)
      .returning();
    return application;
  }

  async acceptApplication(id: number, serviceId: number): Promise<void> {
    // Atualizar a candidatura aceita
    await db
      .update(applications)
      .set({ status: 'accepted' })
      .where(eq(applications.id, id));
    
    // Rejeitar outras candidaturas para o mesmo serviço
    await db
      .update(applications)
      .set({ status: 'rejected' })
      .where(
        and(
          eq(applications.serviceId, serviceId),
          not(eq(applications.id, id))
        )
      );
  }
  
  // Mensagens
  async getMessagesByServiceId(serviceId: number): Promise<Message[]> {
    // Retornamos todas as mensagens do serviço
    return await db.select()
      .from(messages)
      .where(eq(messages.serviceId, serviceId))
      .orderBy(asc(messages.sentAt));
  }
  
  // Novo método para buscar mensagens entre um lojista e um montador específico
  async getMessagesBetweenStoreAndAssembler(serviceId: number, assemblerId: number): Promise<Message[]> {
    // Buscar mensagens onde:
    // 1. O serviço é o especificado E
    // 2. O remetente é o lojista (proprietário da loja) OU o usuário associado ao montador especificado
    
    // Primeiro, precisamos obter o usuário do montador
    const assembler = await this.getAssemblerById(assemblerId);
    if (!assembler) {
      return [];
    }
    
    // Depois, precisamos obter o usuário do lojista (dono da loja)
    const service = await this.getServiceById(serviceId);
    if (!service) {
      return [];
    }
    
    const store = await this.getStore(service.storeId);
    if (!store) {
      return [];
    }
    
    // Agora podemos filtrar as mensagens que são apenas entre o lojista e este montador específico
    return await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.serviceId, serviceId),
          or(
            eq(messages.senderId, store.userId),
            eq(messages.senderId, assembler.userId)
          )
        )
      )
      .orderBy(asc(messages.sentAt));
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }
  
  async markMessagesAsRead(serviceId: number, userId: number): Promise<void> {
    // 1. Encontrar todas as mensagens do serviço que não foram lidas pelo usuário
    const serviceMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.serviceId, serviceId));
      
    // Apenas marcar as mensagens que não foram enviadas pelo próprio usuário
    const otherUserMessages = serviceMessages.filter(msg => msg.senderId !== userId);
    
    // Para cada mensagem não lida, marcar como lida
    for (const msg of otherUserMessages) {
      // Verificar se já está marcada como lida
      const existingRead = await db
        .select()
        .from(messageReads)
        .where(
          and(
            eq(messageReads.messageId, msg.id),
            eq(messageReads.userId, userId)
          )
        );
      
      // Se não estiver marcada como lida, criar o registro
      if (existingRead.length === 0) {
        await db
          .insert(messageReads)
          .values({
            messageId: msg.id,
            userId: userId,
            readAt: new Date()
          });
      }
    }
  }
  
  async getUnreadMessageCountForService(serviceId: number, userId: number): Promise<number> {
    // 1. Buscar todas as mensagens do serviço
    const allMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.serviceId, serviceId),
          not(eq(messages.senderId, userId)) // Apenas mensagens não enviadas pelo usuário
        )
      );
    
    // 2. Para cada mensagem, verificar se está marcada como lida
    let unreadCount = 0;
    
    for (const msg of allMessages) {
      const readRecord = await db
        .select()
        .from(messageReads)
        .where(
          and(
            eq(messageReads.messageId, msg.id),
            eq(messageReads.userId, userId)
          )
        );
      
      if (readRecord.length === 0) {
        unreadCount++;
      }
    }
    
    return unreadCount;
  }
  
  async hasUnreadMessages(serviceId: number, userId: number): Promise<boolean> {
    const unreadCount = await this.getUnreadMessageCountForService(serviceId, userId);
    return unreadCount > 0;
  }

  async getTotalUnreadMessageCount(userId: number): Promise<number> {
    // Buscar todos os serviços que o usuário tem acesso
    let userServiceIds: number[] = [];

    if (await this.getStoreByUserId(userId)) {
      // Se for lojista, buscar serviços da loja
      const store = await this.getStoreByUserId(userId);
      if (store) {
        const storeServices = await this.getServicesByStoreId(store.id);
        userServiceIds = storeServices.map(s => s.id);
      }
    } else if (await this.getAssemblerByUserId(userId)) {
      // Se for montador, buscar serviços que ele tem candidatura
      const assembler = await this.getAssemblerByUserId(userId);
      if (assembler) {
        const assemblerApplications = await db
          .select({ serviceId: applications.serviceId })
          .from(applications)
          .where(eq(applications.assemblerId, assembler.id));
        userServiceIds = assemblerApplications.map(app => app.serviceId);
      }
    }

    // Contar mensagens não lidas em todos os serviços
    let totalUnread = 0;
    for (const serviceId of userServiceIds) {
      const unreadCount = await this.getUnreadMessageCountForService(serviceId, userId);
      totalUnread += unreadCount;
    }

    return totalUnread;
  }

  // Método para tentar deletar uma mensagem - agora sempre retorna false para preservar o histórico completo
  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    // Verificar se a mensagem existe apenas para log
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
      
    if (message) {
      console.log(`Tentativa de excluir mensagem ${messageId} foi bloqueada. Preservação do histórico completo.`);
    }
    
    // Retorna sempre false, impossibilitando a exclusão de qualquer mensagem
    // para garantir a preservação completa do histórico de conversas
    return false;
  }
  
  // Avaliações
  async getRatingByServiceIdAndUser(serviceId: number, fromUserId: number, toUserId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.serviceId, serviceId),
          eq(ratings.fromUserId, fromUserId),
          eq(ratings.toUserId, toUserId)
        )
      );
    return rating;
  }
  
  async getRatingsByServiceId(serviceId: number): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.serviceId, serviceId))
      .orderBy(desc(ratings.createdAt));
  }
  
  async createRating(ratingData: InsertRating): Promise<Rating> {
    const [rating] = await db
      .insert(ratings)
      .values(ratingData)
      .returning();
    return rating;
  }
  
  // Obter a média de avaliações recebidas por um usuário
  async getAverageRatingForUser(userId: number): Promise<number> {
    try {
      // Buscar todas as avaliações para o usuário
      const userRatings = await db
        .select()
        .from(ratings)
        .where(eq(ratings.toUserId, userId));
      
      // Se não houver avaliações, retornar 0
      if (userRatings.length === 0) {
        return 0;
      }
      
      // Calcular média
      const sum = userRatings.reduce((acc, rating) => acc + rating.rating, 0);
      const avg = sum / userRatings.length;
      
      // Retornar média formatada com 1 casa decimal
      return parseFloat(avg.toFixed(1));
    } catch (error) {
      console.error('Erro ao calcular média de avaliações:', error);
      return 0; // Retornar 0 em caso de erro
    }
  }

  // Informações bancárias
  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    return await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId))
      .orderBy(desc(bankAccounts.createdAt));
  }

  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    const [bankAccount] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id));
    return bankAccount;
  }

  async createBankAccount(bankAccountData: InsertBankAccount): Promise<BankAccount> {
    const [bankAccount] = await db
      .insert(bankAccounts)
      .values(bankAccountData)
      .returning();
    return bankAccount;
  }

  async updateBankAccount(id: number, bankAccountData: Partial<BankAccount>): Promise<BankAccount> {
    const [updatedBankAccount] = await db
      .update(bankAccounts)
      .set(bankAccountData)
      .where(eq(bankAccounts.id, id))
      .returning();
    return updatedBankAccount;
  }

  async deleteBankAccount(id: number): Promise<void> {
    await db
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, id));
  }
}

export const storage = new DatabaseStorage();
