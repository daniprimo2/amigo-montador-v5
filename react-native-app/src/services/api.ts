import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Service, Application, Message, Rating, BankAccount, Store, Assembler } from '../types/database';

// Configuração da API - ajuste a URL base conforme necessário
const API_BASE_URL = 'https://amigomontador.replit.app'; // Substitua pela URL do seu servidor

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadAuthToken();
  }

  private async loadAuthToken() {
    try {
      this.authToken = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Erro ao carregar token de autenticação:', error);
    }
  }

  private async saveAuthToken(token: string) {
    try {
      await AsyncStorage.setItem('auth_token', token);
      this.authToken = token;
    } catch (error) {
      console.error('Erro ao salvar token de autenticação:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      throw error;
    }
  }

  // Autenticação
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.token) {
      await this.saveAuthToken(response.token);
    }

    return response;
  }

  async register(userData: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    birthDate: string;
    userType: 'lojista' | 'montador';
    profilePhotoUrl: string;
  }): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      await this.saveAuthToken(response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
    this.authToken = null;
  }

  // Usuários
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/user/profile');
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/api/user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  // Lojas
  async createStore(storeData: Omit<Store, 'id'>): Promise<Store> {
    return this.request<Store>('/api/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
  }

  async getStoreByUserId(userId: number): Promise<Store | null> {
    return this.request<Store | null>(`/api/stores/user/${userId}`);
  }

  async updateStore(storeId: number, storeData: Partial<Store>): Promise<Store> {
    return this.request<Store>(`/api/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(storeData),
    });
  }

  // Montadores
  async createAssembler(assemblerData: Omit<Assembler, 'id'>): Promise<Assembler> {
    return this.request<Assembler>('/api/assemblers', {
      method: 'POST',
      body: JSON.stringify(assemblerData),
    });
  }

  async getAssemblerByUserId(userId: number): Promise<Assembler | null> {
    return this.request<Assembler | null>(`/api/assemblers/user/${userId}`);
  }

  async updateAssembler(assemblerId: number, assemblerData: Partial<Assembler>): Promise<Assembler> {
    return this.request<Assembler>(`/api/assemblers/${assemblerId}`, {
      method: 'PATCH',
      body: JSON.stringify(assemblerData),
    });
  }

  // Serviços
  async getServices(filters?: {
    status?: string;
    location?: string;
    materialType?: string;
  }): Promise<Service[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const endpoint = `/api/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Service[]>(endpoint);
  }

  async getServiceById(serviceId: number): Promise<Service> {
    return this.request<Service>(`/api/services/${serviceId}`);
  }

  async createService(serviceData: Omit<Service, 'id' | 'createdAt'>): Promise<Service> {
    return this.request<Service>('/api/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId: number, serviceData: Partial<Service>): Promise<Service> {
    return this.request<Service>(`/api/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(serviceId: number): Promise<void> {
    await this.request(`/api/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Candidaturas
  async getApplicationsByServiceId(serviceId: number): Promise<Application[]> {
    return this.request<Application[]>(`/api/applications/service/${serviceId}`);
  }

  async createApplication(applicationData: Omit<Application, 'id' | 'createdAt'>): Promise<Application> {
    return this.request<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async acceptApplication(applicationId: number): Promise<void> {
    await this.request(`/api/applications/${applicationId}/accept`, {
      method: 'POST',
    });
  }

  // Mensagens
  async getMessagesByServiceId(serviceId: number): Promise<Message[]> {
    return this.request<Message[]>(`/api/messages/service/${serviceId}`);
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    return this.request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async markMessagesAsRead(serviceId: number, userId: number): Promise<void> {
    await this.request('/api/messages/mark-read', {
      method: 'POST',
      body: JSON.stringify({ serviceId, userId }),
    });
  }

  // Avaliações
  async createRating(ratingData: Omit<Rating, 'id' | 'createdAt'>): Promise<Rating> {
    return this.request<Rating>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  async getRatingsByServiceId(serviceId: number): Promise<Rating[]> {
    return this.request<Rating[]>(`/api/ratings/service/${serviceId}`);
  }

  // Contas bancárias
  async getBankAccountsByUserId(userId: number): Promise<BankAccount[]> {
    return this.request<BankAccount[]>(`/api/bank-accounts/user/${userId}`);
  }

  async createBankAccount(bankAccountData: Omit<BankAccount, 'id' | 'createdAt'>): Promise<BankAccount> {
    return this.request<BankAccount>('/api/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(bankAccountData),
    });
  }

  async updateBankAccount(accountId: number, bankAccountData: Partial<BankAccount>): Promise<BankAccount> {
    return this.request<BankAccount>(`/api/bank-accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify(bankAccountData),
    });
  }

  async deleteBankAccount(accountId: number): Promise<void> {
    await this.request(`/api/bank-accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  // Upload de arquivos
  async uploadFile(file: any, folder: string = 'uploads'): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload error! status: ${response.status}`);
    }

    return response.json();
  }

  // Geocoding
  async geocodeFromCEP(cep: string): Promise<{ latitude: string; longitude: string }> {
    return this.request<{ latitude: string; longitude: string }>(`/api/geocoding/cep/${cep}`);
  }
}

// Instância singleton da API
export const apiService = new ApiService(API_BASE_URL);
export default apiService;