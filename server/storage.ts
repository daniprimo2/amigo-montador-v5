import { users, type User, type InsertUser, stores, type Store, type InsertStore, assemblers, type Assembler, type InsertAssembler, services, type Service, type InsertService, applications, type Application, type InsertApplication, messages, type Message, type InsertMessage, ratings, type Rating, type InsertRating } from "@shared/schema";
import { db } from "./db";
import { eq, and, not, desc, asc, or, gt, lt, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Lojas
  getStoreByUserId(userId: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, storeData: Partial<Store>): Promise<Store>;
  
  // Montadores
  getAssemblerByUserId(userId: number): Promise<Assembler | undefined>;
  createAssembler(assembler: InsertAssembler): Promise<Assembler>;
  updateAssembler(id: number, assemblerData: Partial<Assembler>): Promise<Assembler>;
  
  // Serviços
  getServiceById(id: number): Promise<Service | undefined>;
  getServicesByStoreId(storeId: number, status?: string): Promise<Service[]>;
  getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateServiceStatus(id: number, status: string): Promise<Service>;
  
  // Candidaturas
  getApplicationById(id: number): Promise<Application | undefined>;
  getApplicationByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Application | undefined>;
  getApplicationsByServiceId(serviceId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  acceptApplication(id: number, serviceId: number): Promise<void>;
  
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
      return await db.select()
        .from(services)
        .where(and(
          eq(services.storeId, storeId),
          eq(services.status, status)
        ))
        .orderBy(desc(services.createdAt));
    }
    
    return await query.orderBy(desc(services.createdAt));
  }

  async getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]> {
    // Obter serviços disponíveis que correspondem às especialidades do montador
    const servicesList = await db.select()
      .from(services)
      .where(
        and(
          eq(services.status, 'open'),
          // Aqui seria implementada a lógica para filtrar por distância
          // Na implementação real, utilizaríamos longitude/latitude para calcular distância
        )
      )
      .orderBy(desc(services.createdAt));
    
    // Filtrar manualmente os serviços que correspondem às especialidades do montador
    // Isto é uma simplificação - numa implementação completa, isso seria feito no banco
    return servicesList.filter(service => {
      const assemblerSpecialties = assembler.specialties as string[];
      // Verificar se o tipo de material do serviço está nas especialidades do montador
      return assemblerSpecialties.includes(service.materialType);
    });
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(serviceData)
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
}

export const storage = new DatabaseStorage();
