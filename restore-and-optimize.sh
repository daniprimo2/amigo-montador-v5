#!/bin/bash

echo "Restaurando projeto e preparando para produção..."

# Limpar arquivos corrompidos
rm -f optimize-for-production.js fix-production.js prepare-production.js

# Verificar se existe backup
if [ -f "server/routes.ts.backup" ]; then
    echo "Restaurando routes.ts do backup..."
    cp server/routes.ts.backup server/routes.ts
fi

# Criar versão limpa do storage.ts se estiver corrompido
cat > server/storage.ts << 'EOF'
import { eq, and, not, isNotNull, or, sql, inArray, desc } from "drizzle-orm";
import { db } from "./db.js";
import { 
  users, stores, assemblers, services, applications, messages, ratings, bankAccounts, passwordResetTokens,
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

  async getServicesByStoreId(storeId: number, status?: string): Promise<Service[]> {
    const enhancedServices = await Promise.all(services.map(async (service) => {
      const acceptedApplications = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.serviceId, service.id),
            eq(applications.status, 'accepted')
          )
        );
      
      if (acceptedApplications.length > 0) {
        const assemblerId = acceptedApplications[0].assemblerId;
        const assembler = await this.getAssemblerById(assemblerId);
        
        if (assembler) {
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
      
      return service;
    }));
    
    return enhancedServices;
  }

  async getAvailableServicesForAssembler(assembler: Assembler): Promise<Service[]> {
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
    
    const enhancedServices = await Promise.all(servicesList.map(async result => {
      const { services: service, stores: store } = result;
      
      let projectFiles = [];
      if (service.projectFiles) {
        try {
          if (typeof service.projectFiles === 'string') {
            projectFiles = JSON.parse(service.projectFiles);
          } else {
            projectFiles = service.projectFiles;
          }
        } catch (error) {
          // Silencioso para produção
        }
      }
      
      const storeNameFromDb = store?.name || 'Loja não especificada';
      
      return {
        ...service,
        projectFiles,
        storeName: storeNameFromDb,
        description: service.description || '',
        materialType: service.materialType || '',
        address: service.address || '',
        addressNumber: service.addressNumber || '',
        cep: service.cep || ''
      } as Service & { storeName: string };
    }));
    
    return enhancedServices;
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
  }

  async getMessagesByServiceId(serviceId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.serviceId, serviceId)).orderBy(messages.timestamp);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(messageData).returning();
    return result[0];
  }

  async markMessagesAsRead(serviceId: number, userId: number): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.serviceId, serviceId), not(eq(messages.senderId, userId))));
  }

  async getUnreadMessageCountForService(serviceId: number, userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.serviceId, serviceId),
        not(eq(messages.senderId, userId)),
        eq(messages.isRead, false)
      ));
    return Number(result[0]?.count || 0);
  }

  async hasUnreadMessages(serviceId: number, userId: number): Promise<boolean> {
    const count = await this.getUnreadMessageCountForService(serviceId, userId);
    return count > 0;
  }

  async getTotalUnreadMessageCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(messages)
      .where(and(
        not(eq(messages.senderId, userId)),
        eq(messages.isRead, false)
      ));
    return Number(result[0]?.count || 0);
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
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(passwordResetTokens).where(sql`created_at < ${oneDayAgo}`);
  }
}

export const storage = new DatabaseStorage();
EOF

echo "Projeto restaurado!"
echo "Agora preparando configurações para produção e Play Store..."

# Criar configuração Capacitor otimizada
cat > capacitor.config.ts << 'EOF'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amigomontador.app',
  appName: 'AmigoMontador',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563EB",
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#2563EB"
    }
  }
};

export default config;
EOF

# Criar script de build para produção
cat > build-for-playstore.sh << 'EOF'
#!/bin/bash

echo "🏗️ Preparando build para Play Store..."

# Limpar builds anteriores
rm -rf dist/
rm -rf android/app/src/main/assets/public/

# Build otimizado do frontend
echo "📦 Building frontend..."
NODE_ENV=production npm run build

# Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "❌ Erro no build do frontend"
  exit 1
fi

# Sync com Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

echo "✅ Projeto pronto para gerar AAB!"
echo "📱 Execute: cd android && ./gradlew bundleRelease"
EOF

chmod +x build-for-playstore.sh

echo "✅ Projeto restaurado e configurado para produção!"
echo "📋 Para preparar para Play Store:"
echo "1. Execute: ./build-for-playstore.sh"
echo "2. Execute: cd android && ./gradlew bundleRelease"
echo "3. O AAB estará em: android/app/build/outputs/bundle/release/"