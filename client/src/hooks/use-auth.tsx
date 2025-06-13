import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type RegisterUserData = {
  username: string;
  password: string;
  name: string;
  userType: 'lojista' | 'montador';
  [key: string]: any;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterUserData>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const { data: user, error, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", { credentials: "include" });
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        const userData = await res.json();
        return userData as SelectUser;
      } catch (error) {
        console.error('AuthProvider - Erro ao buscar usuário:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest({
        method: "POST", 
        url: "/api/login", 
        data: credentials
      });
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log('loginMutation sucesso, atualizando queryClient com usuário:', user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Disparar evento de login para outros componentes
      window.dispatchEvent(new CustomEvent('auth:login-success', { detail: user }));
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterUserData) => {
      // Criar FormData para enviar arquivos
      const formData = new FormData();
      
      // Adicionar todos os campos de texto
      Object.keys(userData).forEach(key => {
        if (key !== 'profilePicture' && key !== 'logoFile') {
          const value = userData[key];
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
      });
      
      // Adicionar arquivos se existirem
      if (userData.profilePicture && userData.profilePicture instanceof FileList && userData.profilePicture.length > 0) {
        formData.append('profilePicture', userData.profilePicture[0]);
      }
      
      if (userData.logoFile && userData.logoFile instanceof FileList && userData.logoFile.length > 0) {
        formData.append('logoFile', userData.logoFile[0]);
      }
      
      const res = await fetch('/api/register', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro no cadastro');
      }
      
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log('registerMutation sucesso, atualizando queryClient com usuário:', user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Disparar evento de registro para outros componentes
      window.dispatchEvent(new CustomEvent('auth:register-success', { detail: user }));
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no cadastro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest({
        method: "POST", 
        url: "/api/logout"
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Log para depuração
  console.log('AuthProvider - Estado do usuário:', { user, isLoading, error });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
