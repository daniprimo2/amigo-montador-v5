import { pgTable, text, serial, integer, boolean, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  userType: text("user_type").notNull(), // 'lojista' ou 'montador'
  profilePhotoUrl: text("profile_photo_url"), // URL da foto de perfil
  profileData: jsonb("profile_data"), // Dados adicionais específicos para cada tipo de usuário
  createdAt: timestamp("created_at").defaultNow(),
});

// Lojas (para lojistas)
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(), // 'cpf' ou 'cnpj'
  documentNumber: text("document_number").notNull(),
  cnpj: text("cnpj").notNull(), // Campo adicional encontrado no banco de dados
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  materialTypes: jsonb("material_types"), // ['marcenaria', 'plano-corte', 'fabrica']
});

// Montadores
export const assemblers = pgTable("assemblers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  specialties: jsonb("specialties"), // ['marcenaria', 'plano-corte', 'fabrica']
  technicalAssistance: boolean("technical_assistance").default(false),
  experience: text("experience"),
  workRadius: integer("work_radius").default(20),
  rating: integer("rating"),
  documents: jsonb("documents"), // URLs para documentos
});

// Serviços
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(), // Cidade/UF
  address: text("address"), // Endereço (rua)
  addressNumber: text("address_number"), // Número do endereço
  cep: text("cep"), // CEP
  latitude: text("latitude"),
  longitude: text("longitude"),
  date: text("date").notNull(),
  price: text("price").notNull(),
  status: text("status").notNull().default("open"), // 'open', 'in-progress', 'completed', 'cancelled'
  materialType: text("material_type").notNull(),
  projectFiles: jsonb("project_files"), // URLs para arquivos do projeto
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // Data de finalização do serviço
});

// Candidaturas
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  assemblerId: integer("assembler_id").notNull().references(() => assemblers.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

// Mensagens de chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Controle de mensagens lidas
export const messageReads = pgTable("message_reads", {
  messageId: integer("message_id").notNull().references(() => messages.id),
  userId: integer("user_id").notNull().references(() => users.id),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.messageId, table.userId] }),
  };
});

// Avaliações
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Informações bancárias
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankName: text("bank_name").notNull(),
  accountType: text("account_type").notNull(), // 'corrente' ou 'poupança'
  accountNumber: text("account_number").notNull(),
  agency: text("agency").notNull(),
  holderName: text("holder_name").notNull(),
  holderDocumentType: text("holder_document_type").notNull(), // 'cpf' ou 'cnpj'
  holderDocumentNumber: text("holder_document_number").notNull(),
  pixKey: text("pix_key"),
  pixKeyType: text("pix_key_type"), // 'cpf', 'cnpj', 'email', 'telefone', 'aleatória'
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas de inserção
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  userType: true,
  profilePhotoUrl: true,
  profileData: true,
});

export const insertStoreSchema = createInsertSchema(stores);
export const insertAssemblerSchema = createInsertSchema(assemblers);
export const insertServiceSchema = createInsertSchema(services);
export const insertApplicationSchema = createInsertSchema(applications);
export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageReadSchema = createInsertSchema(messageReads);
export const insertRatingSchema = createInsertSchema(ratings);
export const insertBankAccountSchema = createInsertSchema(bankAccounts);

// Tipos de inserção
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type InsertAssembler = z.infer<typeof insertAssemblerSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

// Tipos de seleção
export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Assembler = typeof assemblers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageRead = typeof messageReads.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
