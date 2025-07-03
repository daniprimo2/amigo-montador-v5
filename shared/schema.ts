import { pgTable, text, serial, integer, boolean, jsonb, timestamp, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Definir tipos de status como constantes
export const SERVICE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress', 
  AWAITING_EVALUATION: 'awaiting_evaluation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type ServiceStatus = typeof SERVICE_STATUS[keyof typeof SERVICE_STATUS];

// Usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  birthDate: text("birth_date").notNull(), // Data de nascimento no formato DD/MM/YYYY
  userType: text("user_type").notNull(), // 'lojista' ou 'montador'
  profilePhotoData: text("profile_photo_data").notNull(), // Imagem em base64
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
  logoData: text("logo_data").notNull(), // Logo em base64
  materialTypes: jsonb("material_types"), // ['marcenaria', 'plano-corte', 'fabrica']
});

// Montadores
export const assemblers = pgTable("assemblers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  addressNumber: text("address_number"), // Número do endereço
  neighborhood: text("neighborhood"), // Bairro
  cep: text("cep"), // CEP formatado
  city: text("city").notNull(),
  state: text("state").notNull(),
  specialties: jsonb("specialties"), // ['marcenaria', 'plano-corte', 'fabrica']
  technicalAssistance: boolean("technical_assistance").default(false),
  experience: text("experience"),
  workRadius: integer("work_radius").default(20),
  rating: integer("rating"),
  documents: jsonb("documents"), // Dados dos documentos em base64
  documentType: text("document_type"), // 'cpf' ou 'cnpj'
  documentNumber: text("document_number"), // CPF: XXX.XXX.XXX-XX ou CNPJ: XX.XXX.XXX/XXXX-XX
  // Documentos obrigatórios
  rgFrontData: text("rg_front_data").notNull(), // RG/CNH frente em base64 (obrigatório)
  rgBackData: text("rg_back_data").notNull(), // RG/CNH verso em base64 (obrigatório)
  proofOfAddressData: text("proof_of_address_data").notNull(), // Comprovante de residência em base64 (obrigatório)
  certificatesData: jsonb("certificates_data"), // Certificados profissionais em base64 (opcional)
  // Novos campos para perfil completo
  experienceYears: integer("experience_years").default(0), // Anos de experiência numérico
  serviceTypes: jsonb("service_types"), // ['residencial', 'corporativo', 'lojas_parceiras']
  availability: jsonb("availability"), // { dias: ['seg', 'ter', ...], horarios: { inicio: '08:00', fim: '18:00' } }
  hasOwnTools: boolean("has_own_tools").default(true), // Se possui ferramentas próprias
  professionalDescription: text("professional_description"), // Descrição profissional mais detalhada
});

// Serviços
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(), // Cidade/UF
  address: text("address"), // Endereço (rua)
  addressNumber: text("address_number"), // Número do endereço
  cep: text("cep"), // CEP
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  startDate: timestamp("start_date").notNull(), // Data de início do serviço
  endDate: timestamp("end_date").notNull(), // Data de fim do serviço
  price: text("price").notNull(),
  status: text("status").notNull().default("open"), // 'open', 'in-progress', 'completed', 'cancelled'
  materialType: text("material_type").notNull(),
  projectFiles: jsonb("project_files").notNull(), // Arquivos do projeto em base64
  paymentReference: text("payment_reference"), // Referência do pagamento PIX
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'proof_submitted', 'confirmed', 'rejected'
  paymentProof: text("payment_proof"), // Comprovante de pagamento enviado
  ratingRequired: boolean("rating_required").default(false), // true quando pagamento é confirmado e avaliação é obrigatória
  storeRatingCompleted: boolean("store_rating_completed").default(false), // true quando loja avaliou montador
  assemblerRatingCompleted: boolean("assembler_rating_completed").default(false), // true quando montador avaliou loja
  bothRatingsCompleted: boolean("both_ratings_completed").default(false), // true quando ambas avaliações foram feitas
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
  messageType: text("message_type").default("text"), // 'text', 'payment_proof', 'payment_confirmation'
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
  fromUserType: text("from_user_type").notNull(), // 'lojista' ou 'montador'
  toUserType: text("to_user_type").notNull(), // 'lojista' ou 'montador'
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  emojiRating: text("emoji_rating"), // Emoji escolhido para feedback rápido
  punctualityRating: integer("punctuality_rating").default(5), // Avaliação de pontualidade (1-5)
  qualityRating: integer("quality_rating").default(5), // Avaliação de qualidade (1-5)
  complianceRating: integer("compliance_rating").default(5), // Avaliação de cumprimento de acordos (1-5)
  serviceRegion: varchar("service_region", { length: 255 }), // Região onde o serviço foi realizado
  isLatest: boolean("is_latest").default(false), // Marca se é a avaliação mais recente
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

// Tokens de recuperação de senha
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// Schemas de inserção
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  birthDate: true,
  userType: true,
  profilePhotoData: true,
  profileData: true,
});

// Custom validation functions
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  return cleanCPF.length === 11;
};

const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.length === 14;
};

const validateDocumentNumber = (documentNumber: string, documentType: string): boolean => {
  const cleanNumber = documentNumber.replace(/[^\d]/g, '');
  if (documentType === 'cpf') {
    return cleanNumber.length === 11;
  } else if (documentType === 'cnpj') {
    return cleanNumber.length === 14;
  }
  return false;
};

// Função para validar data no formato DD/MM/YYYY
const validateBirthDate = (birthDate: string): boolean => {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = birthDate.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
  const year = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Verificar se a data é válida
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return false;
  }
  
  // Verificar se a data não é futura
  const today = new Date();
  if (date > today) {
    return false;
  }
  
  return true;
};

// Função para verificar se o usuário é maior de idade (18 anos)
const isAdult = (birthDate: string): boolean => {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = birthDate.match(dateRegex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
  const year = parseInt(match[3], 10);
  
  const birthDateObj = new Date(year, month, day);
  const today = new Date();
  
  // Calcular idade
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age >= 18;
};

export const insertStoreSchema = createInsertSchema(stores).refine(
  (data) => validateDocumentNumber(data.documentNumber, data.documentType),
  {
    message: "CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos",
    path: ["documentNumber"]
  }
);

export const insertAssemblerSchema = createInsertSchema(assemblers).extend({
  documentType: z.enum(['cpf', 'cnpj']).optional(),
  documentNumber: z.string().optional(),
}).refine(
  (data) => {
    // If documentType and documentNumber are provided, validate them
    if (data.documentType && data.documentNumber) {
      return validateDocumentNumber(data.documentNumber, data.documentType);
    }
    return true; // Allow empty documents for now
  },
  {
    message: "CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos",
    path: ["documentNumber"]
  }
);

export const insertServiceSchema = createInsertSchema(services);
export const insertApplicationSchema = createInsertSchema(applications);
export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageReadSchema = createInsertSchema(messageReads);
export const insertRatingSchema = createInsertSchema(ratings);

export const insertBankAccountSchema = createInsertSchema(bankAccounts).refine(
  (data) => validateDocumentNumber(data.holderDocumentNumber, data.holderDocumentType),
  {
    message: "CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos",
    path: ["holderDocumentNumber"]
  }
);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);

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
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

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
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
