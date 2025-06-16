// Tipos do banco de dados integrados no React Native
export const SERVICE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type ServiceStatus = typeof SERVICE_STATUS[keyof typeof SERVICE_STATUS];

// Interface para Usuário
export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  birthDate: string;
  userType: 'lojista' | 'montador';
  profilePhotoUrl: string;
  profileData?: any;
  createdAt?: Date;
}

// Interface para Loja
export interface Store {
  id: number;
  userId: number;
  name: string;
  documentType: 'cpf' | 'cnpj';
  documentNumber: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  logoUrl: string;
  materialTypes?: string[];
}

// Interface para Montador
export interface Assembler {
  id: number;
  userId: number;
  address: string;
  addressNumber?: string;
  neighborhood?: string;
  cep?: string;
  city: string;
  state: string;
  specialties?: string[];
  technicalAssistance: boolean;
  experience?: string;
  workRadius: number;
  rating?: number;
  documents?: any;
  documentType?: 'cpf' | 'cnpj';
  documentNumber?: string;
  rgFrontUrl: string;
  rgBackUrl: string;
  proofOfAddressUrl: string;
  certificatesUrls?: string[];
  experienceYears: number;
  serviceTypes?: string[];
  availability?: any;
  hasOwnTools: boolean;
  professionalDescription?: string;
}

// Interface para Serviço
export interface Service {
  id: number;
  storeId: number;
  title: string;
  description: string;
  location: string;
  address?: string;
  addressNumber?: string;
  cep?: string;
  latitude: string;
  longitude: string;
  startDate: Date;
  endDate: Date;
  price: string;
  status: ServiceStatus;
  materialType: string;
  projectFiles: string[];
  paymentReference?: string;
  paymentStatus: 'pending' | 'proof_submitted' | 'confirmed' | 'rejected';
  paymentProof?: string;
  ratingRequired: boolean;
  storeRatingCompleted: boolean;
  assemblerRatingCompleted: boolean;
  createdAt?: Date;
}

// Interface para Candidatura
export interface Application {
  id: number;
  serviceId: number;
  assemblerId: number;
  message: string;
  price: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: Date;
}

// Interface para Mensagem
export interface Message {
  id: number;
  serviceId: number;
  fromUserId: number;
  toUserId: number;
  content: string;
  fileUrl?: string;
  createdAt?: Date;
}

// Interface para Avaliação
export interface Rating {
  id: number;
  serviceId: number;
  fromUserId: number;
  toUserId: number;
  rating: number;
  comment?: string;
  createdAt?: Date;
}

// Interface para Conta Bancária
export interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  accountType: 'corrente' | 'poupanca';
  agency: string;
  accountNumber: string;
  accountHolder: string;
  documentNumber: string;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'telefone' | 'email' | 'chave_aleatoria';
  isMain: boolean;
  createdAt?: Date;
}

// Types para inserção (sem ID)
export type InsertUser = Omit<User, 'id' | 'createdAt'>;
export type InsertStore = Omit<Store, 'id'>;
export type InsertAssembler = Omit<Assembler, 'id'>;
export type InsertService = Omit<Service, 'id' | 'createdAt'>;
export type InsertApplication = Omit<Application, 'id' | 'createdAt'>;
export type InsertMessage = Omit<Message, 'id' | 'createdAt'>;
export type InsertRating = Omit<Rating, 'id' | 'createdAt'>;
export type InsertBankAccount = Omit<BankAccount, 'id' | 'createdAt'>;