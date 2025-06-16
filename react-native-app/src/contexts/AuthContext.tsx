import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types/database';
import { authService, AuthState } from '../services/auth';
import { databaseService } from '../services/database';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    birthDate: string;
    userType: 'lojista' | 'montador';
    profilePhotoUrl: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Inicializa o banco de dados
      await databaseService.init();
      
      // Carrega estado de autenticação
      const state = await authService.init();
      setAuthState(state);
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    const result = await authService.login(username, password);
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } else {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return { success: false, error: result.error };
    }
  };

  const register = async (userData: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    birthDate: string;
    userType: 'lojista' | 'montador';
    profilePhotoUrl: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    const result = await authService.register(userData);
    
    if (result.success && result.user) {
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } else {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    await authService.logout();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const updateUser = async (userData: Partial<User>) => {
    const result = await authService.updateUser(userData);
    
    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user,
      }));
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};