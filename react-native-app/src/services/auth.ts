import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/database';
import { databaseService } from './database';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private currentUser: User | null = null;

  async init(): Promise<AuthState> {
    try {
      const token = await AsyncStorage.getItem('user_token');
      const userStr = await AsyncStorage.getItem('current_user');
      
      if (token && userStr) {
        this.currentUser = JSON.parse(userStr);
        return {
          user: this.currentUser,
          isAuthenticated: true,
          isLoading: false,
        };
      }
    } catch (error) {
      console.error('Erro ao carregar dados de autenticação:', error);
    }

    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Verifica no banco local primeiro
      const user = await databaseService.getUserByUsername(username);
      
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Verifica senha (em produção, use hash)
      if (user.password !== password) {
        return { success: false, error: 'Senha incorreta' };
      }

      // Salva dados de autenticação
      const token = `token_${Date.now()}`;
      await AsyncStorage.setItem('user_token', token);
      await AsyncStorage.setItem('current_user', JSON.stringify(user));
      
      this.currentUser = user;

      return { success: true, user };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro interno do sistema' };
    }
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
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Verifica se usuário já existe
      const existingUser = await databaseService.getUserByUsername(userData.username);
      if (existingUser) {
        return { success: false, error: 'Nome de usuário já existe' };
      }

      // Cria novo usuário
      const user = await databaseService.createUser(userData);

      // Salva dados de autenticação
      const token = `token_${Date.now()}`;
      await AsyncStorage.setItem('user_token', token);
      await AsyncStorage.setItem('current_user', JSON.stringify(user));
      
      this.currentUser = user;

      return { success: true, user };
    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, error: 'Erro ao criar conta' };
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('current_user');
      this.currentUser = null;
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async updateUser(userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      // Atualiza no banco de dados local
      // Para simplificar, vamos apenas atualizar o AsyncStorage
      const updatedUser = { ...this.currentUser, ...userData };
      await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
      this.currentUser = updatedUser;

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return { success: false, error: 'Erro ao atualizar dados' };
    }
  }
}

export const authService = new AuthService();