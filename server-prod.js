var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/geocoding.ts
var geocoding_exports = {};
__export(geocoding_exports, {
  calculateDistance: () => calculateDistance,
  geocodeFromCEP: () => geocodeFromCEP,
  getCityCoordinates: () => getCityCoordinates
});
import axios from "axios";
async function geocodeFromCEP(cep) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) {
    throw new Error("CEP deve ter 8 d\xEDgitos");
  }
  const directCoords = getSpecificCoordinatesForCEP(cleanCep, "", "");
  if (directCoords) {
    console.log(`[Geocoding] Usando coordenadas diretas para CEP ${cleanCep}:`, directCoords);
    return {
      latitude: directCoords.latitude,
      longitude: directCoords.longitude
    };
  }
  try {
    console.log(`[Geocoding] Buscando coordenadas para CEP: ${cleanCep}`);
    const viacepResponse = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      timeout: 3e3,
      headers: {
        "User-Agent": "Amigo-Montador-App/1.0"
      }
    });
    if (viacepResponse.data.erro) {
      throw new Error("CEP n\xE3o encontrado");
    }
    const { localidade, uf, bairro, logradouro } = viacepResponse.data;
    console.log(`[Geocoding] CEP ${cleanCep}: ${logradouro}, ${bairro}, ${localidade}/${uf}`);
    const coords = getSpecificCoordinatesForCEP(cleanCep, localidade, uf);
    console.log(`[Geocoding] Coordenadas encontradas: ${coords.latitude}, ${coords.longitude}`);
    return {
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  } catch (error) {
    console.error(`[Geocoding] Erro na geocodifica\xE7\xE3o para CEP ${cleanCep}:`, error);
    const fallbackCoords = getFallbackCoordinatesFromCEP(cleanCep);
    if (fallbackCoords) {
      console.log(`[Geocoding] Usando coordenadas de fallback para CEP ${cleanCep}:`, fallbackCoords);
      return fallbackCoords;
    }
    throw new Error("N\xE3o foi poss\xEDvel obter coordenadas para este CEP");
  }
}
function getFallbackCoordinatesFromCEP(cep) {
  const cepPrefix = cep.substring(0, 5);
  const cepRanges = {
    // Osasco - CEP 06200-06299
    "06200": { latitude: "-23.5329", longitude: "-46.7918" },
    "06210": { latitude: "-23.5329", longitude: "-46.7918" },
    "06220": { latitude: "-23.5329", longitude: "-46.7918" },
    "06230": { latitude: "-23.5329", longitude: "-46.7918" },
    "06240": { latitude: "-23.5329", longitude: "-46.7918" },
    "06250": { latitude: "-23.5329", longitude: "-46.7918" },
    // Carapicuíba - CEP 06300-06399
    "06300": { latitude: "-23.5223", longitude: "-46.8356" },
    "06310": { latitude: "-23.5223", longitude: "-46.8356" },
    "06320": { latitude: "-23.5223", longitude: "-46.8356" },
    "06330": { latitude: "-23.5223", longitude: "-46.8356" },
    "06340": { latitude: "-23.5223", longitude: "-46.8356" },
    "06350": { latitude: "-23.5223", longitude: "-46.8356" },
    "06360": { latitude: "-23.5223", longitude: "-46.8356" },
    "06370": { latitude: "-23.5223", longitude: "-46.8356" },
    "06380": { latitude: "-23.5223", longitude: "-46.8356" },
    "06390": { latitude: "-23.5223", longitude: "-46.8356" },
    // Itapecerica da Serra - CEP 06850-06899
    "06850": { latitude: "-23.7169", longitude: "-46.8503" },
    "06860": { latitude: "-23.7169", longitude: "-46.8503" },
    "06870": { latitude: "-23.7169", longitude: "-46.8503" },
    // São Roque - CEP 18130-18139
    "18130": { latitude: "-23.5284", longitude: "-47.1367" },
    "18131": { latitude: "-23.5284", longitude: "-47.1367" },
    "18132": { latitude: "-23.5284", longitude: "-47.1367" },
    "18133": { latitude: "-23.5284", longitude: "-47.1367" },
    "18134": { latitude: "-23.5284", longitude: "-47.1367" },
    "18135": { latitude: "-23.5284", longitude: "-47.1367" }
  };
  return cepRanges[cepPrefix] || null;
}
function getSpecificCoordinatesForCEP(cep, city, state) {
  const specificCEPs = {
    // Carapicuíba - SP (montador)
    "06390180": { lat: -23.5225, lng: -46.8357 },
    // Serviços específicos da captura de tela
    "06865765": { lat: -23.7169, lng: -46.8503 },
    // Itapecerica da Serra - Jardim Horizonte Azul
    "18135510": { lat: -23.5284, lng: -47.1367 },
    // São Roque - Jardim Mosteiro
    "06243320": { lat: -23.5329, lng: -46.7918 },
    // Osasco - Jardim Elvira
    // Áreas gerais
    "06865000": { lat: -23.7167, lng: -46.85 },
    // Itapecerica da Serra geral
    "18135000": { lat: -23.528, lng: -47.136 },
    // São Roque geral
    "06243000": { lat: -23.5329, lng: -46.7918 }
    // Osasco geral
  };
  if (specificCEPs[cep]) {
    return {
      latitude: specificCEPs[cep].lat.toString(),
      longitude: specificCEPs[cep].lng.toString()
    };
  }
  const cityCoords = getCityCoordinates(city, state);
  const cepVariation = parseInt(cep.slice(-3)) / 1e4;
  const latVariation = (cepVariation - 0.05) * 0.01;
  const lngVariation = (cepVariation - 0.05) * 0.01;
  return {
    latitude: (cityCoords.lat + latVariation).toString(),
    longitude: (cityCoords.lng + lngVariation).toString()
  };
}
function getCityCoordinates(city, state) {
  const cityCoords = {
    // Capitais e principais cidades
    "S\xE3o Paulo-SP": { lat: -23.5505, lng: -46.6333 },
    "Rio de Janeiro-RJ": { lat: -22.9068, lng: -43.1729 },
    "Belo Horizonte-MG": { lat: -19.9191, lng: -43.9386 },
    "Bras\xEDlia-DF": { lat: -15.7801, lng: -47.9292 },
    "Salvador-BA": { lat: -12.9714, lng: -38.5014 },
    "Fortaleza-CE": { lat: -3.7319, lng: -38.5267 },
    "Recife-PE": { lat: -8.0476, lng: -34.877 },
    "Porto Alegre-RS": { lat: -30.0346, lng: -51.2177 },
    "Curitiba-PR": { lat: -25.4284, lng: -49.2733 },
    "Manaus-AM": { lat: -3.119, lng: -60.0217 },
    "Bel\xE9m-PA": { lat: -1.4558, lng: -48.5044 },
    "Goi\xE2nia-GO": { lat: -16.6869, lng: -49.2648 },
    "Campinas-SP": { lat: -22.9099, lng: -47.0626 },
    "S\xE3o Bernardo do Campo-SP": { lat: -23.6914, lng: -46.5646 },
    "Guarulhos-SP": { lat: -23.4538, lng: -46.5333 },
    "Nova Igua\xE7u-RJ": { lat: -22.7591, lng: -43.4509 },
    "S\xE3o Gon\xE7alo-RJ": { lat: -22.8267, lng: -43.0537 },
    "Duque de Caxias-RJ": { lat: -22.7856, lng: -43.3117 },
    "Natal-RN": { lat: -5.7945, lng: -35.211 },
    "Macei\xF3-AL": { lat: -9.6658, lng: -35.7353 },
    "Campo Grande-MS": { lat: -20.4697, lng: -54.6201 },
    "Jo\xE3o Pessoa-PB": { lat: -7.1195, lng: -34.845 },
    "Teresina-PI": { lat: -5.0892, lng: -42.8019 },
    "S\xE3o Lu\xEDs-MA": { lat: -2.5297, lng: -44.3028 },
    "Aracaju-SE": { lat: -10.9472, lng: -37.0731 },
    "Cuiab\xE1-MT": { lat: -15.6014, lng: -56.0979 },
    "Florian\xF3polis-SC": { lat: -27.5954, lng: -48.548 },
    "Vit\xF3ria-ES": { lat: -20.3155, lng: -40.3128 },
    "Palmas-TO": { lat: -10.1689, lng: -48.3317 },
    "Macap\xE1-AP": { lat: 0.0389, lng: -51.0664 },
    "Boa Vista-RR": { lat: 2.8235, lng: -60.6758 },
    "Rio Branco-AC": { lat: -9.9755, lng: -67.8243 }
  };
  const key = `${city}-${state}`;
  if (cityCoords[key]) {
    return cityCoords[key];
  }
  const stateCoords = {
    "AC": { lat: -8.77, lng: -70.55 },
    "AL": { lat: -9.71, lng: -35.73 },
    "AP": { lat: 1.41, lng: -51.77 },
    "AM": { lat: -3.07, lng: -61.66 },
    "BA": { lat: -12.96, lng: -38.51 },
    "CE": { lat: -3.71, lng: -38.54 },
    "DF": { lat: -15.83, lng: -47.86 },
    "ES": { lat: -19.19, lng: -40.34 },
    "GO": { lat: -16.64, lng: -49.31 },
    "MA": { lat: -2.55, lng: -44.3 },
    "MT": { lat: -12.64, lng: -55.42 },
    "MS": { lat: -20.51, lng: -54.54 },
    "MG": { lat: -18.1, lng: -44.38 },
    "PA": { lat: -5.53, lng: -52.29 },
    "PB": { lat: -7.06, lng: -35.55 },
    "PR": { lat: -24.89, lng: -51.55 },
    "PE": { lat: -8.28, lng: -35.07 },
    "PI": { lat: -8.28, lng: -45.24 },
    "RJ": { lat: -22.84, lng: -43.15 },
    "RN": { lat: -5.22, lng: -36.52 },
    "RS": { lat: -30.01, lng: -51.22 },
    "RO": { lat: -11.22, lng: -62.8 },
    "RR": { lat: 1.89, lng: -61.22 },
    "SC": { lat: -27.33, lng: -49.44 },
    "SP": { lat: -23.55, lng: -46.64 },
    "SE": { lat: -10.9, lng: -37.07 },
    "TO": { lat: -10.25, lng: -48.25 }
  };
  return stateCoords[state] || { lat: -14.235, lng: -51.9253 };
}
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
var init_geocoding = __esm({
  "server/geocoding.ts"() {
    "use strict";
  }
});

// server/utils/price-formatter.ts
var price_formatter_exports = {};
__export(price_formatter_exports, {
  ensureBrazilianFormat: () => ensureBrazilianFormat,
  formatToBrazilianPrice: () => formatToBrazilianPrice,
  isValidBrazilianPrice: () => isValidBrazilianPrice,
  parseBrazilianPrice: () => parseBrazilianPrice
});
function formatToBrazilianPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
function parseBrazilianPrice(brazilianPrice) {
  const cleaned = brazilianPrice.replace(/[^\d.,]/g, "");
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalized) || 0;
  }
  return parseFloat(cleaned) || 0;
}
function ensureBrazilianFormat(input) {
  if (typeof input === "number") {
    return formatToBrazilianPrice(input);
  }
  if (typeof input === "string" && input.includes(",")) {
    const parsed2 = parseBrazilianPrice(input);
    return formatToBrazilianPrice(parsed2);
  }
  const parsed = parseFloat(input) || 0;
  return formatToBrazilianPrice(parsed);
}
function isValidBrazilianPrice(price) {
  const brazilianPriceRegex = /^\d{1,3}(\.\d{3})*(,\d{2})?$/;
  return brazilianPriceRegex.test(price);
}
var init_price_formatter = __esm({
  "server/utils/price-formatter.ts"() {
    "use strict";
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  SERVICE_STATUS: () => SERVICE_STATUS,
  applications: () => applications,
  assemblers: () => assemblers,
  bankAccounts: () => bankAccounts,
  insertApplicationSchema: () => insertApplicationSchema,
  insertAssemblerSchema: () => insertAssemblerSchema,
  insertBankAccountSchema: () => insertBankAccountSchema,
  insertMessageReadSchema: () => insertMessageReadSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertRatingSchema: () => insertRatingSchema,
  insertServiceSchema: () => insertServiceSchema,
  insertStoreSchema: () => insertStoreSchema,
  insertUserSchema: () => insertUserSchema,
  messageReads: () => messageReads,
  messages: () => messages,
  ratings: () => ratings,
  services: () => services,
  stores: () => stores,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, jsonb, timestamp, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var SERVICE_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  userType: text("user_type").notNull(),
  // 'lojista' ou 'montador'
  profilePhotoUrl: text("profile_photo_url").notNull(),
  // URL da foto de perfil
  profileData: jsonb("profile_data"),
  // Dados adicionais específicos para cada tipo de usuário
  createdAt: timestamp("created_at").defaultNow()
});
var stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(),
  // 'cpf' ou 'cnpj'
  documentNumber: text("document_number").notNull(),
  cnpj: text("cnpj").notNull(),
  // Campo adicional encontrado no banco de dados
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  phone: text("phone"),
  logoUrl: text("logo_url").notNull(),
  materialTypes: jsonb("material_types")
  // ['marcenaria', 'plano-corte', 'fabrica']
});
var assemblers = pgTable("assemblers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: text("address").notNull(),
  addressNumber: text("address_number"),
  // Número do endereço
  neighborhood: text("neighborhood"),
  // Bairro
  cep: text("cep"),
  // CEP formatado
  city: text("city").notNull(),
  state: text("state").notNull(),
  specialties: jsonb("specialties"),
  // ['marcenaria', 'plano-corte', 'fabrica']
  technicalAssistance: boolean("technical_assistance").default(false),
  experience: text("experience"),
  workRadius: integer("work_radius").default(20),
  rating: integer("rating"),
  documents: jsonb("documents"),
  // URLs para documentos
  documentType: text("document_type"),
  // 'cpf' ou 'cnpj'
  documentNumber: text("document_number"),
  // CPF: XXX.XXX.XXX-XX ou CNPJ: XX.XXX.XXX/XXXX-XX
  // Documentos obrigatórios
  rgFrontUrl: text("rg_front_url").notNull(),
  // RG/CNH frente (obrigatório)
  rgBackUrl: text("rg_back_url").notNull(),
  // RG/CNH verso (obrigatório)
  proofOfAddressUrl: text("proof_of_address_url").notNull(),
  // Comprovante de residência (obrigatório)
  certificatesUrls: jsonb("certificates_urls"),
  // Certificados profissionais (opcional)
  // Novos campos para perfil completo
  experienceYears: integer("experience_years").default(0),
  // Anos de experiência numérico
  serviceTypes: jsonb("service_types"),
  // ['residencial', 'corporativo', 'lojas_parceiras']
  availability: jsonb("availability"),
  // { dias: ['seg', 'ter', ...], horarios: { inicio: '08:00', fim: '18:00' } }
  hasOwnTools: boolean("has_own_tools").default(true),
  // Se possui ferramentas próprias
  professionalDescription: text("professional_description")
  // Descrição profissional mais detalhada
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  // Cidade/UF
  address: text("address"),
  // Endereço (rua)
  addressNumber: text("address_number"),
  // Número do endereço
  cep: text("cep"),
  // CEP
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  startDate: timestamp("start_date").notNull(),
  // Data de início do serviço
  endDate: timestamp("end_date").notNull(),
  // Data de fim do serviço
  price: text("price").notNull(),
  status: text("status").notNull().default("open"),
  // 'open', 'in-progress', 'completed', 'cancelled'
  materialType: text("material_type").notNull(),
  projectFiles: jsonb("project_files").notNull(),
  // URLs para arquivos do projeto
  paymentReference: text("payment_reference"),
  // Referência do pagamento PIX
  paymentStatus: text("payment_status").default("pending"),
  // 'pending', 'proof_submitted', 'confirmed', 'rejected'
  paymentProof: text("payment_proof"),
  // Comprovante de pagamento enviado
  ratingRequired: boolean("rating_required").default(false),
  // true quando pagamento é confirmado e avaliação é obrigatória
  storeRatingCompleted: boolean("store_rating_completed").default(false),
  // true quando loja avaliou montador
  assemblerRatingCompleted: boolean("assembler_rating_completed").default(false),
  // true quando montador avaliou loja
  bothRatingsCompleted: boolean("both_ratings_completed").default(false),
  // true quando ambas avaliações foram feitas
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
  // Data de finalização do serviço
});
var applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  assemblerId: integer("assembler_id").notNull().references(() => assemblers.id),
  status: text("status").notNull().default("pending"),
  // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"),
  // 'text', 'payment_proof', 'payment_confirmation'
  sentAt: timestamp("sent_at").defaultNow()
});
var messageReads = pgTable("message_reads", {
  messageId: integer("message_id").notNull().references(() => messages.id),
  userId: integer("user_id").notNull().references(() => users.id),
  readAt: timestamp("read_at").defaultNow()
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.messageId, table.userId] })
  };
});
var ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => services.id),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  fromUserType: text("from_user_type").notNull(),
  // 'lojista' ou 'montador'
  toUserType: text("to_user_type").notNull(),
  // 'lojista' ou 'montador'
  rating: integer("rating").notNull(),
  // 1-5
  comment: text("comment"),
  emojiRating: text("emoji_rating"),
  // Emoji escolhido para feedback rápido
  punctualityRating: integer("punctuality_rating").default(5),
  // Avaliação de pontualidade (1-5)
  qualityRating: integer("quality_rating").default(5),
  // Avaliação de qualidade (1-5)
  complianceRating: integer("compliance_rating").default(5),
  // Avaliação de cumprimento de acordos (1-5)
  serviceRegion: varchar("service_region", { length: 255 }),
  // Região onde o serviço foi realizado
  isLatest: boolean("is_latest").default(false),
  // Marca se é a avaliação mais recente
  createdAt: timestamp("created_at").defaultNow()
});
var bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankName: text("bank_name").notNull(),
  accountType: text("account_type").notNull(),
  // 'corrente' ou 'poupança'
  accountNumber: text("account_number").notNull(),
  agency: text("agency").notNull(),
  holderName: text("holder_name").notNull(),
  holderDocumentType: text("holder_document_type").notNull(),
  // 'cpf' ou 'cnpj'
  holderDocumentNumber: text("holder_document_number").notNull(),
  pixKey: text("pix_key"),
  pixKeyType: text("pix_key_type"),
  // 'cpf', 'cnpj', 'email', 'telefone', 'aleatória'
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  userType: true,
  profilePhotoUrl: true,
  profileData: true
});
var validateDocumentNumber = (documentNumber, documentType) => {
  const cleanNumber = documentNumber.replace(/[^\d]/g, "");
  if (documentType === "cpf") {
    return cleanNumber.length === 11;
  } else if (documentType === "cnpj") {
    return cleanNumber.length === 14;
  }
  return false;
};
var insertStoreSchema = createInsertSchema(stores).refine(
  (data) => validateDocumentNumber(data.documentNumber, data.documentType),
  {
    message: "CPF deve ter 11 d\xEDgitos e CNPJ deve ter 14 d\xEDgitos",
    path: ["documentNumber"]
  }
);
var insertAssemblerSchema = createInsertSchema(assemblers).extend({
  documentType: z.enum(["cpf", "cnpj"]).optional(),
  documentNumber: z.string().optional()
}).refine(
  (data) => {
    if (data.documentType && data.documentNumber) {
      return validateDocumentNumber(data.documentNumber, data.documentType);
    }
    return true;
  },
  {
    message: "CPF deve ter 11 d\xEDgitos e CNPJ deve ter 14 d\xEDgitos",
    path: ["documentNumber"]
  }
);
var insertServiceSchema = createInsertSchema(services);
var insertApplicationSchema = createInsertSchema(applications);
var insertMessageSchema = createInsertSchema(messages);
var insertMessageReadSchema = createInsertSchema(messageReads);
var insertRatingSchema = createInsertSchema(ratings);
var insertBankAccountSchema = createInsertSchema(bankAccounts).refine(
  (data) => validateDocumentNumber(data.holderDocumentNumber, data.holderDocumentType),
  {
    message: "CPF deve ter 11 d\xEDgitos e CNPJ deve ter 14 d\xEDgitos",
    path: ["holderDocumentNumber"]
  }
);

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || "5432";
    return `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${port}/${PGDATABASE}`;
  }
  throw new Error(
    "Configura\xE7\xE3o do banco de dados n\xE3o encontrada. Defina DATABASE_URL ou as vari\xE1veis PGHOST, PGUSER, PGPASSWORD, PGDATABASE."
  );
};
var pool = new Pool({ connectionString: getDatabaseUrl() });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, not, desc, asc, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // Usuários
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  async updateUser(id, userData) {
    const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  // Lojas
  async getStoreByUserId(userId) {
    const [store] = await db.select().from(stores).where(eq(stores.userId, userId));
    return store;
  }
  async getStore(id) {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }
  async createStore(storeData) {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
  }
  async updateStore(id, storeData) {
    const [updatedStore] = await db.update(stores).set(storeData).where(eq(stores.id, id)).returning();
    return updatedStore;
  }
  // Montadores
  async getAssemblerByUserId(userId) {
    const [assembler] = await db.select().from(assemblers).where(eq(assemblers.userId, userId));
    return assembler;
  }
  async getAssemblerById(id) {
    const [assembler] = await db.select().from(assemblers).where(eq(assemblers.id, id));
    return assembler;
  }
  async createAssembler(assemblerData) {
    const [assembler] = await db.insert(assemblers).values(assemblerData).returning();
    return assembler;
  }
  async updateAssembler(id, assemblerData) {
    const [updatedAssembler] = await db.update(assemblers).set(assemblerData).where(eq(assemblers.id, id)).returning();
    return updatedAssembler;
  }
  // Serviços
  async getServiceById(id) {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
  async getServicesByStoreId(storeId, status) {
    let query = db.select().from(services).where(eq(services.storeId, storeId));
    if (status) {
      query = db.select().from(services).where(and(
        eq(services.storeId, storeId),
        eq(services.status, status)
      ));
    }
    const servicesList = await query.orderBy(desc(services.createdAt));
    const enhancedServices = await Promise.all(servicesList.map(async (service) => {
      const acceptedApplications = await db.select().from(applications).where(
        and(
          eq(applications.serviceId, service.id),
          eq(applications.status, "accepted")
        )
      );
      console.log(`[getServicesByStoreId] Servi\xE7o ID ${service.id} tem ${acceptedApplications.length} candidaturas aceitas`);
      if (acceptedApplications.length > 0) {
        const assemblerId = acceptedApplications[0].assemblerId;
        console.log(`[getServicesByStoreId] Buscando montador ID ${assemblerId}`);
        const assembler = await this.getAssemblerById(assemblerId);
        if (assembler) {
          console.log(`[getServicesByStoreId] Montador encontrado, user_id: ${assembler.userId}`);
          const userResult = await db.select({
            id: users.id,
            name: users.name,
            phone: users.phone,
            email: users.email,
            profilePhotoUrl: users.profilePhotoUrl
          }).from(users).where(eq(users.id, assembler.userId)).limit(1);
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
      return service;
    }));
    return enhancedServices;
  }
  async getAvailableServicesForAssembler(assembler) {
    try {
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
      }).from(services).leftJoin(stores, eq(services.storeId, stores.id)).where(eq(services.status, "open")).orderBy(desc(services.createdAt));
      console.log(`Encontrados ${servicesList.length} servi\xE7os no total`);
      const enhancedServices = await Promise.all(servicesList.map(async (result) => {
        const { services: service, stores: store } = result;
        let projectFiles = null;
        if (service.projectFiles) {
          try {
            if (typeof service.projectFiles === "string") {
              projectFiles = JSON.parse(service.projectFiles);
            } else {
              projectFiles = service.projectFiles;
            }
          } catch (error) {
            console.error(`Erro ao processar projectFiles para servi\xE7o ${service.id}:`, error);
          }
        }
        const storeNameFromDb = store?.name || "Loja n\xE3o especificada";
        console.log(`[DEBUG Storage] Servi\xE7o ID ${service.id}: store.name = "${store?.name}", storeName = "${storeNameFromDb}"`);
        return {
          ...service,
          projectFiles,
          storeName: storeNameFromDb,
          // Garantir que todos os campos estejam disponíveis
          description: service.description || "",
          materialType: service.materialType || "",
          address: service.address || "",
          addressNumber: service.addressNumber || "",
          cep: service.cep || ""
        };
      }));
      let filteredByDistance = enhancedServices;
      console.log("Mostrando todos os servi\xE7os dispon\xEDveis (filtro de dist\xE2ncia desabilitado)");
      if (assembler.specialties && Array.isArray(assembler.specialties) && assembler.specialties.length > 0) {
        const assemblerSpecialties = assembler.specialties;
        console.log(`Filtrando por especialidades do montador: ${assemblerSpecialties.join(", ")}`);
        console.log(`Retornando ${filteredByDistance.length} servi\xE7os dispon\xEDveis para o montador`);
        return filteredByDistance;
      }
      console.log(`Nenhuma especialidade definida para o montador, retornando ${filteredByDistance.length} servi\xE7os dispon\xEDveis`);
      return filteredByDistance;
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os dispon\xEDveis para montador:", error);
      return [];
    }
  }
  async createService(serviceData) {
    let finalServiceData = { ...serviceData };
    if ((!serviceData.latitude || !serviceData.longitude) && serviceData.cep) {
      try {
        const { geocodeFromCEP: geocodeFromCEP2 } = await Promise.resolve().then(() => (init_geocoding(), geocoding_exports));
        const coordinates = await geocodeFromCEP2(serviceData.cep);
        finalServiceData.latitude = coordinates.latitude;
        finalServiceData.longitude = coordinates.longitude;
      } catch (error) {
        console.error("Erro na geocodifica\xE7\xE3o:", error);
        throw new Error("N\xE3o foi poss\xEDvel obter coordenadas para o CEP fornecido");
      }
    }
    const [service] = await db.insert(services).values(finalServiceData).returning();
    return service;
  }
  async updateServiceStatus(id, status) {
    const [updatedService] = await db.update(services).set({ status }).where(eq(services.id, id)).returning();
    return updatedService;
  }
  async updateService(id, serviceData) {
    const [updatedService] = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
    return updatedService;
  }
  async deleteService(id) {
    const service = await this.getServiceById(id);
    if (!service) {
      throw new Error(`Servi\xE7o com ID ${id} n\xE3o encontrado`);
    }
    if (service.status === "in-progress" || service.status === "completed") {
      throw new Error(`N\xE3o \xE9 poss\xEDvel excluir um servi\xE7o que est\xE1 ${service.status === "in-progress" ? "em andamento" : "conclu\xEDdo"}`);
    }
    try {
      const deleteApplicationsResult = await db.delete(applications).where(eq(applications.serviceId, id));
      console.log(`Candidaturas exclu\xEDdas para o servi\xE7o ${id}`);
      const deleteMessagesResult = await db.delete(messages).where(eq(messages.serviceId, id));
      console.log(`Mensagens exclu\xEDdas para o servi\xE7o ${id}`);
      const deleteRatingsResult = await db.delete(ratings).where(eq(ratings.serviceId, id));
      console.log(`Avalia\xE7\xF5es exclu\xEDdas para o servi\xE7o ${id}`);
      const deleteServiceResult = await db.delete(services).where(eq(services.id, id));
      console.log(`Servi\xE7o ID ${id} exclu\xEDdo com sucesso junto com seus relacionamentos`);
    } catch (error) {
      console.error(`Erro ao excluir servi\xE7o ID ${id}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(`Erro ao excluir servi\xE7o: ${errorMessage}`);
    }
  }
  // Candidaturas
  async getApplicationById(id) {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application;
  }
  async getApplicationByServiceAndAssembler(serviceId, assemblerId) {
    const [application] = await db.select().from(applications).where(
      and(
        eq(applications.serviceId, serviceId),
        eq(applications.assemblerId, assemblerId)
      )
    );
    return application;
  }
  async getApplicationsByServiceId(serviceId) {
    return await db.select().from(applications).where(eq(applications.serviceId, serviceId)).orderBy(asc(applications.createdAt));
  }
  async createApplication(applicationData) {
    const [application] = await db.insert(applications).values(applicationData).returning();
    return application;
  }
  async acceptApplication(id, serviceId) {
    await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, id));
    await db.update(applications).set({ status: "rejected" }).where(
      and(
        eq(applications.serviceId, serviceId),
        not(eq(applications.id, id))
      )
    );
  }
  // Mensagens
  async getMessagesByServiceId(serviceId) {
    return await db.select().from(messages).where(eq(messages.serviceId, serviceId)).orderBy(asc(messages.sentAt));
  }
  // Novo método para buscar mensagens entre um lojista e um montador específico
  async getMessagesBetweenStoreAndAssembler(serviceId, assemblerId) {
    const assembler = await this.getAssemblerById(assemblerId);
    if (!assembler) {
      return [];
    }
    const service = await this.getServiceById(serviceId);
    if (!service) {
      return [];
    }
    const store = await this.getStore(service.storeId);
    if (!store) {
      return [];
    }
    return await db.select().from(messages).where(
      and(
        eq(messages.serviceId, serviceId),
        or(
          eq(messages.senderId, store.userId),
          eq(messages.senderId, assembler.userId)
        )
      )
    ).orderBy(asc(messages.sentAt));
  }
  async createMessage(messageData) {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }
  async markMessagesAsRead(serviceId, userId) {
    const serviceMessages = await db.select().from(messages).where(eq(messages.serviceId, serviceId));
    const otherUserMessages = serviceMessages.filter((msg) => msg.senderId !== userId);
    for (const msg of otherUserMessages) {
      const existingRead = await db.select().from(messageReads).where(
        and(
          eq(messageReads.messageId, msg.id),
          eq(messageReads.userId, userId)
        )
      );
      if (existingRead.length === 0) {
        await db.insert(messageReads).values({
          messageId: msg.id,
          userId,
          readAt: /* @__PURE__ */ new Date()
        });
      }
    }
  }
  async getUnreadMessageCountForService(serviceId, userId) {
    const allMessages = await db.select().from(messages).where(
      and(
        eq(messages.serviceId, serviceId),
        not(eq(messages.senderId, userId))
        // Apenas mensagens não enviadas pelo usuário
      )
    );
    let unreadCount = 0;
    for (const msg of allMessages) {
      const readRecord = await db.select().from(messageReads).where(
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
  async hasUnreadMessages(serviceId, userId) {
    const unreadCount = await this.getUnreadMessageCountForService(serviceId, userId);
    return unreadCount > 0;
  }
  async getTotalUnreadMessageCount(userId) {
    let userServiceIds = [];
    if (await this.getStoreByUserId(userId)) {
      const store = await this.getStoreByUserId(userId);
      if (store) {
        const storeServices = await this.getServicesByStoreId(store.id);
        userServiceIds = storeServices.map((s) => s.id);
      }
    } else if (await this.getAssemblerByUserId(userId)) {
      const assembler = await this.getAssemblerByUserId(userId);
      if (assembler) {
        const assemblerApplications = await db.select({ serviceId: applications.serviceId }).from(applications).where(eq(applications.assemblerId, assembler.id));
        userServiceIds = assemblerApplications.map((app2) => app2.serviceId);
      }
    }
    let totalUnread = 0;
    for (const serviceId of userServiceIds) {
      const unreadCount = await this.getUnreadMessageCountForService(serviceId, userId);
      totalUnread += unreadCount;
    }
    return totalUnread;
  }
  // Método para tentar deletar uma mensagem - agora sempre retorna false para preservar o histórico completo
  async deleteMessage(messageId, userId) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (message) {
      console.log(`Tentativa de excluir mensagem ${messageId} foi bloqueada. Preserva\xE7\xE3o do hist\xF3rico completo.`);
    }
    return false;
  }
  // Avaliações
  async getRatingByServiceIdAndUser(serviceId, fromUserId, toUserId) {
    const [rating] = await db.select().from(ratings).where(
      and(
        eq(ratings.serviceId, serviceId),
        eq(ratings.fromUserId, fromUserId),
        eq(ratings.toUserId, toUserId)
      )
    );
    return rating;
  }
  async getRatingsByServiceId(serviceId) {
    return await db.select().from(ratings).where(eq(ratings.serviceId, serviceId)).orderBy(desc(ratings.createdAt));
  }
  async createRating(ratingData) {
    const [rating] = await db.insert(ratings).values(ratingData).returning();
    return rating;
  }
  // Obter a média de avaliações recebidas por um usuário
  async getAverageRatingForUser(userId) {
    try {
      const userRatings = await db.select().from(ratings).where(eq(ratings.toUserId, userId));
      if (userRatings.length === 0) {
        return 0;
      }
      const sum = userRatings.reduce((acc, rating) => acc + rating.rating, 0);
      const avg = sum / userRatings.length;
      return parseFloat(avg.toFixed(1));
    } catch (error) {
      console.error("Erro ao calcular m\xE9dia de avalia\xE7\xF5es:", error);
      return 0;
    }
  }
  // Informações bancárias
  async getBankAccountsByUserId(userId) {
    return await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(desc(bankAccounts.createdAt));
  }
  async getBankAccountById(id) {
    const [bankAccount] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return bankAccount;
  }
  async createBankAccount(bankAccountData) {
    const [bankAccount] = await db.insert(bankAccounts).values(bankAccountData).returning();
    return bankAccount;
  }
  async updateBankAccount(id, bankAccountData) {
    const [updatedBankAccount] = await db.update(bankAccounts).set(bankAccountData).where(eq(bankAccounts.id, id)).returning();
    return updatedBankAccount;
  }
  async deleteBankAccount(id) {
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "amigo-montador-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 1 semana
      secure: process.env.NODE_ENV === "production"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Tentativa de login com username:", username);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log("Usu\xE1rio n\xE3o encontrado");
          return done(null, false);
        }
        const validPassword = await comparePasswords(password, user.password);
        if (!validPassword) {
          console.log("Senha incorreta");
          return done(null, false);
        }
        console.log("Login bem-sucedido para:", username);
        return done(null, user);
      } catch (error) {
        console.error("Erro no login:", error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      console.log("=== IN\xCDCIO DO REGISTRO ===");
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Usu\xE1rio j\xE1 existe:", req.body.username);
        return res.status(400).json({ message: "Usu\xE1rio j\xE1 existe" });
      }
      const hashedPassword = await hashPassword(req.body.password);
      if (!req.files || !req.files.profilePicture) {
        return res.status(400).json({ message: "Foto de perfil \xE9 obrigat\xF3ria" });
      }
      const profileFile = req.files.profilePicture;
      if (!profileFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
      }
      if (profileFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${profileFile.name}`;
      const profileUploadsDir = path.join(process.cwd(), "uploads", "profiles");
      if (!fs.existsSync(profileUploadsDir)) {
        fs.mkdirSync(profileUploadsDir, { recursive: true });
      }
      const uploadPath = path.join(profileUploadsDir, fileName);
      await profileFile.mv(uploadPath);
      const profilePhotoUrl = `/uploads/profiles/${fileName}`;
      let logoUrl = "";
      if (req.body.userType === "lojista") {
        if (!req.files || !req.files.logoFile) {
          return res.status(400).json({ message: "Logo da loja \xE9 obrigat\xF3rio" });
        }
        const logoFile = req.files.logoFile;
        if (!logoFile.mimetype.startsWith("image/")) {
          return res.status(400).json({ message: "O logo deve ser uma imagem" });
        }
        if (logoFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({ message: "O logo deve ter menos de 10MB" });
        }
        const logoFileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${logoFile.name}`;
        const logoUploadsDir = path.join(process.cwd(), "uploads", "logos");
        if (!fs.existsSync(logoUploadsDir)) {
          fs.mkdirSync(logoUploadsDir, { recursive: true });
        }
        const logoUploadPath = path.join(logoUploadsDir, logoFileName);
        await logoFile.mv(logoUploadPath);
        logoUrl = `/uploads/logos/${logoFileName}`;
      }
      const { userType } = req.body;
      let userId, user;
      user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        profilePhotoUrl
      });
      userId = user.id;
      if (userType === "lojista") {
        console.log("Criando dados da loja...");
        const storeData = {
          userId,
          name: req.body.storeName,
          documentType: req.body.documentType,
          documentNumber: req.body.documentNumber,
          // Adiciona CNPJ se o documento for do tipo CNPJ, caso contrário, usa o documentNumber
          cnpj: req.body.documentType === "cnpj" ? req.body.documentNumber : req.body.documentNumber,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          phone: req.body.storePhone,
          logoUrl,
          materialTypes: req.body.materialTypes || []
        };
        await storage.createStore(storeData);
        console.log("Loja criada com sucesso");
        console.log("Verificando dados banc\xE1rios para lojista...");
        console.log("bankName:", req.body.bankName);
        console.log("accountNumber:", req.body.accountNumber);
        if (req.body.bankName && req.body.accountNumber) {
          console.log("Criando conta banc\xE1ria para lojista...");
          const bankAccountData = {
            userId,
            bankName: req.body.bankName,
            accountType: req.body.accountType,
            accountNumber: req.body.accountNumber,
            agency: req.body.agency,
            holderName: req.body.holderName,
            holderDocumentType: req.body.holderDocumentType,
            holderDocumentNumber: req.body.holderDocumentNumber,
            pixKey: req.body.pixKey || null,
            pixKeyType: req.body.pixKeyType || null
          };
          console.log("Dados banc\xE1rios do lojista a serem criados:", bankAccountData);
          await storage.createBankAccount(bankAccountData);
          console.log("Conta banc\xE1ria do lojista criada com sucesso");
        } else {
          console.log("Dados banc\xE1rios do lojista n\xE3o fornecidos - pulando cria\xE7\xE3o da conta banc\xE1ria");
        }
      } else if (userType === "montador") {
        console.log("Criando dados do montador...");
        const assemblerData = {
          userId,
          address: req.body.address,
          addressNumber: req.body.addressNumber,
          neighborhood: req.body.neighborhood,
          cep: req.body.cep,
          city: req.body.city,
          state: req.body.state,
          specialties: req.body.specialties || [],
          technicalAssistance: req.body.technicalAssistance || false,
          experience: req.body.experience || "",
          workRadius: req.body.radius || 20,
          rating: 0,
          documents: req.body.documents || {},
          documentType: req.body.documentType || "cpf",
          documentNumber: req.body.documentNumber || "",
          // Documentos obrigatórios
          rgFrontUrl: req.body.rgFrontUrl || "/placeholder-document.pdf",
          rgBackUrl: req.body.rgBackUrl || "/placeholder-document.pdf",
          proofOfAddressUrl: req.body.proofOfAddressUrl || "/placeholder-document.pdf",
          certificatesUrls: req.body.certificatesUrls || null
        };
        console.log("Dados do montador a serem criados:", assemblerData);
        await storage.createAssembler(assemblerData);
        console.log("Montador criado com sucesso");
        console.log("Verificando dados banc\xE1rios...");
        console.log("bankName:", req.body.bankName);
        console.log("accountNumber:", req.body.accountNumber);
        if (req.body.bankName && req.body.accountNumber) {
          console.log("Criando conta banc\xE1ria...");
          const bankAccountData = {
            userId,
            bankName: req.body.bankName,
            accountType: req.body.accountType,
            accountNumber: req.body.accountNumber,
            agency: req.body.agency,
            holderName: req.body.holderName,
            holderDocumentType: req.body.holderDocumentType,
            holderDocumentNumber: req.body.holderDocumentNumber,
            pixKey: req.body.pixKey || null,
            pixKeyType: req.body.pixKeyType || null
          };
          console.log("Dados banc\xE1rios a serem criados:", bankAccountData);
          await storage.createBankAccount(bankAccountData);
          console.log("Conta banc\xE1ria criada com sucesso");
        } else {
          console.log("Dados banc\xE1rios n\xE3o fornecidos - pulando cria\xE7\xE3o da conta banc\xE1ria");
        }
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      return res.status(500).json({ message: "Erro ao registrar usu\xE1rio" });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      req.login(user, (err2) => {
        if (err2) {
          return next(err2);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import { eq as eq2, and as and2, sql as sql2, inArray as inArray2, desc as desc2 } from "drizzle-orm";
init_geocoding();
import { WebSocketServer, WebSocket } from "ws";
import fs2 from "fs";
import path2 from "path";
import fileUpload from "express-fileupload";
import axios2 from "axios";
function generatePaymentProofImage(data) {
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
        SERVI\xC7O:
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
        REFER\xCANCIA:
      </text>
      <text x="40" y="340" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">
        ${data.reference || "N/A"}
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
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
async function registerRoutes(app2) {
  app2.use((req, res, next) => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  app2.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: "/tmp/"
  }));
  app2.use("/uploads", express.static(path2.join(process.cwd(), "uploads")));
  const projectUploadsDir = path2.join(process.cwd(), "uploads", "projects");
  if (!fs2.existsSync(projectUploadsDir)) {
    fs2.mkdirSync(projectUploadsDir, { recursive: true });
  }
  setupAuth(app2);
  app2.get("/api/services", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { status, userType } = req.query;
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Buscando servi\xE7os para usu\xE1rio tipo: ${req.user?.userType}`);
      let servicesList = [];
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store) {
          return res.status(404).json({ message: "Loja n\xE3o encontrada" });
        }
        console.log(`Buscando servi\xE7os para o lojista (store_id: ${store.id})`);
        servicesList = await storage.getServicesByStoreId(store.id, status);
      } else if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (!assembler) {
          return res.status(404).json({ message: "Montador n\xE3o encontrado" });
        }
        console.log(`Buscando servi\xE7os dispon\xEDveis para o montador (id: ${assembler.id})`);
        servicesList = await storage.getAvailableServicesForAssembler(assembler);
        const assemblerApplications = await db.select().from(applications).where(eq2(applications.assemblerId, assembler.id));
        servicesList = servicesList.map((service) => {
          const application = assemblerApplications.find((app3) => app3.serviceId === service.id);
          return {
            ...service,
            applicationStatus: application ? application.status : null,
            hasApplied: !!application
          };
        });
      } else {
        return res.status(403).json({ message: "Tipo de usu\xE1rio n\xE3o autorizado" });
      }
      if (!Array.isArray(servicesList)) {
        servicesList = [];
      }
      console.log(`Encontrados ${servicesList.length} servi\xE7os para o usu\xE1rio tipo: ${req.user?.userType}`);
      if (req.user?.userType === "montador" && servicesList.length > 0) {
        console.log("Dados completos do primeiro servi\xE7o:", JSON.stringify(servicesList[0], null, 2));
      }
      if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        const formattedServices = await Promise.all(servicesList.map(async (service) => {
          let calculatedDistance = "Dist\xE2ncia n\xE3o calculada";
          if (assembler && assembler.cep && service.cep) {
            try {
              console.log(`[DEBUG] Calculando dist\xE2ncia: Montador CEP ${assembler.cep} -> Servi\xE7o CEP ${service.cep}`);
              const assemblerCoords = await geocodeFromCEP(assembler.cep);
              console.log(`[DEBUG] Coordenadas do montador:`, assemblerCoords);
              const serviceCoords = await geocodeFromCEP(service.cep);
              console.log(`[DEBUG] Coordenadas do servi\xE7o:`, serviceCoords);
              const distance = calculateDistance(
                parseFloat(assemblerCoords.latitude),
                parseFloat(assemblerCoords.longitude),
                parseFloat(serviceCoords.latitude),
                parseFloat(serviceCoords.longitude)
              );
              console.log(`[DEBUG] Dist\xE2ncia calculada: ${distance} km`);
              if (distance < 1) {
                calculatedDistance = `${(distance * 1e3).toFixed(0)}m`;
              } else {
                calculatedDistance = `${distance.toFixed(1)} km`;
              }
            } catch (error) {
              console.error(`Erro ao calcular dist\xE2ncia para servi\xE7o ${service.id}:`, error);
              if (assembler.city && assembler.state && service.location) {
                try {
                  const assemblerCityCoords = getCityCoordinates(assembler.city, assembler.state);
                  const locationParts = service.location.split(",");
                  if (locationParts.length >= 2) {
                    const serviceCity = locationParts[0].trim();
                    const serviceState = locationParts[1].trim();
                    const serviceCityCoords = getCityCoordinates(serviceCity, serviceState);
                    const distance = calculateDistance(
                      assemblerCityCoords.lat,
                      assemblerCityCoords.lng,
                      serviceCityCoords.lat,
                      serviceCityCoords.lng
                    );
                    calculatedDistance = `~${distance.toFixed(1)} km`;
                  }
                } catch (fallbackError) {
                  console.error(`Erro no fallback de dist\xE2ncia para servi\xE7o ${service.id}:`, fallbackError);
                  calculatedDistance = "Dist\xE2ncia n\xE3o dispon\xEDvel";
                }
              }
            }
          }
          let fullAddress = service.location || "Localiza\xE7\xE3o n\xE3o especificada";
          if (service.address && service.addressNumber) {
            fullAddress = `${service.address}, ${service.addressNumber} - ${service.location}`;
            if (service.cep) {
              fullAddress += ` - CEP: ${service.cep}`;
            }
          }
          let projectFiles = [];
          if (service.projectFiles) {
            try {
              if (typeof service.projectFiles === "string") {
                projectFiles = JSON.parse(service.projectFiles);
              } else if (Array.isArray(service.projectFiles)) {
                projectFiles = service.projectFiles;
              }
            } catch (error) {
              console.error(`Erro ao processar projectFiles para servi\xE7o ${service.id}:`, error);
              projectFiles = [];
            }
          }
          const serviceWithStore = service;
          const storeName = serviceWithStore.storeName || "Loja n\xE3o especificada";
          console.log(`[DEBUG] Servi\xE7o ${service.id}: storeName = "${storeName}"`);
          const serviceWithApp = service;
          let hasChatMessages = false;
          try {
            const chatMessages = await db.select({ id: messages.id }).from(messages).where(eq2(messages.serviceId, service.id)).limit(1);
            hasChatMessages = chatMessages.length > 0;
          } catch (error) {
            console.error(`Erro ao verificar mensagens do chat para servi\xE7o ${service.id}:`, error);
            hasChatMessages = false;
          }
          return {
            id: service.id,
            title: service.title,
            description: service.description || "",
            location: fullAddress,
            address: service.address || "",
            addressNumber: service.addressNumber || "",
            cep: service.cep || "",
            distance: calculatedDistance,
            date: service.startDate && service.endDate ? `${service.startDate.toISOString().split("T")[0]} - ${service.endDate.toISOString().split("T")[0]}` : "Data n\xE3o especificada",
            startDate: service.startDate ? service.startDate.toISOString() : null,
            endDate: service.endDate ? service.endDate.toISOString() : null,
            price: service.price || "Pre\xE7o n\xE3o informado",
            store: storeName,
            type: service.materialType || "Material n\xE3o especificado",
            status: service.status,
            projectFiles,
            applicationStatus: service.applicationStatus || null,
            hasApplied: service.hasApplied || false,
            hasChatMessages
          };
        }));
        console.log(`[DEBUG] Dados formatados para o frontend:`, JSON.stringify(formattedServices, null, 2));
        res.json(formattedServices);
      } else {
        const formattedServices = servicesList.map((service) => {
          let projectFiles = [];
          if (service.projectFiles) {
            try {
              if (typeof service.projectFiles === "string") {
                projectFiles = JSON.parse(service.projectFiles);
              } else if (Array.isArray(service.projectFiles)) {
                projectFiles = service.projectFiles;
              }
            } catch (error) {
              console.error(`Erro ao processar projectFiles para servi\xE7o ${service.id}:`, error);
              projectFiles = [];
            }
          }
          return {
            ...service,
            startDate: service.startDate ? service.startDate.toISOString() : null,
            endDate: service.endDate ? service.endDate.toISOString() : null,
            projectFiles
          };
        });
        res.json(formattedServices);
      }
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os:", error);
      res.status(500).json({ message: "Erro ao buscar servi\xE7os" });
    }
  });
  app2.get("/api/services/active", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "montador") {
        return res.status(403).json({ message: "Acesso permitido apenas para montadores" });
      }
      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Montador n\xE3o encontrado" });
      }
      console.log("Buscando servi\xE7os ativos para o montador id:", assembler.id);
      const allApplications = await db.select().from(applications).where(eq2(applications.assemblerId, assembler.id));
      console.log(`Encontradas ${allApplications.length} candidaturas para o montador`);
      const serviceIdsFromApplications = allApplications.map((app3) => app3.serviceId);
      const messageServices = await db.select({
        serviceId: messages.serviceId
      }).from(messages).where(eq2(messages.senderId, req.user.id));
      const serviceIdsFromMessages = messageServices.map((msg) => msg.serviceId);
      const allServiceIds = [];
      serviceIdsFromApplications.forEach((id) => {
        if (!allServiceIds.includes(id)) {
          allServiceIds.push(id);
        }
      });
      serviceIdsFromMessages.forEach((id) => {
        if (!allServiceIds.includes(id)) {
          allServiceIds.push(id);
        }
      });
      if (allServiceIds.length === 0) {
        console.log("Nenhum servi\xE7o ativo encontrado para o montador");
        return res.json([]);
      }
      console.log(`Total de ${allServiceIds.length} servi\xE7os ativos (candidaturas + mensagens)`);
      const servicesResult = await db.select({
        id: services.id,
        title: services.title,
        description: services.description,
        location: services.location,
        startDate: services.startDate,
        endDate: services.endDate,
        price: services.price,
        status: services.status,
        storeId: services.storeId
      }).from(services);
      const filteredServices = servicesResult.filter(
        (service) => allServiceIds.includes(service.id) && (service.status === "in-progress" || service.status === "completed")
      );
      console.log(`Encontrados ${filteredServices.length} servi\xE7os ativos para o montador (incluindo conclu\xEDdos)`);
      const enhancedServices = await Promise.all(filteredServices.map(async (service) => {
        const storeResult = await db.select({
          id: stores.id,
          name: stores.name,
          logoUrl: stores.logoUrl,
          userId: stores.userId
        }).from(stores).where(eq2(stores.id, service.storeId)).limit(1);
        let storeUserData = null;
        if (storeResult.length > 0 && storeResult[0].userId) {
          const userResult = await db.select({
            id: users.id,
            name: users.name,
            profilePhotoUrl: users.profilePhotoUrl
          }).from(users).where(eq2(users.id, storeResult[0].userId)).limit(1);
          if (userResult.length > 0) {
            storeUserData = userResult[0];
          }
        }
        const application = allApplications.find((app3) => app3.serviceId === service.id);
        const hasUnreadMessages = await storage.hasUnreadMessages(service.id, req.user.id);
        const hasRated = await db.select().from(ratings).where(
          and2(
            eq2(ratings.serviceId, service.id),
            eq2(ratings.fromUserId, req.user.id),
            eq2(ratings.fromUserType, "montador")
          )
        ).limit(1);
        console.log(`[DEBUG] Service ${service.id} (${service.title}) - User ${req.user.id} rated: ${hasRated.length > 0}`);
        return {
          ...service,
          store: storeResult.length > 0 ? {
            ...storeResult[0],
            user: storeUserData ? {
              id: storeUserData.id,
              name: storeUserData.name,
              photoUrl: storeUserData.profilePhotoUrl
            } : null
          } : null,
          applicationStatus: application ? application.status : null,
          hasAcceptedApplication: application ? application.status === "accepted" : false,
          hasUnreadMessages,
          rated: hasRated.length > 0
        };
      }));
      res.json(enhancedServices);
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os ativos:", error);
      res.status(500).json({ message: "Erro ao buscar servi\xE7os ativos" });
    }
  });
  app2.get("/api/store/services/with-messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem acessar esta rota" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja n\xE3o encontrada" });
      }
      const baseServicesWithMessages = await db.select({
        serviceId: services.id,
        serviceTitle: services.title,
        serviceStatus: services.status,
        servicePrice: services.price,
        serviceLocation: services.location,
        serviceDescription: services.description,
        messageCount: sql2`COUNT(DISTINCT ${messages.id})`,
        lastMessageAt: sql2`MAX(${messages.sentAt})`
      }).from(services).innerJoin(messages, eq2(messages.serviceId, services.id)).where(eq2(services.storeId, store.id)).groupBy(
        services.id,
        services.title,
        services.status,
        services.price,
        services.location,
        services.description
      ).orderBy(sql2`MAX(${messages.sentAt}) DESC`);
      const servicesWithMessages = await Promise.all(
        baseServicesWithMessages.map(async (service) => {
          let application = await db.select({
            assemblerId: applications.assemblerId,
            assemblerUserId: users.id,
            assemblerName: users.name,
            applicationStatus: applications.status
          }).from(applications).leftJoin(assemblers, eq2(assemblers.id, applications.assemblerId)).leftJoin(users, eq2(users.id, assemblers.userId)).where(and2(
            eq2(applications.serviceId, service.serviceId),
            eq2(applications.status, "accepted")
          )).limit(1);
          if (!application || application.length === 0) {
            const messagesFromAssemblers = await db.select({
              senderId: messages.senderId,
              assemblerUserId: users.id,
              assemblerName: users.name
            }).from(messages).leftJoin(users, eq2(users.id, messages.senderId)).where(and2(
              eq2(messages.serviceId, service.serviceId),
              eq2(users.userType, "montador")
            )).limit(1);
            if (messagesFromAssemblers && messagesFromAssemblers.length > 0) {
              const assemblerData = await db.select({
                assemblerId: assemblers.id,
                assemblerUserId: assemblers.userId,
                assemblerName: users.name
              }).from(assemblers).leftJoin(users, eq2(users.id, assemblers.userId)).where(eq2(assemblers.userId, messagesFromAssemblers[0].senderId)).limit(1);
              if (assemblerData && assemblerData.length > 0) {
                application = [{
                  assemblerId: assemblerData[0].assemblerId,
                  assemblerUserId: assemblerData[0].assemblerUserId,
                  assemblerName: assemblerData[0].assemblerName,
                  applicationStatus: "pending"
                }];
              }
            }
          }
          return {
            ...service,
            assemblerId: application?.[0]?.assemblerId || null,
            assemblerUserId: application?.[0]?.assemblerUserId || null,
            assemblerName: application?.[0]?.assemblerName || null,
            applicationStatus: application?.[0]?.applicationStatus || null
          };
        })
      );
      const formattedServices = servicesWithMessages.map((service) => ({
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
        hasConversation: true
        // Garantir que sempre tenha conversa disponível
      }));
      console.log(`[API] Encontrados ${formattedServices.length} servi\xE7os com mensagens para a loja ${store.id}`);
      res.json(formattedServices);
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os com mensagens:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/store/services/with-pending-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Acesso permitido apenas para lojistas" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja n\xE3o encontrada" });
      }
      const storeServices = await storage.getServicesByStoreId(store.id, "open");
      const servicesWithPendingApplications = [];
      for (const service of storeServices) {
        try {
          const allApplications = await storage.getApplicationsByServiceId(service.id);
          const pendingApplications = allApplications.filter((app3) => app3.status === "pending");
          if (pendingApplications.length > 0) {
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
                      name: assemblerUser?.name || "Montador",
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
            servicesWithPendingApplications.push({
              ...service,
              pendingApplications: applicationsWithDetails
            });
          }
        } catch (serviceError) {
          console.error(`Erro ao processar servi\xE7o ${service.id}:`, serviceError);
        }
      }
      res.json(servicesWithPendingApplications);
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os com candidaturas pendentes:", error);
      res.status(500).json({ message: "Erro ao buscar servi\xE7os com candidaturas pendentes" });
    }
  });
  app2.get("/api/store/services/with-applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Acesso permitido apenas para lojistas" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja n\xE3o encontrada" });
      }
      const inProgressServices = await storage.getServicesByStoreId(store.id, "in-progress");
      const completedServices = await storage.getServicesByStoreId(store.id, "completed");
      const storeServices = [...inProgressServices, ...completedServices];
      const servicesWithApplication = [];
      for (const service of storeServices) {
        try {
          const allApplications = await storage.getApplicationsByServiceId(service.id);
          const acceptedApplications = allApplications.filter((app3) => app3.status === "accepted");
          if (acceptedApplications.length > 0) {
            const application = acceptedApplications[0];
            const assembler = await storage.getAssemblerById(application.assemblerId);
            if (assembler) {
              const assemblerUser = await storage.getUser(assembler.userId);
              if (assemblerUser) {
                const hasNewMessages = await storage.hasUnreadMessages(service.id, req.user.id);
                servicesWithApplication.push({
                  ...service,
                  assembler: {
                    id: assembler.id,
                    name: assemblerUser.name,
                    userId: assembler.userId
                  },
                  hasNewMessages
                });
              } else {
                servicesWithApplication.push(service);
              }
            } else {
              servicesWithApplication.push(service);
            }
          } else {
          }
        } catch (serviceError) {
          console.error(`Erro ao processar servi\xE7o ${service.id}:`, serviceError);
          servicesWithApplication.push(service);
        }
      }
      res.json(servicesWithApplication);
    } catch (error) {
      console.error("Erro ao buscar servi\xE7os com candidaturas:", error);
      res.status(500).json({ message: "Erro ao buscar servi\xE7os com candidaturas" });
    }
  });
  app2.post("/api/services", async (req, res) => {
    try {
      console.log("Corpo da requisi\xE7\xE3o recebido:", req.body);
      console.log("Tipo do conte\xFAdo:", req.headers["content-type"]);
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem criar servi\xE7os" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja n\xE3o encontrada" });
      }
      const { ensureBrazilianFormat: ensureBrazilianFormat2 } = await Promise.resolve().then(() => (init_price_formatter(), price_formatter_exports));
      let serviceData = { ...req.body };
      if (serviceData.date) {
        try {
          const dateRange = serviceData.date.split(" - ");
          if (dateRange.length === 2) {
            serviceData.startDate = new Date(dateRange[0]);
            serviceData.endDate = new Date(dateRange[1]);
          } else {
            serviceData.startDate = new Date(serviceData.date);
            serviceData.endDate = new Date(serviceData.date);
          }
        } catch (error) {
          return res.status(400).json({ message: "Formato de data inv\xE1lido" });
        }
        delete serviceData.date;
      }
      if (serviceData.price) {
        serviceData.price = ensureBrazilianFormat2(serviceData.price);
      }
      serviceData = {
        ...serviceData,
        storeId: store.id,
        status: "open",
        createdAt: /* @__PURE__ */ new Date()
      };
      Object.keys(serviceData).forEach((key) => {
        if (serviceData[key] === "") {
          serviceData[key] = null;
        }
      });
      const requiredFields = {
        title: "T\xEDtulo do Servi\xE7o",
        location: "Cidade/UF",
        startDate: "Data de In\xEDcio",
        endDate: "Data de Fim",
        price: "Valor",
        materialType: "Material"
      };
      console.log("Dados do servi\xE7o recebidos no servidor:", serviceData);
      const missingFields = [];
      for (const [field, label] of Object.entries(requiredFields)) {
        const value = serviceData[field];
        if (value === null || value === void 0 || value === "") {
          missingFields.push(label);
          console.log(`Campo '${field}' faltando. Valor atual: [${value}] (${typeof value})`);
        } else {
          console.log(`Campo '${field}' validado. Valor: [${value}] (${typeof value})`);
        }
      }
      console.log("Campos faltantes:", missingFields);
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Por favor, preencha os seguintes campos: ${missingFields.join(", ")}.`,
          missingFields
        });
      }
      const newService = await storage.createService(serviceData);
      res.status(201).json(newService);
    } catch (error) {
      console.error("Erro ao criar servi\xE7o:", error);
      if (error.code === "23502") {
        const column = error.column;
        let fieldName = column === "title" ? "T\xEDtulo do Servi\xE7o" : column === "location" ? "Cidade/UF" : column === "start_date" ? "Data de In\xEDcio" : column === "end_date" ? "Data de Fim" : column === "price" ? "Valor" : column === "material_type" ? "Material" : column;
        return res.status(400).json({
          message: `Por favor, preencha o campo: ${fieldName}.`,
          field: column,
          missingFields: [fieldName]
        });
      }
      res.status(500).json({ message: "Erro ao criar servi\xE7o: " + (error.message || error) });
    }
  });
  app2.post("/api/services/with-files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem criar servi\xE7os" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store) {
        return res.status(404).json({ message: "Loja n\xE3o encontrada" });
      }
      if (!req.files || !req.files.projectFiles) {
        return res.status(400).json({ message: "Nenhum arquivo de projeto enviado" });
      }
      if (!req.body.serviceData) {
        return res.status(400).json({ message: "Dados do servi\xE7o n\xE3o enviados" });
      }
      let serviceData;
      try {
        serviceData = JSON.parse(req.body.serviceData);
      } catch (error) {
        return res.status(400).json({ message: "Formato inv\xE1lido dos dados do servi\xE7o" });
      }
      console.log("DEBUG: Verificando campo date em serviceData:", !!serviceData.date);
      console.log("DEBUG: Valor do campo date:", serviceData.date);
      console.log("DEBUG: Todas as chaves de serviceData:", Object.keys(serviceData));
      console.log("DEBUG: serviceData completo:", serviceData);
      if (serviceData.date) {
        console.log("Processando data:", serviceData.date);
        try {
          const dateRange = serviceData.date.split(" - ");
          if (dateRange.length === 2) {
            const startDate = new Date(dateRange[0]);
            const endDate = new Date(dateRange[1]);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return res.status(400).json({ message: "Formato de data inv\xE1lido" });
            }
            serviceData.startDate = startDate;
            serviceData.endDate = endDate;
          } else {
            return res.status(400).json({ message: "Formato de data deve ser: YYYY-MM-DD - YYYY-MM-DD" });
          }
          console.log("Data processada - startDate:", serviceData.startDate, "endDate:", serviceData.endDate);
        } catch (error) {
          return res.status(400).json({ message: "Formato de data inv\xE1lido" });
        }
        delete serviceData.date;
      } else {
        console.log("DEBUG: Campo date n\xE3o encontrado, mas deveria estar presente!");
        return res.status(400).json({ message: "Data de in\xEDcio e fim s\xE3o obrigat\xF3rias" });
      }
      const { ensureBrazilianFormat: ensureBrazilianFormat2 } = await Promise.resolve().then(() => (init_price_formatter(), price_formatter_exports));
      if (serviceData.price) {
        serviceData.price = ensureBrazilianFormat2(serviceData.price);
      }
      serviceData = {
        ...serviceData,
        storeId: store.id,
        status: "open",
        createdAt: /* @__PURE__ */ new Date()
      };
      const requiredFields = {
        title: "T\xEDtulo do Servi\xE7o",
        startDate: "Data de In\xEDcio",
        endDate: "Data de Fim",
        location: "Localiza\xE7\xE3o",
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
          message: "Campos obrigat\xF3rios n\xE3o preenchidos",
          missingFields
        });
      }
      const projectFilesArray = Array.isArray(req.files.projectFiles) ? req.files.projectFiles : [req.files.projectFiles];
      const uploadedFiles = [];
      for (const file of projectFilesArray) {
        if (!file.mimetype.includes("pdf")) {
          return res.status(400).json({
            message: `O arquivo "${file.name}" n\xE3o \xE9 um PDF v\xE1lido`
          });
        }
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            message: `O arquivo "${file.name}" excede o tamanho m\xE1ximo permitido de 10MB`
          });
        }
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.name}`;
        const uploadPath = path2.join(projectUploadsDir, fileName);
        await file.mv(uploadPath);
        uploadedFiles.push({
          name: file.name,
          path: `/uploads/projects/${fileName}`
        });
      }
      serviceData.projectFiles = uploadedFiles;
      console.log("Dados que ser\xE3o salvos no banco:", serviceData);
      const service = await storage.createService(serviceData);
      console.log("Servi\xE7o criado no banco:", service);
      res.status(201).json({
        ...service,
        projectFiles: uploadedFiles
      });
    } catch (error) {
      console.error("Erro ao criar servi\xE7o com arquivos:", error);
      res.status(500).json({ message: "Erro ao criar servi\xE7o com arquivos" });
    }
  });
  app2.patch("/api/services/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const { status } = req.body;
      if (!["open", "in-progress", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Status inv\xE1lido" });
      }
      const service = await storage.getServiceById(parseInt(id));
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (req.user?.userType === "lojista" && store?.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a modificar este servi\xE7o" });
      }
      const updatedService = await storage.updateServiceStatus(parseInt(id), status);
      res.json(updatedService);
    } catch (error) {
      console.error("Erro ao atualizar status do servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao atualizar status do servi\xE7o" });
    }
  });
  app2.delete("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem excluir servi\xE7os" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a excluir este servi\xE7o" });
      }
      if (service.status === "in-progress") {
        return res.status(400).json({
          message: "N\xE3o \xE9 poss\xEDvel excluir um servi\xE7o que est\xE1 em andamento. Conversas de servi\xE7os em andamento devem ser preservadas."
        });
      }
      if (service.status === "completed") {
        return res.status(400).json({
          message: "N\xE3o \xE9 poss\xEDvel excluir um servi\xE7o finalizado. O hist\xF3rico deve ser preservado."
        });
      }
      await storage.deleteService(serviceId);
      res.status(200).json({ message: "Servi\xE7o exclu\xEDdo com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir servi\xE7o:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir servi\xE7o" });
    }
  });
  app2.patch("/api/services/:id/confirm-assembler", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const serviceId = parseInt(req.params.id, 10);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      if (req.user?.userType !== "montador") {
        return res.status(403).json({ message: "Apenas montadores podem confirmar servi\xE7os" });
      }
      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        return res.status(404).json({ message: "Perfil de montador n\xE3o encontrado" });
      }
      const acceptedApplication = await db.select().from(applications).where(
        and2(
          eq2(applications.serviceId, serviceId),
          eq2(applications.assemblerId, assembler.id),
          eq2(applications.status, "accepted")
        )
      ).limit(1);
      if (acceptedApplication.length === 0) {
        return res.status(403).json({
          message: "Voc\xEA n\xE3o est\xE1 associado a este servi\xE7o ou sua candidatura n\xE3o foi aceita"
        });
      }
      await db.update(services).set({
        status: "in-progress"
      }).where(eq2(services.id, serviceId));
      try {
        const storeData = await storage.getStore(service.storeId);
        if (storeData) {
          const storeUser = await storage.getUser(storeData.userId);
          const serviceInfo = {
            id: service.id,
            title: service.title,
            storeData: {
              id: storeData.id,
              userId: storeData.userId,
              name: storeUser ? storeUser.name : "Loja"
            },
            assemblerData: {
              id: assembler.id,
              userId: req.user.id,
              name: req.user.name
            }
          };
          sendNotification(storeData.userId, {
            type: "service_confirmed",
            message: `O montador ${req.user.name} confirmou o servi\xE7o "${service.title}". Aguardando pagamento.`,
            serviceId: service.id,
            serviceData: serviceInfo,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          setTimeout(() => {
            sendNotification(req.user.id, {
              type: "payment_ready",
              message: `O servi\xE7o "${service.title}" foi confirmado. Voc\xEA j\xE1 pode realizar o pagamento.`,
              serviceId: service.id,
              serviceData: serviceInfo,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }, 1500);
        }
      } catch (notifyError) {
        console.error("Erro ao enviar notifica\xE7\xE3o de confirma\xE7\xE3o:", notifyError);
      }
      res.json({
        success: true,
        message: "Servi\xE7o confirmado com sucesso",
        status: "confirmed"
      });
    } catch (error) {
      console.error("Erro ao confirmar servi\xE7o:", error);
      res.status(500).json({ message: error.message || "Erro ao confirmar servi\xE7o" });
    }
  });
  app2.patch("/api/services/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const serviceId = parseInt(req.params.id, 10);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store || store.id !== service.storeId) {
          return res.status(403).json({ message: "N\xE3o autorizado a finalizar este servi\xE7o" });
        }
      } else if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (!assembler) {
          return res.status(403).json({ message: "Montador n\xE3o encontrado" });
        }
        const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
        if (!application || application.status !== "accepted") {
          return res.status(403).json({ message: "Voc\xEA n\xE3o est\xE1 autorizado a finalizar este servi\xE7o" });
        }
      } else {
        return res.status(403).json({ message: "Tipo de usu\xE1rio n\xE3o autorizado" });
      }
      const updatedService = await storage.updateService(serviceId, {
        status: "completed",
        completedAt: /* @__PURE__ */ new Date(),
        ratingRequired: true,
        storeRatingCompleted: false,
        assemblerRatingCompleted: false
      });
      try {
        const assemblerApp = await db.select({
          assemblerId: applications.assemblerId
        }).from(applications).where(
          and2(
            eq2(applications.serviceId, serviceId),
            eq2(applications.status, "accepted")
          )
        ).limit(1);
        if (assemblerApp.length > 0) {
          const serviceData = await storage.getServiceById(serviceId);
          if (!serviceData) return;
          const assemblerId = assemblerApp[0].assemblerId;
          const assemblerData = await storage.getAssemblerById(assemblerId);
          if (!assemblerData) return;
          const storeData = await storage.getStore(serviceData.storeId);
          if (!storeData) return;
          const assemblerUser = assemblerData ? await storage.getUser(assemblerData.userId) : null;
          const storeUser = storeData ? await storage.getUser(storeData.userId) : null;
          if (assemblerUser && storeUser && serviceData) {
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
            const notifyMessage = "Servi\xE7o finalizado com sucesso! Por favor, avalie o montador.";
            const storeWs = clients.get(storeUser.id);
            if (storeWs) {
              storeWs.send(JSON.stringify({
                type: "service_completed",
                message: notifyMessage,
                serviceId: serviceData.id,
                serviceData: serviceInfo,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }));
            }
            const assemblerWs = clients.get(assemblerUser.id);
            if (assemblerWs) {
              assemblerWs.send(JSON.stringify({
                type: "service_completed",
                message: "Servi\xE7o finalizado com sucesso! Por favor, avalie a loja.",
                serviceId: serviceData.id,
                serviceData: serviceInfo,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              }));
            }
            console.log(`Notifica\xE7\xF5es de avalia\xE7\xE3o enviadas para loja (${storeUser.id}) e montador (${assemblerUser.id})`);
          }
        }
      } catch (notifyError) {
        console.error("Erro ao enviar notifica\xE7\xE3o de finaliza\xE7\xE3o:", notifyError);
      }
      res.json({
        success: true,
        message: "Servi\xE7o finalizado com sucesso",
        service: updatedService
      });
    } catch (error) {
      console.error("Erro ao finalizar servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao finalizar servi\xE7o" });
    }
  });
  app2.post("/api/services/:id/apply", async (req, res) => {
    try {
      console.log("Candidatura recebida para o servi\xE7o ID:", req.params.id);
      if (!req.isAuthenticated()) {
        console.log("Erro de candidatura: Usu\xE1rio n\xE3o autenticado");
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      console.log("Usu\xE1rio autenticado:", req.user);
      if (req.user?.userType !== "montador") {
        console.log("Erro de candidatura: Usu\xE1rio n\xE3o \xE9 montador, \xE9", req.user?.userType);
        return res.status(403).json({ message: "Apenas montadores podem se candidatar a servi\xE7os" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      console.log("Processando candidatura para servi\xE7o ID:", serviceId);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.log("Erro de candidatura: Servi\xE7o n\xE3o encontrado ID:", serviceId);
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      console.log("Servi\xE7o encontrado:", service.title, "- Status atual:", service.status);
      if (service.status !== "open") {
        console.log("Erro de candidatura: Servi\xE7o n\xE3o est\xE1 aberto. Status atual:", service.status);
        return res.status(400).json({ message: "Este servi\xE7o n\xE3o est\xE1 mais dispon\xEDvel" });
      }
      const assembler = await storage.getAssemblerByUserId(req.user.id);
      if (!assembler) {
        console.log("Erro de candidatura: Montador n\xE3o encontrado para userId:", req.user.id);
        return res.status(404).json({ message: "Montador n\xE3o encontrado" });
      }
      console.log("Montador encontrado:", assembler.id);
      const existingApplication = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
      if (existingApplication) {
        console.log("Candidatura j\xE1 existe com status:", existingApplication.status);
        if (existingApplication.status === "accepted") {
          if (service.status === "in-progress" || service.status === "completed" || service.status === "cancelled") {
            return res.status(200).json({
              application: existingApplication,
              message: "Voc\xEA j\xE1 foi aceito para este servi\xE7o",
              serviceStatus: service.status
            });
          } else {
            await storage.updateServiceStatus(service.id, "in-progress");
            return res.status(200).json({
              application: existingApplication,
              message: "Sua candidatura foi aceita e o servi\xE7o est\xE1 em andamento",
              serviceStatus: "in-progress"
            });
          }
        } else {
          return res.status(200).json({
            application: existingApplication,
            message: existingApplication.status === "pending" ? "Sua candidatura est\xE1 sendo analisada pelo lojista" : "Sua candidatura foi rejeitada",
            serviceStatus: service.status
          });
        }
      }
      const applicationData = {
        serviceId,
        assemblerId: assembler.id,
        status: "pending",
        createdAt: /* @__PURE__ */ new Date()
      };
      console.log("Criando candidatura com dados:", applicationData);
      const newApplication = await storage.createApplication(applicationData);
      console.log("Candidatura criada com sucesso:", newApplication);
      const messageData = {
        serviceId,
        senderId: req.user.id,
        content: `Ol\xE1! Eu sou ${req.user.name} e me candidatei para realizar este servi\xE7o. Estou \xE0 disposi\xE7\xE3o para discutirmos os detalhes.`,
        sentAt: /* @__PURE__ */ new Date()
      };
      console.log("Criando mensagem inicial do chat");
      const newMessage = await storage.createMessage(messageData);
      console.log("Mensagem inicial criada:", newMessage);
      const serviceStore = await storage.getStore(service.storeId);
      if (serviceStore && serviceStore.userId) {
        sendNotification(serviceStore.userId, {
          type: "new_application",
          serviceId,
          message: `Nova candidatura de ${req.user.name} para o servi\xE7o "${service.title}"`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`Notifica\xE7\xE3o WebSocket enviada para o lojista ID: ${serviceStore.userId}`);
      }
      if (global.notifyStore) {
        console.log("Enviando notifica\xE7\xE3o para a loja sobre nova candidatura");
        global.notifyStore(
          serviceId,
          req.user.id,
          `${req.user.name} se candidatou ao servi\xE7o "${service.title}" e est\xE1 esperando sua resposta.`
        );
      }
      console.log("Candidatura conclu\xEDda com sucesso");
      res.status(201).json({
        application: newApplication,
        message: "Candidatura enviada com sucesso. O status do servi\xE7o foi atualizado para 'Em andamento' e um chat foi iniciado."
      });
    } catch (error) {
      console.error("Erro ao candidatar-se para servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao candidatar-se para servi\xE7o" });
    }
  });
  app2.get("/api/services/:id/applications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store || store.id !== service.storeId) {
          return res.status(403).json({ message: "N\xE3o autorizado a ver candidaturas deste servi\xE7o" });
        }
      } else {
        return res.status(403).json({ message: "Apenas lojistas podem ver candidaturas" });
      }
      const applications2 = await storage.getApplicationsByServiceId(serviceId);
      res.json(applications2);
    } catch (error) {
      console.error("Erro ao buscar candidaturas:", error);
      res.status(500).json({ message: "Erro ao buscar candidaturas" });
    }
  });
  app2.post("/api/applications/:id/accept", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const applicationId = parseInt(id);
      if (req.user?.userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem aceitar candidaturas" });
      }
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Candidatura n\xE3o encontrada" });
      }
      const service = await storage.getServiceById(application.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a aceitar esta candidatura" });
      }
      await storage.acceptApplication(application.id, application.serviceId);
      await storage.updateServiceStatus(service.id, "in-progress");
      const assembler = await storage.getAssemblerById(application.assemblerId);
      if (assembler) {
        console.log(`[AcceptApplication] Enviando notifica\xE7\xE3o para montador userId: ${assembler.userId}`);
        const notificationData = {
          type: "application_accepted",
          serviceId: service.id,
          message: `Sua candidatura para o servi\xE7o "${service.title}" foi aceita pelo lojista.`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        sendNotification(assembler.userId, notificationData);
        setTimeout(() => {
          console.log(`[AcceptApplication] Enviando notifica\xE7\xE3o autom\xE1tica para montador userId: ${assembler.userId}`);
          const serviceData = {
            id: service.id,
            title: service.title,
            price: service.price,
            storeId: service.storeId,
            storeName: req.user?.name || "Lojista",
            status: "in-progress"
          };
          sendNotification(assembler.userId, {
            type: "automatic_notification",
            message: `[NOTIFICA\xC7\xC3O AUTOM\xC1TICA] O lojista ${req.user?.name} requer confirma\xE7\xE3o para o servi\xE7o "${service.title}".`,
            serviceId: service.id,
            serviceData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          console.log(`[AcceptApplication] Notifica\xE7\xE3o autom\xE1tica enviada para montador userId: ${assembler.userId}`);
        }, 2e3);
      }
      res.json({ message: "Candidatura aceita com sucesso" });
    } catch (error) {
      console.error("Erro ao aceitar candidatura:", error);
      res.status(500).json({ message: "Erro ao aceitar candidatura" });
    }
  });
  app2.post("/api/upload", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      const documentsDir = path2.join(process.cwd(), "uploads", "documents");
      if (!fs2.existsSync(documentsDir)) {
        fs2.mkdirSync(documentsDir, { recursive: true });
      }
      const file = Object.values(req.files)[0];
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.mimetype)) {
        return res.status(400).json({
          message: "Arquivo deve ser uma imagem ou PDF"
        });
      }
      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          message: "Arquivo deve ter menos de 10MB"
        });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.name}`;
      const uploadPath = path2.join(documentsDir, fileName);
      await file.mv(uploadPath);
      const url = `/uploads/documents/${fileName}`;
      res.json({ url });
    } catch (error) {
      console.error("Erro ao fazer upload de documento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.post("/api/upload/documents", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      const documentsDir = path2.join(process.cwd(), "uploads", "documents");
      if (!fs2.existsSync(documentsDir)) {
        fs2.mkdirSync(documentsDir, { recursive: true });
      }
      const uploadedDocuments = {};
      for (const [fieldName, file] of Object.entries(req.files)) {
        const uploadedFile = file;
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
        if (!validTypes.includes(uploadedFile.mimetype)) {
          return res.status(400).json({
            message: `Arquivo ${fieldName} deve ser uma imagem ou PDF`
          });
        }
        if (uploadedFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            message: `Arquivo ${fieldName} deve ter menos de 10MB`
          });
        }
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${uploadedFile.name}`;
        const uploadPath = path2.join(documentsDir, fileName);
        await uploadedFile.mv(uploadPath);
        uploadedDocuments[fieldName] = `/uploads/documents/${fileName}`;
      }
      res.json({ documents: uploadedDocuments });
    } catch (error) {
      console.error("Erro ao fazer upload de documentos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.post("/api/profile/photo", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      const photoFile = req.files.photo;
      if (!photoFile.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "O arquivo deve ser uma imagem" });
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "A imagem deve ter menos de 5MB" });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${photoFile.name}`;
      const uploadPath = `./uploads/profiles/${fileName}`;
      if (!fs2.existsSync("./uploads")) {
        fs2.mkdirSync("./uploads");
      }
      if (!fs2.existsSync("./uploads/profiles")) {
        fs2.mkdirSync("./uploads/profiles");
      }
      await photoFile.mv(uploadPath);
      const photoUrl = `/uploads/profiles/${fileName}`;
      const uploadType = req.body.type || "profile-photo";
      if (uploadType === "store-logo" && req.user.userType === "lojista") {
        console.log("Processando upload de logo da loja");
        const store = await storage.getStoreByUserId(req.user.id);
        if (!store) {
          return res.status(404).json({ message: "Loja n\xE3o encontrada para este usu\xE1rio" });
        }
        await storage.updateStore(store.id, {
          logoUrl: photoUrl
        });
        console.log(`Logo da loja atualizado para ${photoUrl}`);
      } else {
        console.log("Processando upload de foto de perfil");
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
  app2.get("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id, userType } = req.user;
      let profileData = {};
      const averageRating = await storage.getAverageRatingForUser(id);
      if (userType === "lojista") {
        const store = await storage.getStoreByUserId(id);
        profileData = {
          ...req.user,
          store,
          rating: averageRating,
          // Incluir avaliação média para o lojista
          profilePhotoUrl: req.user.profilePhotoUrl
          // Garantir que a foto de perfil seja incluída
        };
      } else if (userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(id);
        if (assembler) {
          assembler.rating = averageRating;
        }
        profileData = {
          ...req.user,
          assembler,
          profilePhotoUrl: req.user.profilePhotoUrl
          // Garantir que a foto de perfil seja incluída
        };
      } else {
        profileData = {
          ...req.user,
          profilePhotoUrl: req.user.profilePhotoUrl
        };
      }
      res.json(profileData);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });
  app2.patch("/api/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id, userType } = req.user;
      const userData = req.body.user;
      if (userData) {
        const allowedFields = ["name", "email", "phone"];
        const updateData = {};
        allowedFields.forEach((field) => {
          if (userData[field] !== void 0) {
            updateData[field] = userData[field];
          }
        });
        if (Object.keys(updateData).length > 0) {
          const updatedUser = await storage.updateUser(id, updateData);
          req.user = updatedUser;
        }
      }
      if (userType === "lojista" && req.body.store) {
        const store = await storage.getStoreByUserId(id);
        if (store) {
          const allowedFields = ["name", "address", "city", "state", "phone", "logoUrl"];
          const updateData = {};
          allowedFields.forEach((field) => {
            if (req.body.store[field] !== void 0) {
              updateData[field] = req.body.store[field];
            }
          });
          if (Object.keys(updateData).length > 0) {
            await storage.updateStore(store.id, updateData);
          }
        }
      } else if (userType === "montador" && req.body.assembler) {
        const assembler = await storage.getAssemblerByUserId(id);
        if (assembler) {
          const allowedFields = ["cep", "address", "addressNumber", "neighborhood", "city", "state", "workRadius", "experience", "hasOwnTools", "technicalAssistance"];
          const updateData = {};
          allowedFields.forEach((field) => {
            if (req.body.assembler[field] !== void 0) {
              updateData[field] = req.body.assembler[field];
            }
          });
          if (Object.keys(updateData).length > 0) {
            await storage.updateAssembler(assembler.id, updateData);
          }
        }
      }
      let profileData = {};
      if (userType === "lojista") {
        const store = await storage.getStoreByUserId(id);
        profileData = { ...req.user, store };
      } else if (userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(id);
        profileData = { ...req.user, assembler };
      }
      res.json(profileData);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });
  app2.get("/api/services/pending-evaluations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const userId = req.user.id;
      const userType = req.user.userType;
      let pendingServices = [];
      if (userType === "lojista") {
        const store = await storage.getStoreByUserId(userId);
        if (store) {
          const storeServices = await db.select().from(services).where(
            and2(
              eq2(services.storeId, store.id),
              eq2(services.status, "completed"),
              eq2(services.ratingRequired, true),
              eq2(services.storeRatingCompleted, false)
            )
          );
          pendingServices = storeServices;
        }
      } else if (userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(userId);
        if (assembler) {
          const acceptedApplications = await db.select({ serviceId: applications.serviceId }).from(applications).where(
            and2(
              eq2(applications.assemblerId, assembler.id),
              eq2(applications.status, "accepted")
            )
          );
          if (acceptedApplications.length > 0) {
            const serviceIds = acceptedApplications.map((app3) => app3.serviceId).filter((id) => id !== null && id !== void 0 && !isNaN(Number(id))).map((id) => Number(id));
            if (serviceIds.length > 0) {
              try {
                pendingServices = await db.select().from(services).where(
                  and2(
                    eq2(services.status, "completed"),
                    eq2(services.ratingRequired, true),
                    eq2(services.assemblerRatingCompleted, false),
                    inArray2(services.id, serviceIds)
                  )
                );
              } catch (error) {
                console.error("Erro ao buscar servi\xE7os pendentes para montador:", error);
                pendingServices = [];
              }
            }
          }
        }
      }
      res.json({
        hasPendingEvaluations: pendingServices.length > 0,
        pendingServices: pendingServices.map((service) => ({
          id: service.id,
          title: service.title,
          completedAt: service.completedAt
        }))
      });
    } catch (error) {
      console.error("Erro ao verificar avalia\xE7\xF5es pendentes:", error);
      res.status(500).json({ message: "Erro ao verificar avalia\xE7\xF5es pendentes" });
    }
  });
  app2.get("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ message: "ID de servi\xE7o inv\xE1lido" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let hasAccess = false;
      if (req.user?.userType === "lojista") {
        const store2 = await storage.getStoreByUserId(req.user.id);
        if (store2 && store2.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === "montador") {
        if (service.status === "open") {
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
        return res.status(403).json({ message: "N\xE3o autorizado a ver este servi\xE7o" });
      }
      const storeResult = await db.select().from(stores).where(eq2(stores.id, service.storeId));
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
      console.error("Erro ao buscar servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao buscar servi\xE7o" });
    }
  });
  app2.get("/api/services/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const assemblerIdParam = req.query.assemblerId;
      let assemblerId = void 0;
      if (assemblerIdParam && typeof assemblerIdParam === "string") {
        assemblerId = parseInt(assemblerIdParam);
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let hasAccess = false;
      let userAssemblerId = void 0;
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
            userAssemblerId = assembler.id;
          }
        }
      }
      if (!hasAccess) {
        return res.status(403).json({ message: "N\xE3o autorizado a acessar este chat" });
      }
      let messages2;
      if (req.user?.userType === "montador" && userAssemblerId) {
        messages2 = await storage.getMessagesBetweenStoreAndAssembler(serviceId, userAssemblerId);
      } else if (req.user?.userType === "lojista" && assemblerId) {
        messages2 = await storage.getMessagesBetweenStoreAndAssembler(serviceId, assemblerId);
      } else if (req.user?.userType === "lojista") {
        messages2 = await storage.getMessagesByServiceId(serviceId);
      } else {
        messages2 = [];
      }
      const enhancedMessages = await Promise.all(messages2.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        return {
          ...message,
          sender: sender ? {
            name: sender.name,
            userType: sender.userType
          } : void 0
        };
      }));
      res.json(enhancedMessages);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });
  app2.delete("/api/services/messages/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      return res.status(403).json({
        message: "Nenhuma mensagem poder\xE1 ser exclu\xEDda do chat, garantindo a preserva\xE7\xE3o completa do hist\xF3rico de conversas."
      });
    } catch (error) {
      console.error("Tentativa de excluir mensagem:", error);
      res.status(500).json({ message: "Erro ao processar requisi\xE7\xE3o" });
    }
  });
  app2.post("/api/services/:id/messages/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let hasAccess = false;
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
          }
        }
      }
      if (!hasAccess) {
        return res.status(403).json({ message: "N\xE3o autorizado a acessar este chat" });
      }
      await storage.markMessagesAsRead(serviceId, req.user.id);
      console.log(`Usu\xE1rio ${req.user.id} marcou as mensagens do servi\xE7o ${serviceId} como lidas`);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
      res.status(500).json({ message: "Erro ao marcar mensagens como lidas" });
    }
  });
  app2.get("/api/messages/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const totalUnreadCount = await storage.getTotalUnreadMessageCount(req.user.id);
      res.json({ count: totalUnreadCount });
    } catch (error) {
      console.error("Erro ao buscar contagem de mensagens n\xE3o lidas:", error);
      res.status(500).json({ message: "Erro ao buscar contagem de mensagens n\xE3o lidas" });
    }
  });
  app2.post("/api/services/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const { content } = req.body;
      if (!content || content.trim() === "") {
        return res.status(400).json({ message: "Conte\xFAdo da mensagem n\xE3o pode ser vazio" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let hasAccess = false;
      if (req.user?.userType === "lojista") {
        const store = await storage.getStoreByUserId(req.user.id);
        if (store && store.id === service.storeId) {
          hasAccess = true;
        }
      } else if (req.user?.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(req.user.id);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application) {
            hasAccess = true;
          }
        }
      }
      if (!hasAccess) {
        return res.status(403).json({ message: "N\xE3o autorizado a enviar mensagens neste chat" });
      }
      const messageData = {
        serviceId,
        senderId: req.user.id,
        content,
        sentAt: /* @__PURE__ */ new Date()
      };
      const newMessage = await storage.createMessage(messageData);
      try {
        if (req.user?.userType === "montador") {
          const storeResult = await db.select().from(stores).where(eq2(stores.id, service.storeId));
          if (storeResult.length > 0) {
            const storeUserId = storeResult[0].userId;
            const notificationSent = sendNotification(storeUserId, {
              type: "new_message",
              serviceId,
              message: `Nova mensagem de ${req.user.name} no servi\xE7o "${service.title}"`,
              senderName: req.user.name,
              senderType: req.user.userType,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            console.log(`Notifica\xE7\xE3o de nova mensagem enviada para lojista (userId: ${storeUserId}): ${notificationSent ? "sucesso" : "falhou"}`);
          }
        } else if (req.user?.userType === "lojista") {
          const acceptedApplications = await db.select().from(applications).where(and2(
            eq2(applications.serviceId, serviceId),
            eq2(applications.status, "accepted")
          ));
          for (const app3 of acceptedApplications) {
            const assemblerDataResult = await db.select().from(assemblers).where(eq2(assemblers.id, app3.assemblerId));
            if (assemblerDataResult.length > 0) {
              const assemblerUserId = assemblerDataResult[0].userId;
              const notificationSent = sendNotification(assemblerUserId, {
                type: "new_message",
                serviceId,
                message: `Nova mensagem de ${req.user.name} no servi\xE7o "${service.title}"`,
                senderName: req.user.name,
                senderType: req.user.userType,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`Notifica\xE7\xE3o de nova mensagem enviada para montador (userId: ${assemblerUserId}): ${notificationSent ? "sucesso" : "falhou"}`);
            }
          }
        }
      } catch (notificationError) {
        console.error("Erro ao enviar notifica\xE7\xE3o de nova mensagem:", notificationError);
      }
      if (global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user.id);
      }
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = /* @__PURE__ */ new Map();
  function sendNotification(userId, message) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        console.log(`Notifica\xE7\xE3o enviada para usu\xE1rio ${userId}:`, message);
        return true;
      } catch (error) {
        console.error(`Erro ao enviar notifica\xE7\xE3o para usu\xE1rio ${userId}:`, error);
        return false;
      }
    } else {
      console.log(`Usu\xE1rio ${userId} n\xE3o est\xE1 conectado ou WebSocket n\xE3o est\xE1 aberto`);
      return false;
    }
  }
  wss.on("connection", (ws2, request) => {
    console.log("Nova conex\xE3o WebSocket");
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      console.log("Conex\xE3o rejeitada: userId n\xE3o fornecido");
      ws2.close();
      return;
    }
    const userIdNum = parseInt(userId);
    clients.set(userIdNum, ws2);
    console.log(`Cliente conectado: userId=${userIdNum}`);
    ws2.on("close", () => {
      console.log(`Cliente desconectado: userId=${userIdNum}`);
      clients.delete(userIdNum);
    });
    ws2.send(JSON.stringify({
      type: "connection",
      message: "Conectado com sucesso"
    }));
  });
  global.notifyStore = async (serviceId, montadorId, mensagem) => {
    try {
      console.log(`[notifyStore] Iniciando envio de notifica\xE7\xE3o: servi\xE7o ${serviceId}, montador ${montadorId}`);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.error(`[notifyStore] Servi\xE7o ${serviceId} n\xE3o encontrado`);
        return;
      }
      console.log(`[notifyStore] Servi\xE7o encontrado: "${service.title}", storeId: ${service.storeId}`);
      const storeResult = await db.select().from(stores).where(eq2(stores.id, service.storeId));
      if (!storeResult.length) {
        console.error(`[notifyStore] Loja com ID ${service.storeId} n\xE3o encontrada`);
        return;
      }
      const storeUserId = storeResult[0].userId;
      console.log(`[notifyStore] UserId do lojista encontrado: ${storeUserId}`);
      const montador = await storage.getUser(montadorId);
      const montadorNome = montador ? montador.name : "Um montador";
      const notificationMessage = mensagem || `${montadorNome} se candidatou ao servi\xE7o "${service.title}"`;
      console.log(`[notifyStore] Verificando se lojista (userId: ${storeUserId}) est\xE1 conectado...`);
      const isConnected = clients.has(storeUserId);
      console.log(`[notifyStore] Lojista ${storeUserId} est\xE1 ${isConnected ? "conectado" : "desconectado"}`);
      const notificationData = {
        type: "new_application",
        serviceId,
        message: notificationMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log(`[notifyStore] Enviando notifica\xE7\xE3o:`, notificationData);
      const sent = sendNotification(storeUserId, notificationData);
      console.log(`[notifyStore] Notifica\xE7\xE3o ${sent ? "enviada com sucesso" : "n\xE3o foi entregue"}`);
    } catch (error) {
      console.error("[notifyStore] Erro ao enviar notifica\xE7\xE3o para loja:", error);
    }
  };
  global.notifyNewMessage = async (serviceId, senderId) => {
    try {
      console.log(`[notifyNewMessage] Iniciando envio de notifica\xE7\xE3o: servi\xE7o ${serviceId}, remetente ${senderId}`);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.error(`[notifyNewMessage] Servi\xE7o ${serviceId} n\xE3o encontrado`);
        return;
      }
      const sender = await storage.getUser(senderId);
      if (!sender) {
        console.error(`[notifyNewMessage] Usu\xE1rio remetente ${senderId} n\xE3o encontrado`);
        return;
      }
      console.log(`[notifyNewMessage] Remetente: ${sender.name} (${sender.userType})`);
      const storeResult = await db.select().from(stores).where(eq2(stores.id, service.storeId));
      if (!storeResult.length) {
        console.error(`[notifyNewMessage] Loja do servi\xE7o (storeId: ${service.storeId}) n\xE3o encontrada`);
        return;
      }
      const storeUserId = storeResult[0].userId;
      console.log(`[notifyNewMessage] UserId do lojista: ${storeUserId}`);
      const acceptedApplications = await db.select().from(applications).where(and2(
        eq2(applications.serviceId, serviceId),
        eq2(applications.status, "accepted")
      ));
      console.log(`[notifyNewMessage] Encontradas ${acceptedApplications.length} candidaturas aceitas para o servi\xE7o`);
      if (acceptedApplications.length === 0) {
        console.log(`[notifyNewMessage] Nenhuma candidatura aceita para o servi\xE7o ${serviceId}, n\xE3o notificando`);
        return;
      }
      let assemblerUserId = null;
      for (const app3 of acceptedApplications) {
        const assemblerDataResult = await db.select().from(assemblers).where(eq2(assemblers.id, app3.assemblerId));
        if (assemblerDataResult.length > 0) {
          assemblerUserId = assemblerDataResult[0].userId;
          console.log(`[notifyNewMessage] UserId do montador: ${assemblerUserId}`);
          break;
        }
      }
      if (!assemblerUserId) {
        console.error(`[notifyNewMessage] N\xE3o foi poss\xEDvel encontrar o montador relacionado`);
        return;
      }
      if (sender.userType === "lojista") {
        console.log(`[notifyNewMessage] Enviando notifica\xE7\xE3o para o montador (userId: ${assemblerUserId})`);
        const notificationSent = sendNotification(assemblerUserId, {
          type: "new_message",
          serviceId,
          message: `Nova mensagem da loja no servi\xE7o "${service.title}"`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[notifyNewMessage] Notifica\xE7\xE3o para montador ${notificationSent ? "enviada" : "falhou"}`);
      } else if (sender.userType === "montador") {
        console.log(`[notifyNewMessage] Enviando notifica\xE7\xE3o para o lojista (userId: ${storeUserId})`);
        const notificationSent = sendNotification(storeUserId, {
          type: "new_message",
          serviceId,
          message: `Nova mensagem do montador ${sender.name} no servi\xE7o "${service.title}"`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`[notifyNewMessage] Notifica\xE7\xE3o para lojista ${notificationSent ? "enviada" : "falhou"}`);
      }
    } catch (error) {
      console.error("[notifyNewMessage] Erro ao enviar notifica\xE7\xE3o de nova mensagem:", error);
    }
  };
  app2.get("/api/services/:id/ratings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const serviceId = Number(req.params.id);
      const ratings2 = await storage.getRatingsByServiceId(serviceId);
      const enhancedRatings = await Promise.all(ratings2.map(async (rating) => {
        const fromUser = await storage.getUser(rating.fromUserId);
        const toUser = await storage.getUser(rating.toUserId);
        return {
          ...rating,
          fromUser: fromUser ? {
            name: fromUser.name,
            userType: fromUser.userType
          } : void 0,
          toUser: toUser ? {
            name: toUser.name,
            userType: toUser.userType
          } : void 0
        };
      }));
      res.json(enhancedRatings);
    } catch (error) {
      console.error("Erro ao buscar avalia\xE7\xF5es:", error);
      res.status(500).json({ message: "Erro ao buscar avalia\xE7\xF5es" });
    }
  });
  app2.patch("/api/services/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
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
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (req.user?.userType !== "lojista" || !store || store.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a modificar este servi\xE7o" });
      }
      if (service.status !== "open") {
        return res.status(400).json({
          message: "Apenas servi\xE7os com status 'Em Aberto' podem ser editados"
        });
      }
      const updateData = {};
      if (title !== void 0) {
        updateData.title = title;
      }
      if (description !== void 0) {
        updateData.description = description;
      }
      if (price !== void 0) {
        const { ensureBrazilianFormat: ensureBrazilianFormat2 } = await Promise.resolve().then(() => (init_price_formatter(), price_formatter_exports));
        updateData.price = ensureBrazilianFormat2(price);
      }
      if (materialType !== void 0) {
        updateData.materialType = materialType;
      }
      if (status !== void 0) {
        if (!["open", "in-progress", "completed", "cancelled"].includes(status)) {
          return res.status(400).json({ message: "Status inv\xE1lido" });
        }
        updateData.status = status;
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualiza\xE7\xE3o" });
      }
      const updatedService = await storage.updateService(serviceId, updateData);
      console.log(`Servi\xE7o ${serviceId} atualizado por ${req.user.name} (${req.user.id}):`, updateData);
      if (status === "in-progress") {
        const applications2 = await storage.getApplicationsByServiceId(serviceId);
        for (const application of applications2) {
          if (application.status === "accepted") {
            const assembler = await storage.getAssemblerById(application.assemblerId);
            if (assembler && assembler.userId) {
              sendNotification(assembler.userId, {
                type: "service_update",
                serviceId,
                message: `O servi\xE7o "${service.title}" foi atualizado e est\xE1 em andamento`,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`Notifica\xE7\xE3o enviada para o montador ID ${assembler.userId}`);
            }
          }
        }
      }
      res.json(updatedService);
    } catch (error) {
      console.error("Erro ao atualizar servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao atualizar servi\xE7o" });
    }
  });
  app2.post("/api/services/:id/update-with-files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (req.user?.userType !== "lojista" || !store || store.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a modificar este servi\xE7o" });
      }
      if (service.status !== "open") {
        return res.status(400).json({
          message: "Apenas servi\xE7os com status 'Em Aberto' podem ser editados"
        });
      }
      const updateData = {};
      const { title, description, date, price, materialType } = req.body;
      if (title) updateData.title = title;
      if (description !== void 0) updateData.description = description;
      if (price) updateData.price = price.toString();
      if (materialType) updateData.materialType = materialType;
      let filesToDelete = [];
      if (req.body.filesToDelete) {
        try {
          filesToDelete = JSON.parse(req.body.filesToDelete);
        } catch (e) {
          console.error("Erro ao processar lista de arquivos para exclus\xE3o:", e);
        }
      }
      let currentProjectFiles = Array.isArray(service.projectFiles) ? service.projectFiles.filter((file) => !filesToDelete.includes(file.path)) : [];
      const uploadedFiles = [];
      if (req.files) {
        const files = req.files.files ? Array.isArray(req.files.files) ? req.files.files : [req.files.files] : [];
        for (const file of files) {
          if (!file.mimetype.includes("pdf")) {
            return res.status(400).json({
              message: `O arquivo "${file.name}" n\xE3o \xE9 um PDF v\xE1lido`
            });
          }
          if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
              message: `O arquivo "${file.name}" excede o tamanho m\xE1ximo permitido de 10MB`
            });
          }
          const timestamp2 = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const fileName = `${timestamp2}-${randomId}-${file.name}`;
          const uploadDir = "./uploads/projects";
          if (!fs2.existsSync("./uploads")) {
            fs2.mkdirSync("./uploads");
          }
          if (!fs2.existsSync(uploadDir)) {
            fs2.mkdirSync(uploadDir);
          }
          const uploadPath = `${uploadDir}/${fileName}`;
          await file.mv(uploadPath);
          uploadedFiles.push({
            name: file.name,
            path: `/uploads/projects/${fileName}`
          });
        }
      }
      for (const filePath of filesToDelete) {
        try {
          const fileName = filePath.split("/").pop();
          if (fileName) {
            const fullPath = `./uploads/projects/${fileName}`;
            if (fs2.existsSync(fullPath)) {
              fs2.unlinkSync(fullPath);
              console.log(`Arquivo exclu\xEDdo: ${fullPath}`);
            }
          }
        } catch (e) {
          console.error(`Erro ao excluir arquivo ${filePath}:`, e);
        }
      }
      const allProjectFiles = [...currentProjectFiles, ...uploadedFiles];
      updateData.projectFiles = allProjectFiles;
      const updatedService = await storage.updateService(serviceId, updateData);
      console.log(`Servi\xE7o ${serviceId} atualizado com arquivos por ${req.user.name} (${req.user.id}):`, {
        novosArquivos: uploadedFiles.length,
        arquivosExcluidos: filesToDelete.length,
        totalArquivos: allProjectFiles.length
      });
      res.status(200).json({
        ...updatedService,
        projectFiles: allProjectFiles
      });
    } catch (error) {
      console.error("Erro ao atualizar servi\xE7o com arquivos:", error);
      res.status(500).json({ message: "Erro ao atualizar servi\xE7o com arquivos" });
    }
  });
  app2.post("/api/services/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const serviceId = Number(req.params.id);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const userType = req.user.userType;
      if (userType !== "lojista") {
        return res.status(403).json({ message: "Apenas lojistas podem finalizar servi\xE7os" });
      }
      const store = await storage.getStoreByUserId(req.user.id);
      if (!store || store.id !== service.storeId) {
        return res.status(403).json({ message: "N\xE3o autorizado a finalizar este servi\xE7o" });
      }
      if (service.status !== "in-progress") {
        return res.status(400).json({ message: "S\xF3 \xE9 poss\xEDvel finalizar servi\xE7os em andamento" });
      }
      const updatedService = await storage.updateService(serviceId, {
        status: "completed",
        ratingRequired: true,
        completedAt: /* @__PURE__ */ new Date()
      });
      const acceptedApplication = await db.select().from(applications).where(
        and2(
          eq2(applications.serviceId, serviceId),
          eq2(applications.status, "accepted")
        )
      ).limit(1);
      if (acceptedApplication.length > 0) {
        const assemblerId = acceptedApplication[0].assemblerId;
        const assembler = await storage.getAssemblerById(assemblerId);
        if (assembler) {
          const assemblerUser = await storage.getUser(assembler.userId);
          if (assemblerUser && store) {
            const serviceInfo = {
              id: service.id,
              title: service.title,
              storeData: {
                id: store.id,
                userId: store.userId,
                name: req.user.name
              },
              assemblerData: {
                id: assemblerId,
                userId: assembler.userId,
                name: assemblerUser.name
              }
            };
            sendNotification(Number(req.user.id), {
              type: "service_completed",
              serviceId,
              message: `O servi\xE7o "${service.title}" foi finalizado. Por favor, avalie o montador.`,
              serviceData: serviceInfo,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            sendNotification(Number(assembler.userId), {
              type: "service_completed",
              serviceId,
              message: `O servi\xE7o "${service.title}" foi finalizado. Por favor, avalie a loja.`,
              serviceData: serviceInfo,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            console.log(`Notifica\xE7\xF5es de avalia\xE7\xE3o enviadas para loja (${req.user.id}) e montador (${assembler.userId})`);
          }
        }
      }
      res.json({
        message: "Servi\xE7o finalizado com sucesso. Agora voc\xEA pode avali\xE1-lo.",
        service: updatedService
      });
    } catch (error) {
      console.error("Erro ao finalizar servi\xE7o:", error);
      res.status(500).json({ message: "Erro ao finalizar servi\xE7o" });
    }
  });
  app2.post("/api/payment/pix/token-test", async (req, res) => {
    try {
      console.log("[PIX Token Test] Testando autentica\xE7\xE3o diretamente com Canvi...");
      const clientId = "F77C510B3A1108";
      const privateKey = "1093A110B3A1F77C5108D96108680102EE010149E109838109";
      const apiUrl = "https://gateway-production.service-canvi.com.br/bt/token";
      console.log("[PIX Token Test] URL:", apiUrl);
      console.log("[PIX Token Test] Client ID:", clientId);
      console.log("[PIX Token Test] Private Key:", privateKey.substring(0, 10) + "...");
      const authResponse = await axios2.post(apiUrl, {
        client_id: clientId,
        private_key: privateKey
      }, {
        headers: {
          "Content-Type": "application/json",
          "Cookie": "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIwNjA3YmRhZi00Zjk0LTQzZTItOTZhNy02Yzk1ZDcyMmI4MWEiLCJleHAiOjE3NDg4ODk2NTksImlhdCI6MTc0ODI4NDg1OX0.IixKnrEjEGxaa61NKz31TT4G273_gwMVKqwNIWSsfm0; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJhZWE2MWMwYi00YjBmLTRlOTMtODE4Yy1hMGY3MjNhNjllMzAiLCJleHAiOjE3NDkyMzI5NjgsImlhdCI6MTc0ODYyODE2OH0.t6VGncgXRJJpa5rM7_YCQhech4yCH3VW6BdWQhh-39M"
        }
      });
      console.log("[PIX Token Test] Status da resposta:", authResponse.status);
      console.log("[PIX Token Test] Dados recebidos:", authResponse.data);
      console.log("[PIX Token Test] Headers da resposta:", JSON.stringify(authResponse.headers, null, 2));
      const sessionToken = authResponse.data.token;
      if (!sessionToken) {
        console.log("[PIX Token Test] ERRO: Token n\xE3o recebido");
        return res.status(500).json({
          success: false,
          message: "Token n\xE3o recebido da API Canvi",
          responseData: authResponse.data
        });
      }
      res.json({
        success: true,
        token: sessionToken,
        fullResponse: authResponse.data
      });
    } catch (error) {
      console.error("[PIX Token Test] Erro:", error.message);
      if (error.response) {
        console.error("[PIX Token Test] Status:", error.response.status);
        console.error("[PIX Token Test] Dados:", error.response.data);
        console.error("[PIX Token Test] Headers:", error.response.headers);
      }
      res.status(500).json({
        success: false,
        message: "Erro ao testar token PIX",
        details: error.response?.data || error.message
      });
    }
  });
  app2.post("/api/payment/pix/token", async (req, res) => {
    try {
      console.log("[PIX Token] Iniciando autentica\xE7\xE3o com Canvi...");
      console.log("[PIX Token] Session ID:", req.sessionID);
      console.log("[PIX Token] User from session:", req.user);
      console.log("[PIX Token] isAuthenticated():", req.isAuthenticated());
      if (!req.isAuthenticated()) {
        console.log("[PIX Token] Usu\xE1rio n\xE3o autenticado");
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      console.log("[PIX Token] Usu\xE1rio autenticado:", req.user?.id);
      const clientId = "F77C510B3A1108";
      const privateKey = "1093A110B3A1F77C5108D96108680102EE010149E109838109";
      console.log("[PIX Token] Autenticando com Canvi API...");
      let authResponse;
      let apiUrl = "https://gateway-production.service-canvi.com.br/bt/token";
      console.log("[PIX Token] Tentando endpoint de homologa\xE7\xE3o...");
      console.log("[PIX Token] URL:", apiUrl);
      console.log("[PIX Token] Client ID:", clientId);
      console.log("[PIX Token] Private Key:", privateKey.substring(0, 10) + "...");
      try {
        authResponse = await axios2.post(apiUrl, {
          client_id: clientId,
          private_key: privateKey
        }, {
          headers: {
            "Content-Type": "application/json",
            "Cookie": "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIwNjA3YmRhZi00Zjk0LTQzZTItOTZhNy02Yzk1ZDcyMmI4MWEiLCJleHAiOjE3NDg4ODk2NTksImlhdCI6MTc0ODI4NDg1OX0.IixKnrEjEGxaa61NKz31TT4G273_gwMVKqwNIWSsfm0; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiJhZWE2MWMwYi00YjBmLTRlOTMtODE4Yy1hMGY3MjNhNjllMzAiLCJleHAiOjE3NDkyMzI5NjgsImlhdCI6MTc0ODYyODE2OH0.t6VGncgXRJJpa5rM7_YCQhech4yCH3VW6BdWQhh-39M"
          }
        });
        console.log("[PIX Token] Resposta recebida - Status:", authResponse.status);
        console.log("[PIX Token] Headers da resposta:", authResponse.headers);
      } catch (error) {
        console.log("[PIX Token] Erro na requisi\xE7\xE3o:", error.response?.status);
        console.log("[PIX Token] Dados do erro:", error.response?.data);
        console.log("[PIX Token] Headers do erro:", error.response?.headers);
        throw error;
      }
      console.log("[PIX Token] Resposta da autentica\xE7\xE3o:", authResponse.status);
      console.log("[PIX Token] Dados recebidos:", authResponse.data);
      const sessionToken = authResponse.data.token;
      if (!sessionToken) {
        console.log("[PIX Token] ERRO: Token n\xE3o recebido da API Canvi");
        console.log("[PIX Token] Resposta completa:", authResponse.data);
        return res.status(500).json({
          success: false,
          message: "Falha na autentica\xE7\xE3o com gateway de pagamento"
        });
      }
      console.log("[PIX Token] Sucesso - token obtido da Canvi");
      res.json({
        success: true,
        token: sessionToken
      });
    } catch (error) {
      console.error("[PIX Token] Erro ao autenticar com Canvi:", error.message);
      if (error.response) {
        console.error("[PIX Token] Status da resposta:", error.response.status);
        console.error("[PIX Token] Dados da resposta:", error.response.data);
        console.error("[PIX Token] Headers da resposta:", error.response.headers);
      }
      res.status(500).json({
        success: false,
        message: "Erro ao gerar token de autentica\xE7\xE3o PIX",
        details: error.response?.data || error.message
      });
    }
  });
  app2.post("/api/payment/pix/create", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { serviceId, amount, description, token } = req.body;
      console.log("[PIX Create] Dados recebidos do frontend:", { serviceId, amount, description, token: token ? "presente" : "ausente" });
      if (!serviceId || !amount || !token) {
        return res.status(400).json({ message: "Dados obrigat\xF3rios n\xE3o fornecidos" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      let documentType = "cpf";
      let documentNumber = "";
      let pixKey = "";
      let pixKeyType = "";
      const bankAccounts3 = await storage.getBankAccountsByUserId(user.id);
      if (bankAccounts3 && bankAccounts3.length > 0) {
        const primaryAccount = bankAccounts3[0];
        documentType = primaryAccount.holderDocumentType;
        documentNumber = primaryAccount.holderDocumentNumber;
        pixKey = primaryAccount.pixKey || "";
        pixKeyType = primaryAccount.pixKeyType || "";
        console.log("[PIX Create] Dados banc\xE1rios encontrados:", {
          documentType,
          documentNumber: documentNumber.substring(0, 3) + "***",
          hasPixKey: !!pixKey,
          pixKeyType
        });
      } else {
        if (user.userType === "montador") {
          const assembler = await storage.getAssemblerByUserId(user.id);
          if (assembler && assembler.documentType && assembler.documentNumber) {
            documentType = assembler.documentType;
            documentNumber = assembler.documentNumber;
          }
        } else if (user.userType === "lojista") {
          const store = await storage.getStoreByUserId(user.id);
          if (store && store.documentType && store.documentNumber) {
            documentType = store.documentType;
            documentNumber = store.documentNumber;
          }
        }
        console.log("[PIX Create] Usando dados do perfil (sem conta banc\xE1ria cadastrada)");
      }
      if (!documentNumber) {
        return res.status(400).json({
          message: "Dados de documento n\xE3o encontrados. Por favor, complete seu cadastro com CPF/CNPJ ou cadastre uma conta banc\xE1ria para realizar pagamentos PIX."
        });
      }
      const formatDocumentNumber = (number, type) => {
        const cleanNumber2 = number.replace(/[^\d]/g, "");
        let actualType = type;
        if (cleanNumber2.length === 11) {
          actualType = "cpf";
        } else if (cleanNumber2.length === 14) {
          actualType = "cnpj";
        }
        if (actualType === "cpf" && cleanNumber2.length === 11) {
          return cleanNumber2.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        } else if (actualType === "cnpj" && cleanNumber2.length === 14) {
          return cleanNumber2.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        }
        return null;
      };
      const formattedDocumentNumber = formatDocumentNumber(documentNumber, documentType);
      if (!formattedDocumentNumber) {
        const cleanNumber2 = documentNumber.replace(/[^\d]/g, "");
        console.log("[PIX Create] ERRO: N\xFAmero de documento inv\xE1lido:", {
          original: documentNumber,
          clean: cleanNumber2,
          length: cleanNumber2.length,
          expectedType: documentType
        });
        return res.status(400).json({
          message: `N\xFAmero de documento inv\xE1lido. CPF deve ter 11 d\xEDgitos e CNPJ deve ter 14 d\xEDgitos. Documento fornecido: ${cleanNumber2.length} d\xEDgitos.`
        });
      }
      const cleanNumber = documentNumber.replace(/[^\d]/g, "");
      const actualDocumentType = cleanNumber.length === 11 ? "cpf" : "cnpj";
      const uniqueReference = `service_${serviceId}_${Date.now()}`;
      const expirationDate = new Date(Date.now() + 60 * 60 * 1e3);
      const timestamp2 = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const identificadorExterno = `service_${serviceId}_${timestamp2}_${randomSuffix}`;
      const identificadorMovimento = `payment_${serviceId}_${timestamp2}_${randomSuffix}`;
      let parsedAmount;
      if (typeof amount === "string") {
        if (amount.includes(",")) {
          const cleanAmount = amount.replace(/[^\d,]/g, "");
          const normalized = cleanAmount.replace(",", ".");
          parsedAmount = parseFloat(normalized) || 0;
        } else {
          parsedAmount = parseFloat(amount);
        }
      } else {
        parsedAmount = parseFloat(amount);
      }
      const amountInCentavos = Math.round(parsedAmount * 100);
      console.log("[PIX Create] Valor original:", amount, "tipo:", typeof amount);
      console.log("[PIX Create] Valor processado (em reais):", parsedAmount);
      console.log("[PIX Create] Valor enviado para Canvi (em centavos):", amountInCentavos);
      const maxTitleLength = 37 - "Pagamento: ".length;
      const truncatedTitle = service.title.length > maxTitleLength ? service.title.substring(0, maxTitleLength - 3) + "..." : service.title;
      const pixPaymentData = {
        valor: amountInCentavos,
        // Use amount in centavos as required by Canvi API
        descricao: `Pagamento: ${truncatedTitle}`,
        tipo_transacao: "pixStaticCashin",
        texto_instrucao: "Pagamento do servi\xE7o de montagem - Amigo Montador",
        identificador_externo: identificadorExterno,
        identificador_movimento: identificadorMovimento,
        enviar_qr_code: true,
        tag: [
          "amigo_montador",
          `service_${serviceId}`
        ],
        cliente: {
          nome: user.name,
          tipo_documento: actualDocumentType,
          numero_documento: formattedDocumentNumber,
          "e-mail": user.email
        }
      };
      console.log("[PIX Create] Enviando dados para Canvi:", JSON.stringify(pixPaymentData, null, 2));
      const paymentResponse = await axios2.post("https://gateway-production.service-canvi.com.br/bt/pix", pixPaymentData, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Cookie": `token=${token}`
        }
      });
      console.log("[PIX Create] Resposta da Canvi:", JSON.stringify(paymentResponse.data, null, 2));
      console.log("[PIX Create] Status da resposta:", paymentResponse.status);
      await storage.updateService(serviceId, {
        paymentReference: identificadorExterno,
        paymentStatus: "pending"
      });
      const responseData = paymentResponse.data.data || paymentResponse.data;
      const qrCodeData = responseData.qrcode;
      const pixCodeData = responseData.brcode;
      const paymentId = responseData.id_invoice_pix || responseData.tx_id || responseData.id;
      console.log("[PIX Create] QR Code encontrado:", !!qrCodeData);
      console.log("[PIX Create] PIX Code encontrado:", !!pixCodeData);
      console.log("[PIX Create] Payment ID:", paymentId);
      console.log("[PIX Create] Response data structure:", JSON.stringify(responseData, null, 2));
      if (!qrCodeData || !pixCodeData) {
        console.log("[PIX Create] ERRO: QR Code ou PIX Code n\xE3o encontrado na resposta");
        return res.status(500).json({
          success: false,
          message: "Erro ao gerar c\xF3digo PIX - dados incompletos",
          details: "QR Code ou PIX Code n\xE3o retornado pela API"
        });
      }
      res.json({
        success: true,
        pixCode: pixCodeData,
        qrCode: qrCodeData,
        reference: identificadorExterno,
        amount: parsedAmount,
        expiresAt: expirationDate.toISOString(),
        paymentId
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
  app2.post("/api/payment/pix/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { paymentId, token } = req.body;
      if (!paymentId || !token) {
        return res.status(400).json({ message: "ID do pagamento e token s\xE3o obrigat\xF3rios" });
      }
      console.log(`[PIX Status] Verificando pagamento ID: ${paymentId}`);
      const statusResponse = await axios2.get(`https://gateway-homol.service-canvi.com.br/bt/pix/${paymentId}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Cookie": `token=${token}`
        }
      });
      const paymentStatus = statusResponse.data.status || statusResponse.data.situacao;
      const isCompleted = paymentStatus === "CONCLUIDO" || paymentStatus === "PAGO" || paymentStatus === "CONFIRMADO";
      console.log(`[PIX Status] Status do pagamento: ${paymentStatus}, Conclu\xEDdo: ${isCompleted}`);
      res.json({
        success: true,
        status: paymentStatus,
        isCompleted,
        paymentData: statusResponse.data
      });
    } catch (error) {
      console.error("Erro ao verificar status do pagamento PIX:", error.response?.data || error.message);
      if (error.response?.status === 404) {
        return res.json({
          success: true,
          status: "PENDENTE",
          isCompleted: false,
          message: "Pagamento ainda n\xE3o processado pelo gateway"
        });
      }
      res.status(500).json({
        success: false,
        message: "Erro ao verificar status do pagamento",
        details: error.response?.data?.message || error.message
      });
    }
  });
  app2.post("/api/payment/pix/webhook", async (req, res) => {
    try {
      console.log("[PIX Webhook] Notifica\xE7\xE3o recebida:", JSON.stringify(req.body, null, 2));
      const { identificador_externo, status, valor, id_invoice_pix } = req.body;
      if (!identificador_externo) {
        console.log("[PIX Webhook] Identificador externo n\xE3o encontrado");
        return res.status(400).json({ message: "Identificador externo obrigat\xF3rio" });
      }
      const serviceIdMatch = identificador_externo.match(/service_(\d+)_/);
      if (!serviceIdMatch) {
        console.log("[PIX Webhook] ServiceId n\xE3o encontrado no identificador:", identificador_externo);
        return res.status(400).json({ message: "ServiceId n\xE3o encontrado" });
      }
      const serviceId = parseInt(serviceIdMatch[1]);
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        console.log("[PIX Webhook] Servi\xE7o n\xE3o encontrado:", serviceId);
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const isCompleted = status === "CONCLUIDO" || status === "PAGO" || status === "CONFIRMADO";
      if (isCompleted) {
        console.log("[PIX Webhook] Pagamento confirmado para servi\xE7o:", serviceId);
        await storage.updateService(serviceId, {
          paymentStatus: "completed",
          status: "completed",
          completedAt: /* @__PURE__ */ new Date(),
          ratingRequired: true,
          storeRatingCompleted: false,
          assemblerRatingCompleted: false
        });
        const store = await storage.getStore(service.storeId);
        const storeUser = store ? await storage.getUser(store.userId) : null;
        const proofImageUrl = generatePaymentProofImage({
          serviceId,
          amount: service.price || "0",
          reference: identificador_externo,
          payerName: storeUser?.name || "Usu\xE1rio",
          timestamp: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR")
        });
        if (storeUser?.id) {
          const confirmationMessage = await storage.createMessage({
            serviceId,
            senderId: storeUser.id,
            content: `\u2705 **PAGAMENTO CONFIRMADO AUTOMATICAMENTE**

\u{1F4B0} Valor: R$ ${service.price}
\u{1F517} Refer\xEAncia: ${identificador_externo}
\u{1F4C5} Data: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}

*Comprovante gerado automaticamente pelo sistema PIX*`,
            messageType: "text"
          });
          const receiptMessage = await storage.createMessage({
            serviceId,
            senderId: storeUser.id,
            content: proofImageUrl,
            messageType: "image"
          });
          console.log("[PIX Webhook] Mensagens de comprovante criadas:", {
            confirmationId: confirmationMessage.id,
            receiptId: receiptMessage.id
          });
        }
        const clients2 = global.wsClients || /* @__PURE__ */ new Map();
        const acceptedApps = await db.select({ assemblerId: applications.assemblerId }).from(applications).where(
          and2(
            eq2(applications.serviceId, service.id),
            eq2(applications.status, "accepted")
          )
        ).limit(1);
        if (acceptedApps.length > 0) {
          const assemblerId = acceptedApps[0].assemblerId;
          const assemblerClients = clients2.get(assemblerId);
          if (assemblerClients && assemblerClients.length > 0) {
            assemblerClients.forEach((ws2) => {
              if (ws2.readyState === WebSocket.OPEN) {
                ws2.send(JSON.stringify({
                  type: "payment_confirmed",
                  serviceId,
                  message: "Pagamento confirmado! O servi\xE7o foi pago.",
                  amount: service.price
                }));
              }
            });
          }
        }
        if (storeUser) {
          const storeClients = clients2.get(storeUser.id);
          if (storeClients && storeClients.length > 0) {
            storeClients.forEach((ws2) => {
              if (ws2.readyState === WebSocket.OPEN) {
                ws2.send(JSON.stringify({
                  type: "payment_confirmed",
                  serviceId,
                  message: "Seu pagamento PIX foi confirmado!",
                  amount: service.price
                }));
              }
            });
          }
        }
        console.log("[PIX Webhook] Comprovante enviado no chat e notifica\xE7\xF5es enviadas");
      }
      res.json({ success: true, message: "Webhook processado com sucesso" });
    } catch (error) {
      console.error("Erro ao processar webhook PIX:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao processar webhook",
        details: error.message
      });
    }
  });
  app2.post("/api/payment/pix/simulate-confirm", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { serviceId } = req.body;
      if (!serviceId) {
        return res.status(400).json({ message: "ID do servi\xE7o \xE9 obrigat\xF3rio" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let paymentReference = service.paymentReference;
      if (!paymentReference) {
        paymentReference = `service_${serviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await storage.updateService(serviceId, { paymentReference });
      }
      console.log(`[PIX Simula\xE7\xE3o] Simulando pagamento para servi\xE7o ${serviceId} com refer\xEAncia ${paymentReference}`);
      const webhookData = {
        identificador_externo: paymentReference,
        status: "CONCLUIDO",
        valor: Math.round(parseFloat(service.price || "0") * 100),
        id_invoice_pix: `sim_${Date.now()}`
      };
      const webhookResponse = await axios2.post(`${req.protocol}://${req.get("host")}/api/payment/pix/webhook`, webhookData);
      res.json({
        success: true,
        message: "Pagamento simulado e confirmado com sucesso!",
        webhookResponse: webhookResponse.data
      });
    } catch (error) {
      console.error("Erro ao simular confirma\xE7\xE3o:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao simular confirma\xE7\xE3o",
        details: error.message
      });
    }
  });
  app2.post("/api/payment/pix/confirm", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { serviceId, paymentProof, paymentReference, isAutomatic } = req.body;
      if (!serviceId || !paymentProof) {
        return res.status(400).json({ message: "Comprovante de pagamento \xE9 obrigat\xF3rio" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      let proofImageUrl;
      if (isAutomatic) {
        proofImageUrl = generatePaymentProofImage({
          serviceId,
          amount: service.price || "0",
          reference: paymentReference,
          payerName: req.user.name,
          timestamp: (/* @__PURE__ */ new Date()).toLocaleString("pt-BR")
        });
      }
      const paymentMessage = await storage.createMessage({
        serviceId,
        senderId: req.user.id,
        content: isAutomatic ? `\u2705 **PAGAMENTO CONFIRMADO AUTOMATICAMENTE**

\u{1F4B0} Valor: R$ ${service.price}
\u{1F517} Refer\xEAncia: ${paymentReference}
\u{1F4C5} Data: ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}

*Comprovante gerado automaticamente pelo sistema PIX*` : paymentProof
      });
      await storage.updateService(serviceId, {
        paymentStatus: "proof_submitted",
        paymentProof
      });
      const userType = req.user.userType;
      let targetUserId = null;
      if (userType === "lojista") {
        const applicationResults = await db.select({ assemblerId: applications.assemblerId }).from(applications).where(
          and2(
            eq2(applications.serviceId, serviceId),
            eq2(applications.status, "accepted")
          )
        ).limit(1);
        if (applicationResults.length > 0) {
          const assemblerData = await storage.getAssemblerById(applicationResults[0].assemblerId);
          if (assemblerData) {
            targetUserId = assemblerData.userId;
          }
        }
      } else if (userType === "montador") {
        const store = await storage.getStore(service.storeId);
        if (store) {
          targetUserId = store.userId;
        }
      }
      if (targetUserId && global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user.id);
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
        message: "Erro ao processar confirma\xE7\xE3o de pagamento"
      });
    }
  });
  app2.post("/api/payment/pix/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { serviceId, approved } = req.body;
      if (!serviceId || typeof approved !== "boolean") {
        return res.status(400).json({ message: "Dados inv\xE1lidos para aprova\xE7\xE3o" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      const approvalStatus = approved ? "confirmed" : "rejected";
      const statusMessage = approved ? "confirmado" : "rejeitado";
      await storage.updateService(serviceId, {
        paymentStatus: approvalStatus
      });
      const confirmationMessage = await storage.createMessage({
        serviceId,
        senderId: req.user.id,
        content: `\u{1F4B0} PAGAMENTO ${statusMessage.toUpperCase()}

${approved ? "\u2705" : "\u274C"} O comprovante de pagamento foi ${statusMessage}.

${approved ? "O servi\xE7o pode prosseguir normalmente." : "Entre em contato para resolver a situa\xE7\xE3o do pagamento."}`,
        messageType: "payment_confirmation"
      });
      if (global.notifyNewMessage) {
        await global.notifyNewMessage(serviceId, req.user.id);
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
        message: "Erro ao processar aprova\xE7\xE3o de pagamento"
      });
    }
  });
  app2.post("/api/services/:id/rate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { id } = req.params;
      const serviceId = parseInt(id);
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avalia\xE7\xE3o deve ser entre 1 e 5 estrelas" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      if (service.status !== "completed") {
        return res.status(400).json({ message: "S\xF3 \xE9 poss\xEDvel avaliar servi\xE7os conclu\xEDdos" });
      }
      const fromUserId = req.user.id;
      const fromUserType = req.user.userType;
      let toUserId = null;
      let toUserType = null;
      if (fromUserType === "lojista") {
        const store = await storage.getStoreByUserId(fromUserId);
        if (!store || store.id !== service.storeId) {
          return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para avaliar este servi\xE7o" });
        }
        const acceptedApplications = await db.select().from(applications).innerJoin(assemblers, eq2(applications.assemblerId, assemblers.id)).where(
          and2(
            eq2(applications.serviceId, serviceId),
            eq2(applications.status, "accepted")
          )
        ).limit(1);
        if (acceptedApplications.length === 0) {
          return res.status(400).json({ message: "Nenhum montador encontrado para este servi\xE7o" });
        }
        toUserId = acceptedApplications[0].assemblers.userId;
        toUserType = "montador";
      } else if (fromUserType === "montador") {
        const assembler = await storage.getAssemblerByUserId(fromUserId);
        if (!assembler) {
          return res.status(403).json({ message: "Montador n\xE3o encontrado" });
        }
        const acceptedApplication = await db.select().from(applications).where(
          and2(
            eq2(applications.serviceId, serviceId),
            eq2(applications.assemblerId, assembler.id),
            eq2(applications.status, "accepted")
          )
        ).limit(1);
        if (acceptedApplication.length === 0) {
          return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para avaliar este servi\xE7o" });
        }
        const store = await storage.getStore(service.storeId);
        if (!store) {
          return res.status(400).json({ message: "Loja n\xE3o encontrada" });
        }
        toUserId = store.userId;
        toUserType = "lojista";
      } else {
        return res.status(403).json({ message: "Tipo de usu\xE1rio inv\xE1lido" });
      }
      const existingRating = await storage.getRatingByServiceIdAndUser(serviceId, fromUserId, toUserId);
      if (existingRating) {
        return res.status(400).json({ message: "Voc\xEA j\xE1 avaliou este servi\xE7o" });
      }
      let newRating;
      try {
        newRating = await storage.createRating({
          serviceId,
          fromUserId,
          toUserId,
          fromUserType,
          toUserType,
          rating,
          comment: comment || null
        });
      } catch (dbError) {
        if (dbError.code === "23505" || dbError.message?.includes("unique_rating_per_service_user")) {
          return res.status(400).json({
            message: "Voc\xEA j\xE1 avaliou este servi\xE7o. Cada usu\xE1rio pode avaliar um servi\xE7o apenas uma vez."
          });
        }
        throw dbError;
      }
      if (toUserType === "montador") {
        const assembler = await storage.getAssemblerByUserId(toUserId);
        if (assembler) {
          const newAverageRating = await storage.getAverageRatingForUser(toUserId);
          await storage.updateAssembler(assembler.id, { rating: newAverageRating });
        }
      } else if (toUserType === "lojista") {
      }
      const allRatings = await storage.getRatingsByServiceId(serviceId);
      const hasStoreRating = allRatings.some((r) => r.fromUserType === "lojista");
      const hasAssemblerRating = allRatings.some((r) => r.fromUserType === "montador");
      const updateData = {};
      if (fromUserType === "lojista") {
        updateData.storeRatingCompleted = true;
      } else if (fromUserType === "montador") {
        updateData.assemblerRatingCompleted = true;
      }
      if (hasStoreRating && hasAssemblerRating) {
        updateData.bothRatingsCompleted = true;
      }
      await storage.updateService(serviceId, updateData);
      res.status(201).json({
        success: true,
        rating: newRating,
        message: "Avalia\xE7\xE3o criada com sucesso"
      });
    } catch (error) {
      console.error("Erro ao criar avalia\xE7\xE3o:", error);
      if (error.code === "23505" || error.message?.includes("unique_rating_per_service_user")) {
        return res.status(400).json({
          message: "Voc\xEA j\xE1 avaliou este servi\xE7o. Cada usu\xE1rio pode avaliar um servi\xE7o apenas uma vez."
        });
      }
      res.status(500).json({
        message: "Erro interno do servidor ao processar avalia\xE7\xE3o",
        details: process.env.NODE_ENV === "development" ? error.message : void 0
      });
    }
  });
  app2.get("/api/services/pending-ratings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const user = req.user;
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      console.log("[DEBUG] Pending ratings - user:", user.id, user.userType);
      return res.json({
        pendingRatings: [],
        hasPendingRatings: false
      });
    } catch (error) {
      console.error("Erro ao buscar avalia\xE7\xF5es pendentes:", error);
      return res.json({
        pendingRatings: [],
        hasPendingRatings: false
      });
    }
  });
  app2.get("/api/ranking", async (req, res) => {
    try {
      const { type } = req.query;
      if (!type || type !== "lojista" && type !== "montador") {
        return res.status(400).json({ message: "Tipo deve ser 'lojista' ou 'montador'" });
      }
      let rankingData = [];
      if (type === "lojista") {
        const storesData = await db.select().from(stores).innerJoin(users, eq2(stores.userId, users.id));
        const storesWithRating = await Promise.all(
          storesData.map(async (storeData) => {
            const rating = await storage.getAverageRatingForUser(storeData.users.id);
            return {
              id: storeData.users.id,
              // User ID for profile link
              storeId: storeData.stores.id,
              name: storeData.stores.name,
              city: storeData.stores.city,
              state: storeData.stores.state,
              logoUrl: storeData.stores.logoUrl,
              rating,
              userType: "lojista"
            };
          })
        );
        rankingData = storesWithRating.filter((store) => store.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
      } else {
        const assemblers2 = await db.select().from(assemblers).innerJoin(users, eq2(assemblers.userId, users.id));
        const assemblersWithRating = await Promise.all(
          assemblers2.map(async (assemblerData) => {
            const rating = await storage.getAverageRatingForUser(assemblerData.users.id);
            return {
              id: assemblerData.users.id,
              // User ID for profile link
              assemblerId: assemblerData.assemblers.id,
              name: assemblerData.users.name,
              city: assemblerData.assemblers.city,
              state: assemblerData.assemblers.state,
              specialties: assemblerData.assemblers.specialties,
              rating,
              userType: "montador"
            };
          })
        );
        rankingData = assemblersWithRating.filter((assembler) => assembler.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
      }
      res.json({
        type,
        ranking: rankingData
      });
    } catch (error) {
      console.error("Erro ao buscar ranking:", error);
      res.status(500).json({ message: "Erro ao buscar ranking" });
    }
  });
  app2.post("/api/services/:id/rate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const serviceId = Number(req.params.id);
      const { rating, comment, emojiRating } = req.body;
      if (!rating) {
        return res.status(400).json({ message: "Avalia\xE7\xE3o \xE9 obrigat\xF3ria" });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avalia\xE7\xE3o deve ser entre 1 e 5" });
      }
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servi\xE7o n\xE3o encontrado" });
      }
      if (service.status !== "completed") {
        return res.status(400).json({ message: "S\xF3 \xE9 poss\xEDvel avaliar servi\xE7os conclu\xEDdos" });
      }
      const fromUserId = req.user.id;
      const userType = req.user.userType;
      let toUserId;
      let isAuthorized = false;
      if (userType === "lojista") {
        const store = await storage.getStoreByUserId(fromUserId);
        if (store && store.id === service.storeId) {
          isAuthorized = true;
          const acceptedApplications = await db.select({ assemblerId: applications.assemblerId }).from(applications).where(
            and2(
              eq2(applications.serviceId, serviceId),
              eq2(applications.status, "accepted")
            )
          ).limit(1);
          if (acceptedApplications.length > 0) {
            const assembler = await storage.getAssemblerById(acceptedApplications[0].assemblerId);
            if (assembler) {
              toUserId = assembler.userId;
            } else {
              return res.status(400).json({ message: "Montador n\xE3o encontrado para este servi\xE7o" });
            }
          } else {
            return res.status(400).json({ message: "Montador n\xE3o encontrado para este servi\xE7o" });
          }
        }
      } else if (userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(fromUserId);
        if (assembler) {
          const application = await storage.getApplicationByServiceAndAssembler(serviceId, assembler.id);
          if (application && application.status === "accepted") {
            isAuthorized = true;
            const store = await storage.getStore(service.storeId);
            if (store) {
              toUserId = store.userId;
            } else {
              return res.status(400).json({ message: "Loja n\xE3o encontrada para este servi\xE7o" });
            }
          }
        }
      }
      if (!isAuthorized) {
        return res.status(403).json({ message: "Voc\xEA n\xE3o est\xE1 autorizado a avaliar este servi\xE7o" });
      }
      const existingRating = await storage.getRatingByServiceIdAndUser(serviceId, fromUserId, toUserId);
      if (existingRating) {
        return res.status(400).json({ message: "Voc\xEA j\xE1 avaliou este usu\xE1rio para este servi\xE7o" });
      }
      const fromUserType = req.user.userType;
      const toUserType = fromUserType === "lojista" ? "montador" : "lojista";
      const newRating = await storage.createRating({
        serviceId,
        fromUserId,
        toUserId,
        rating,
        comment,
        emojiRating,
        fromUserType,
        toUserType
      });
      const updateData = {};
      if (fromUserType === "montador") {
        updateData.assemblerRatingCompleted = true;
      } else if (fromUserType === "lojista") {
        updateData.storeRatingCompleted = true;
      }
      await storage.updateService(serviceId, updateData);
      sendNotification(toUserId, {
        type: "new_rating",
        message: `Voc\xEA recebeu uma nova avalia\xE7\xE3o para o servi\xE7o ${service.title}`,
        serviceId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.status(201).json(newRating);
    } catch (error) {
      console.error("Erro ao criar avalia\xE7\xE3o:", error);
      res.status(500).json({ message: "Erro ao criar avalia\xE7\xE3o" });
    }
  });
  app2.get("/api/ranking", async (req, res) => {
    try {
      const query = `
        SELECT 
          u.id,
          u.name,
          u."userType",
          u."profilePhotoUrl",
          ROUND(AVG(r.rating::numeric), 1) as average_rating,
          COUNT(r.id) as total_ratings
        FROM users u
        INNER JOIN ratings r ON u.id = r."toUserId"
        GROUP BY u.id, u.name, u."userType", u."profilePhotoUrl"
        HAVING COUNT(r.id) >= 1
        ORDER BY average_rating DESC, total_ratings DESC
        LIMIT 10
      `;
      const result = await db.execute(sql2.raw(query));
      const ranking = result.rows.map((row, index) => ({
        position: index + 1,
        id: row.id,
        name: row.name,
        userType: row.userType,
        profilePhotoUrl: row.profilePhotoUrl || "/default-avatar.svg",
        averageRating: parseFloat(row.average_rating || "0"),
        totalRatings: parseInt(row.total_ratings || "0")
      }));
      res.json(ranking);
    } catch (error) {
      console.error("Erro ao buscar ranking:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/banking/pix-ready", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      const bankAccounts3 = await storage.getBankAccountsByUserId(user.id);
      const hasBankAccount = bankAccounts3 && bankAccounts3.length > 0;
      const hasPixKey = bankAccounts3 && bankAccounts3.some((account) => account.pixKey && account.pixKeyType);
      let hasProfileDocuments = false;
      if (user.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(user.id);
        hasProfileDocuments = !!(assembler && assembler.documentType && assembler.documentNumber);
      } else if (user.userType === "lojista") {
        const store = await storage.getStoreByUserId(user.id);
        hasProfileDocuments = !!(store && store.documentType && store.documentNumber);
      }
      const isPixReady = hasBankAccount || hasProfileDocuments;
      res.json({
        isPixReady,
        hasBankAccount,
        hasPixKey,
        hasProfileDocuments,
        recommendations: !isPixReady ? [
          "Cadastre uma conta banc\xE1ria com chave PIX para facilitar recebimentos",
          "Complete os dados de CPF/CNPJ no seu perfil"
        ] : hasPixKey ? [] : [
          "Adicione uma chave PIX \xE0 sua conta banc\xE1ria para recebimentos mais r\xE1pidos"
        ]
      });
    } catch (error) {
      console.error("Erro ao verificar dados PIX:", error);
      res.status(500).json({ message: "Erro ao verificar configura\xE7\xE3o PIX" });
    }
  });
  app2.get("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const bankAccounts3 = await storage.getBankAccountsByUserId(req.user.id);
      res.json(bankAccounts3);
    } catch (error) {
      console.error("Erro ao buscar contas banc\xE1rias:", error);
      res.status(500).json({ message: "Erro ao buscar contas banc\xE1rias" });
    }
  });
  app2.get("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta banc\xE1ria inv\xE1lido" });
      }
      const bankAccount = await storage.getBankAccountById(bankAccountId);
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta banc\xE1ria n\xE3o encontrada" });
      }
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para acessar esta conta banc\xE1ria" });
      }
      res.json(bankAccount);
    } catch (error) {
      console.error("Erro ao buscar conta banc\xE1ria:", error);
      res.status(500).json({ message: "Erro ao buscar conta banc\xE1ria" });
    }
  });
  app2.post("/api/bank-accounts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { holderDocumentType, holderDocumentNumber } = req.body;
      if (holderDocumentType && holderDocumentNumber) {
        const cleanDocumentNumber = holderDocumentNumber.replace(/[^\d]/g, "");
        if (holderDocumentType === "cpf" && cleanDocumentNumber.length !== 11) {
          return res.status(400).json({
            message: "CPF deve ter exatamente 11 d\xEDgitos. Documento fornecido possui " + cleanDocumentNumber.length + " d\xEDgitos."
          });
        } else if (holderDocumentType === "cnpj" && cleanDocumentNumber.length !== 14) {
          return res.status(400).json({
            message: "CNPJ deve ter exatamente 14 d\xEDgitos. Documento fornecido possui " + cleanDocumentNumber.length + " d\xEDgitos."
          });
        }
      }
      const bankAccountData = {
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
      console.error("Erro ao criar conta banc\xE1ria:", error);
      res.status(500).json({ message: "Erro ao criar conta banc\xE1ria" });
    }
  });
  app2.patch("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta banc\xE1ria inv\xE1lido" });
      }
      const bankAccount = await storage.getBankAccountById(bankAccountId);
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta banc\xE1ria n\xE3o encontrada" });
      }
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para atualizar esta conta banc\xE1ria" });
      }
      const { holderDocumentType, holderDocumentNumber } = req.body;
      if (holderDocumentType && holderDocumentNumber) {
        const cleanDocumentNumber = holderDocumentNumber.replace(/[^\d]/g, "");
        if (holderDocumentType === "cpf" && cleanDocumentNumber.length !== 11) {
          return res.status(400).json({
            message: "CPF deve ter exatamente 11 d\xEDgitos. Documento fornecido possui " + cleanDocumentNumber.length + " d\xEDgitos."
          });
        } else if (holderDocumentType === "cnpj" && cleanDocumentNumber.length !== 14) {
          return res.status(400).json({
            message: "CNPJ deve ter exatamente 14 d\xEDgitos. Documento fornecido possui " + cleanDocumentNumber.length + " d\xEDgitos."
          });
        }
      }
      const allowedFields = [
        "bankName",
        "accountType",
        "accountNumber",
        "agency",
        "holderName",
        "holderDocumentType",
        "holderDocumentNumber",
        "pixKey",
        "pixKeyType"
      ];
      const updateData = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== void 0) {
          updateData[field] = req.body[field];
        }
      });
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo v\xE1lido para atualiza\xE7\xE3o" });
      }
      const updatedBankAccount = await storage.updateBankAccount(bankAccountId, updateData);
      res.json(updatedBankAccount);
    } catch (error) {
      console.error("Erro ao atualizar conta banc\xE1ria:", error);
      res.status(500).json({ message: "Erro ao atualizar conta banc\xE1ria" });
    }
  });
  app2.delete("/api/bank-accounts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const bankAccountId = parseInt(req.params.id);
      if (isNaN(bankAccountId)) {
        return res.status(400).json({ message: "ID de conta banc\xE1ria inv\xE1lido" });
      }
      const bankAccount = await storage.getBankAccountById(bankAccountId);
      if (!bankAccount) {
        return res.status(404).json({ message: "Conta banc\xE1ria n\xE3o encontrada" });
      }
      if (bankAccount.userId !== req.user.id) {
        return res.status(403).json({ message: "Voc\xEA n\xE3o tem permiss\xE3o para excluir esta conta banc\xE1ria" });
      }
      await storage.deleteBankAccount(bankAccountId);
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir conta banc\xE1ria:", error);
      res.status(500).json({ message: "Erro ao excluir conta banc\xE1ria" });
    }
  });
  app2.get("/api/ranking", async (req, res) => {
    try {
      const { type } = req.query;
      if (!type || type !== "lojista" && type !== "montador") {
        return res.status(400).json({ message: "Tipo de ranking inv\xE1lido. Use 'lojista' ou 'montador'" });
      }
      let ranking = [];
      if (type === "montador") {
        const assemblerRankings = await db.select({
          id: assemblers.id,
          userId: assemblers.userId,
          name: users.name,
          city: assemblers.city,
          state: assemblers.state,
          specialties: assemblers.specialties,
          averageRating: sql2`COALESCE(AVG(CAST(${ratings.rating} AS FLOAT)), 0)`,
          totalRatings: sql2`COUNT(${ratings.id})`
        }).from(assemblers).leftJoin(users, eq2(assemblers.userId, users.id)).leftJoin(ratings, and2(
          eq2(ratings.toUserId, users.id),
          eq2(ratings.toUserType, "montador")
        )).groupBy(assemblers.id, users.id, users.name, assemblers.city, assemblers.state, assemblers.specialties).having(sql2`COUNT(${ratings.id}) > 0`).orderBy(sql2`AVG(CAST(${ratings.rating} AS FLOAT)) DESC, COUNT(${ratings.id}) DESC`).limit(10);
        ranking = assemblerRankings.map((item) => ({
          id: item.id,
          name: item.name || "Nome n\xE3o informado",
          city: item.city || "Cidade n\xE3o informada",
          state: item.state || "Estado n\xE3o informado",
          rating: Number(item.averageRating),
          userType: "montador",
          specialties: item.specialties || []
        }));
      } else if (type === "lojista") {
        const storeRankings = await db.select({
          id: stores.id,
          userId: stores.userId,
          name: stores.name,
          city: stores.city,
          state: stores.state,
          logoUrl: stores.logoUrl,
          averageRating: sql2`COALESCE(AVG(CAST(${ratings.rating} AS FLOAT)), 0)`,
          totalRatings: sql2`COUNT(${ratings.id})`
        }).from(stores).leftJoin(users, eq2(stores.userId, users.id)).leftJoin(ratings, and2(
          eq2(ratings.toUserId, users.id),
          eq2(ratings.toUserType, "lojista")
        )).groupBy(stores.id, stores.name, stores.city, stores.state, stores.logoUrl).having(sql2`COUNT(${ratings.id}) > 0`).orderBy(sql2`AVG(CAST(${ratings.rating} AS FLOAT)) DESC, COUNT(${ratings.id}) DESC`).limit(10);
        ranking = storeRankings.map((item) => ({
          id: item.id,
          name: item.name || "Nome n\xE3o informado",
          city: item.city || "Cidade n\xE3o informada",
          state: item.state || "Estado n\xE3o informado",
          rating: Number(item.averageRating),
          userType: "lojista",
          logoUrl: item.logoUrl
        }));
      }
      res.json({
        type,
        ranking
      });
    } catch (error) {
      console.error("Erro ao buscar ranking:", error);
      res.status(500).json({ message: "Erro ao buscar ranking de avalia\xE7\xF5es" });
    }
  });
  app2.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usu\xE1rio inv\xE1lido" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      const ratingsQuery = await db.select({
        id: ratings.id,
        rating: ratings.rating,
        comment: ratings.comment,
        createdAt: ratings.createdAt,
        fromUserName: sql2`from_user.name`,
        fromUserType: ratings.fromUserType,
        punctualityRating: ratings.punctualityRating,
        qualityRating: ratings.qualityRating,
        complianceRating: ratings.complianceRating,
        serviceRegion: ratings.serviceRegion,
        isLatest: ratings.isLatest,
        emojiRating: ratings.emojiRating
      }).from(ratings).innerJoin(sql2`users as from_user`, sql2`from_user.id = ${ratings.fromUserId}`).where(eq2(ratings.toUserId, userId)).orderBy(desc2(ratings.createdAt));
      const averageRating = await storage.getAverageRatingForUser(userId);
      const totalRatings = ratingsQuery.length;
      let userProfile = {
        id: user.id,
        name: user.name,
        userType: user.userType,
        profilePhotoUrl: user.profilePhotoUrl || "/default-avatar.svg",
        averageRating,
        totalRatings,
        ratings: ratingsQuery.map((rating) => ({
          id: rating.id,
          rating: rating.rating,
          comment: rating.comment || "",
          createdAt: rating.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
          fromUserName: rating.fromUserName,
          fromUserType: rating.fromUserType,
          punctualityRating: rating.punctualityRating || 5,
          qualityRating: rating.qualityRating || 5,
          complianceRating: rating.complianceRating || 5,
          serviceRegion: rating.serviceRegion || "Regi\xE3o n\xE3o informada",
          isLatest: rating.isLatest || false,
          emojiRating: rating.emojiRating || "satisfied"
        }))
      };
      if (user.userType === "montador") {
        const assembler = await storage.getAssemblerByUserId(userId);
        if (assembler) {
          userProfile.city = assembler.city;
          userProfile.state = assembler.state;
          userProfile.specialties = assembler.specialties || [];
        }
      } else if (user.userType === "lojista") {
        const store = await storage.getStoreByUserId(userId);
        if (store) {
          userProfile.city = store.city;
          userProfile.state = store.state;
          userProfile.specialties = [];
        }
      }
      res.json(userProfile);
    } catch (error) {
      console.error("Erro ao buscar perfil do usu\xE1rio:", error);
      res.status(500).json({ message: "Erro ao buscar perfil do usu\xE1rio" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path5 from "path";
import { fileURLToPath } from "url";
import fs4 from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path5.dirname(__filename);
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use("/uploads", express3.static(path5.join(process.cwd(), "uploads")));
app.get("/default-avatar.svg", (req, res) => {
  res.sendFile(path5.join(process.cwd(), "default-avatar.svg"));
});
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const distPath = path5.resolve(process.cwd(), "dist", "public");
    if (fs4.existsSync(distPath)) {
      app.use(express3.static(distPath));
      app.use("*", (_req, res) => {
        res.sendFile(path5.resolve(distPath, "index.html"));
      });
    } else {
      serveStatic(app);
    }
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
