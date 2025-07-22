import { eq, and, not, ne, isNotNull, isNull, or, sql, inArray, desc } from "drizzle-orm";
import { db } from "./db.js";
import {
  users, stores, assemblers, services, applications, messages, messageReads, ratings, bankAccounts, passwordResetTokens,
  type User, type Store, type Assembler, type Service, type Application, type Message, type Rating, type BankAccount, type PasswordResetToken,
  type InsertUser, type InsertStore, type InsertAssembler, type InsertService, type InsertApplication,
  type InsertMessage, type InsertRating, type InsertBankAccount, type InsertPasswordResetToken
} from "../shared/schema.js";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;

  getStoreByUserId(userId: number): Promise<Store | undefined>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, storeData: Partial<Store>): Promise<Store>;

  getAssemblerByUserId(userId: number): Promise<Assembler | undefined>;
  getAssemblerById(id: number): Promise<Assembler | undefined>;
  createAssembler(assembler: InsertAssembler): Promise<Assembler>;
  updateAssembler(id: number, assemblerData: Partial<Assembler>): Promise<Assembler>;

  getServiceById(id: number): Promise<Service | undefined>;
  getServicesByStoreId(storeId: number, status?: string): Promise<Service[]>;
  getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]>;
  getAvailableServicesForAssemblerWithDistance(assembler: Assembler): Promise<(Service & { distance: number })[]>;
  createService(service: InsertService): Promise<Service>;
  updateServiceStatus(id: number, status: string): Promise<Service>;
  updateService(id: number, serviceData: Partial<Service>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  getApplicationById(id: number): Promise<Application | undefined>;
  getApplicationByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Application | undefined>;
  getApplicationsByServiceId(serviceId: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  acceptApplication(id: number, serviceId: number): Promise<void>;

  getMessagesByServiceId(serviceId: number): Promise<Message[]>;
  getMessagesByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(serviceId: number, userId: number): Promise<void>;
  getUnreadMessageCountForService(serviceId: number, userId: number): Promise<number>;
  hasUnreadMessages(serviceId: number, userId: number): Promise<boolean>;
  getTotalUnreadMessageCount(userId: number): Promise<number>;

  getRatingByServiceIdAndUser(serviceId: number, fromUserId: number, toUserId: number): Promise<Rating | undefined>;
  getRatingsByServiceId(serviceId: number): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;

  getBankAccountsByUserId(userId: number): Promise<BankAccount[]>;
  getBankAccountById(id: number): Promise<BankAccount | undefined>;
  createBankAccount(bankAccount: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, bankAccountData: Partial<BankAccount>): Promise<BankAccount>;
  deleteBankAccount(id: number): Promise<void>;

  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(tokenId: number): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  getUserAverageRating(userId: number): Promise<{ averageRating: number; totalRatings: number }>;
  getUserRatingsWithDetails(userId: number): Promise<(Rating & { fromUserName: string; fromUserType: string; serviceTitle: string })[]>;
  getTopRatedUsers(userType: 'lojista' | 'montador', limit?: number): Promise<Array<{
    id: number;
    name: string;
    userType: string;
    averageRating: number;
    totalRatings: number;
    profilePhotoData: string;
  }>>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PgSession = ConnectPgSimple(session);
    this.sessionStore = new PgSession({
      pool: pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getStoreByUserId(userId: number): Promise<Store | undefined> {
    const result = await db.select().from(stores).where(eq(stores.userId, userId)).limit(1);
    return result[0];
  }

  async getStore(id: number): Promise<Store | undefined> {
    const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
    return result[0];
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const result = await db.insert(stores).values(storeData).returning();
    return result[0];
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store> {
    const result = await db.update(stores).set(storeData).where(eq(stores.id, id)).returning();
    return result[0];
  }

  async getAssemblerByUserId(userId: number): Promise<Assembler | undefined> {
    const result = await db.select().from(assemblers).where(eq(assemblers.userId, userId)).limit(1);
    return result[0];
  }

  async getAssemblerById(id: number): Promise<Assembler | undefined> {
    const result = await db.select().from(assemblers).where(eq(assemblers.id, id)).limit(1);
    return result[0];
  }

  async createAssembler(assemblerData: InsertAssembler): Promise<Assembler> {
    const result = await db.insert(assemblers).values(assemblerData).returning();
    return result[0];
  }

  async updateAssembler(id: number, assemblerData: Partial<Assembler>): Promise<Assembler> {
    const result = await db.update(assemblers).set(assemblerData).where(eq(assemblers.id, id)).returning();
    return result[0];
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return result[0];
  }

  async getServiceByPaymentId(paymentReference: string): Promise<Service | undefined> {
    const result = await db
      .select()
      .from(services)
      .where(eq(services.paymentReference, paymentReference))
      .limit(1);
    return result[0];
  }

  async updateServiceStatusByPaymentReference(paymentReference: string, status: string): Promise<Service> {
    const result = await db
      .update(services)
      .set({ status })
      .where(eq(services.paymentReference, paymentReference))
      .returning();
    return result[0];
  }

  async getServicesByStoreId(storeId: number, status?: string): Promise<Service[]> {
    if (status) {
      return await db.select().from(services)
        .where(and(eq(services.storeId, storeId), eq(services.status, status)))
        .orderBy(desc(services.createdAt));
    }

    return await db.select().from(services)
      .where(eq(services.storeId, storeId))
      .orderBy(desc(services.createdAt));
  }

  async getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]> {
    // Get all open services
    const openServices = await db.select().from(services).where(eq(services.status, 'open')).orderBy(desc(services.createdAt));

    // Get services where this assembler has already applied
    const assemblerApplications = await db.select({ serviceId: applications.serviceId })
      .from(applications)
      .where(eq(applications.assemblerId, assembler.id));

    const appliedServiceIds = new Set(assemblerApplications.map(app => app.serviceId));

    // Return only services where the assembler hasn't applied yet
    return openServices.filter(service => !appliedServiceIds.has(service.id));
  }

  async getAvailableServicesForAssemblerWithDistance(assembler: Assembler): Promise<(Service & { distance: number })[]> {
    // Get services based on clear status rules to prevent duplicates
    const allServices = await db.select().from(services)
      .where(inArray(services.status, ['open', 'in-progress', 'completed', 'awaiting_evaluation']))
      .orderBy(desc(services.createdAt));

    // Get services where this assembler has applications
    const assemblerApplications = await db.select({ serviceId: applications.serviceId, status: applications.status })
      .from(applications)
      .where(eq(applications.assemblerId, assembler.id));

    const assemblerServiceIds = new Set(assemblerApplications.map(app => app.serviceId));

    // Get services where this assembler has been accepted (is the chosen assembler)
    const acceptedApplications = await db.select({ serviceId: applications.serviceId })
      .from(applications)
      .where(and(
        eq(applications.assemblerId, assembler.id),
        eq(applications.status, 'accepted')
      ));

    const acceptedServiceIds = new Set(acceptedApplications.map(app => app.serviceId));

    // Apply consistent status-based visibility rules to prevent duplicates
    const availableServices = allServices.filter(service => {
      // Open services: visible to all assemblers
      if (service.status === 'open') {
        return true;
      }

      // In-progress, completed, awaiting_evaluation: only visible to accepted assembler
      if (['in-progress', 'completed', 'awaiting_evaluation'].includes(service.status)) {
        return acceptedServiceIds.has(service.id);
      }

      return false;
    });

    console.log(`Total de serviços encontrados: ${allServices.length}`);
    console.log(`Serviços abertos (visíveis a todos): ${allServices.filter(s => s.status === 'open').length}`);
    console.log(`Serviços onde montador foi aceito: ${acceptedServiceIds.size}`);
    console.log(`TODOS OS SERVIÇOS disponíveis para este montador: ${availableServices.length}`);

    // Get assembler coordinates from CEP
    let assemblerLat: number;
    let assemblerLng: number;

    try {
      const geocoding = await import('./geocoding.js');
      const coords = await geocoding.geocodeFromCEP(assembler.cep || '');
      assemblerLat = parseFloat(coords.latitude);
      assemblerLng = parseFloat(coords.longitude);
      console.log(`Montador ID ${assembler.id} (CEP: ${assembler.cep}): Coordenadas obtidas = ${assemblerLat}, ${assemblerLng}`);
    } catch (error) {
      console.log('Erro ao geocodificar CEP do montador, usando coordenadas padrão:', error);
      // Use São Paulo coordinates as fallback
      assemblerLat = -23.5505199;
      assemblerLng = -46.6333094;
    }

    // Calculate distance for each service and filter by 20km radius
    const servicesWithDistance = [];

    for (const service of availableServices) {
      const serviceLat = parseFloat(service.latitude);
      const serviceLng = parseFloat(service.longitude);

      let distance = 0;
      try {
        const geocoding = await import('./geocoding.js');
        distance = geocoding.calculateDistance(assemblerLat, assemblerLng, serviceLat, serviceLng);
        console.log(`Serviço ID ${service.id}: Coordenadas (${serviceLat}, ${serviceLng}), Distância calculada = ${distance.toFixed(2)}km`);
      } catch (error) {
        console.log('Erro ao calcular distância:', error);
        distance = 999; // Set high distance if calculation fails
      }

      // Only include services within 20km radius
      if (distance <= 20) {
        console.log(`Serviço ID ${service.id}: INCLUÍDO (distância: ${distance.toFixed(2)}km <= 20km)`);
        servicesWithDistance.push({
          ...service,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        });
      } else {
        console.log(`Serviço ID ${service.id}: EXCLUÍDO (distância: ${distance.toFixed(2)}km > 20km)`);
      }
    }

    // Sort by distance (closest first)
    return servicesWithDistance.sort((a, b) => a.distance - b.distance);
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const result = await db.insert(services).values(serviceData).returning();
    return result[0];
  }

  async updateServiceStatus(id: number, status: string): Promise<Service> {
    const result = await db.update(services).set({ status }).where(eq(services.id, id)).returning();
    return result[0];
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service> {
    const result = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
    return result[0];
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getApplicationById(id: number): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0];
  }

  async getApplicationByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Application | undefined> {
    const result = await db.select().from(applications)
      .where(and(eq(applications.serviceId, serviceId), eq(applications.assemblerId, assemblerId)))
      .limit(1);
    return result[0];
  }

  async getApplicationsByServiceId(serviceId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.serviceId, serviceId));
  }
 

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    const result = await db.insert(applications).values(applicationData).returning();
    return result[0];
  }

  async acceptApplication(id: number, serviceId: number): Promise<void> {
    await db.update(applications).set({ status: 'accepted' }).where(eq(applications.id, id));
    await db.update(applications).set({ status: 'rejected' })
      .where(and(eq(applications.serviceId, serviceId), not(eq(applications.id, id))));
    // Update service status to 'in-progress' when an application is accepted
    await db.update(services).set({ status: 'in-progress' }).where(eq(services.id, serviceId));
  }

  async getMessagesByServiceId(serviceId: number): Promise<Message[]> {
    try {
      return await db.select().from(messages).where(eq(messages.serviceId, serviceId)).orderBy(messages.sentAt);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  async getMessagesByServiceAndAssembler(serviceId: number, assemblerId: number): Promise<Message[]> {
    try {
      return await db.select().from(messages)
        .where(and(eq(messages.serviceId, serviceId), eq(messages.assemblerId, assemblerId)))
        .orderBy(messages.sentAt);
    } catch (error) {
      console.error('Erro ao buscar mensagens por serviço e montador:', error);
      return [];
    }
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(messageData).returning();
    return result[0];
  }

  async markMessagesAsRead(serviceId: number, userId: number): Promise<void> {
    try {
      // Buscar mensagens não lidas do serviço
      const allMessages = await db.select({ id: messages.id })
        .from(messages)
        .where(and(
          eq(messages.serviceId, serviceId),
          not(eq(messages.senderId, userId))
        ));

      // Marcar cada mensagem como lida
      for (const message of allMessages) {
        await db.insert(messageReads).values({
          messageId: message.id,
          userId: userId
        }).onConflictDoNothing();
      }
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  }

  async getUnreadMessageCountForService(serviceId: number, userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(messages)
      .leftJoin(messageReads, and(
        eq(messageReads.messageId, messages.id),
        eq(messageReads.userId, userId)
      ))
      .where(and(
        eq(messages.serviceId, serviceId),
        not(eq(messages.senderId, userId)),
        isNull(messageReads.messageId)
      ));
    return Number(result[0]?.count || 0);
  }

  async hasUnreadMessages(serviceId: number, userId: number): Promise<boolean> {
    const count = await this.getUnreadMessageCountForService(serviceId, userId);
    return count > 0;
  }

  async getTotalUnreadMessageCount(userId: number): Promise<number> {
    try {
      // First, get user details to determine if they're a store owner or assembler
      const user = await this.getUser(userId);
      if (!user) return 0;

      let serviceIds: number[] = [];

      if (user.userType === 'lojista') {
        // For store owners, get services they own
        const store = await this.getStoreByUserId(userId);
        if (store) {
          const ownedServices = await db.select({ id: services.id })
            .from(services)
            .where(eq(services.storeId, store.id));
          serviceIds = ownedServices.map(s => s.id);
        }
      } else if (user.userType === 'montador') {
        // For assemblers, get services where they have applications (especially accepted ones)
        const assembler = await this.getAssemblerByUserId(userId);
        if (assembler) {
          const participatingServices = await db.select({ serviceId: applications.serviceId })
            .from(applications)
            .where(eq(applications.assemblerId, assembler.id));
          serviceIds = participatingServices.map(a => a.serviceId);
        }
      }

      // If no services found, user has no conversations
      if (serviceIds.length === 0) return 0;

      // Count unread messages only from services where user participates
      const result = await db.select({ count: sql`count(*)` })
        .from(messages)
        .leftJoin(messageReads, and(
          eq(messageReads.messageId, messages.id),
          eq(messageReads.userId, userId)
        ))
        .where(and(
          inArray(messages.serviceId, serviceIds), // CRITICAL: Only count messages from user's services
          not(eq(messages.senderId, userId)), // Don't count own messages
          isNull(messageReads.messageId) // Only unread messages
        ));

      console.log(`📊 Contagem de mensagens não lidas para usuário ${userId}: ${result[0]?.count || 0} (de ${serviceIds.length} serviços)`);
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Erro ao buscar contagem total de mensagens não lidas:', error);
      return 0;
    }
  }

  async getRatingByServiceIdAndUser(serviceId: number, fromUserId: number, toUserId: number): Promise<Rating | undefined> {
    const result = await db.select().from(ratings)
      .where(and(
        eq(ratings.serviceId, serviceId),
        eq(ratings.fromUserId, fromUserId),
        eq(ratings.toUserId, toUserId)
      ))
      .limit(1);
    return result[0];
  }

  async getRatingsByServiceId(serviceId: number): Promise<Rating[]> {
    return await db.select().from(ratings).where(eq(ratings.serviceId, serviceId));
  }

  async createRating(ratingData: InsertRating): Promise<Rating> {
    const result = await db.insert(ratings).values(ratingData).returning();
    return result[0];
  }

  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }

  async getBankAccountById(id: number): Promise<BankAccount | undefined> {
    const result = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    return result[0];
  }

  async createBankAccount(bankAccountData: InsertBankAccount): Promise<BankAccount> {
    const result = await db.insert(bankAccounts).values(bankAccountData).returning();
    return result[0];
  }

  async updateBankAccount(id: number, bankAccountData: Partial<BankAccount>): Promise<BankAccount> {
    const result = await db.update(bankAccounts).set(bankAccountData).where(eq(bankAccounts.id, id)).returning();
    return result[0];
  }

  async deleteBankAccount(id: number): Promise<void> {
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
  }

  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await db.insert(passwordResetTokens).values(tokenData).returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
    return result[0];
  }

  async markPasswordResetTokenAsUsed(tokenId: number): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(passwordResetTokens).where(sql`created_at < ${oneDayAgo}`);
  }

  async getUserAverageRating(userId: number): Promise<{ averageRating: number; totalRatings: number }> {
    const result = await db.select({
      averageRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
      totalRatings: sql<number>`COUNT(${ratings.id})`
    })
      .from(ratings)
      .where(eq(ratings.toUserId, userId));

    return {
      averageRating: Number(result[0]?.averageRating || 0),
      totalRatings: Number(result[0]?.totalRatings || 0)
    };
  }

  async getUserRatingsWithDetails(userId: number): Promise<(Rating & { fromUserName: string; fromUserType: string; serviceTitle: string })[]> {
    const result = await db.select({
      id: ratings.id,
      serviceId: ratings.serviceId,
      fromUserId: ratings.fromUserId,
      toUserId: ratings.toUserId,
      fromUserType: ratings.fromUserType,
      toUserType: ratings.toUserType,
      rating: ratings.rating,
      comment: ratings.comment,
      emojiRating: ratings.emojiRating,
      punctualityRating: ratings.punctualityRating,
      qualityRating: ratings.qualityRating,
      complianceRating: ratings.complianceRating,
      createdAt: ratings.createdAt,
      fromUserName: users.name,
      serviceTitle: services.title
    })
      .from(ratings)
      .innerJoin(users, eq(ratings.fromUserId, users.id))
      .innerJoin(services, eq(ratings.serviceId, services.id))
      .where(eq(ratings.toUserId, userId))
      .orderBy(desc(ratings.createdAt));

    return result as any[];
  }

  async getTopRatedUsers(userType: 'lojista' | 'montador', limit: number = 10): Promise<Array<{
    id: number;
    name: string;
    userType: string;
    averageRating: number;
    totalRatings: number;
    profilePhotoData: string;
  }>> {
    const result = await db.select({
      id: users.id,
      name: users.name,
      userType: users.userType,
      profilePhotoData: users.profilePhotoData,
      averageRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
      totalRatings: sql<number>`COUNT(${ratings.id})`
    })
      .from(users)
      .leftJoin(ratings, eq(ratings.toUserId, users.id))
      .where(eq(users.userType, userType))
      .groupBy(users.id, users.name, users.userType, users.profilePhotoData)
      .having(sql`COUNT(${ratings.id}) > 0`)
      .orderBy(desc(sql`AVG(${ratings.rating})`), desc(sql`COUNT(${ratings.id})`))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      name: row.name,
      userType: row.userType,
      averageRating: Number(row.averageRating || 0),
      totalRatings: Number(row.totalRatings || 0),
      profilePhotoData: row.profilePhotoData
    }));
  }
}

export const storage = new DatabaseStorage();
