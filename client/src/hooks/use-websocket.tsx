import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

// Função global de debug para maior visibilidade nos logs
const debugLogger = (context: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] ${message}`, data || '');
};

type WebSocketMessage = {
  type: 'connection' | 'new_application' | 'new_message' | 'application_accepted';
  message: string;
  serviceId?: number;
  timestamp?: string;
};

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!user) {
      debugLogger('WebSocket', 'Tentativa de conexão sem usuário autenticado');
      return;
    }

    // Fechar conexão anterior se existir
    if (socketRef.current) {
      debugLogger('WebSocket', 'Fechando conexão WebSocket existente');
      socketRef.current.close();
    }

    // Criar nova conexão
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    debugLogger('WebSocket', `Iniciando conexão para usuário ${user.id}`, { url: wsUrl });
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      debugLogger('WebSocket', 'Conexão estabelecida com sucesso');
      setConnected(true);
    };

    socket.onclose = (event) => {
      debugLogger('WebSocket', `Conexão fechada: Código ${event.code}, Motivo: ${event.reason || 'Não especificado'}`);
      setConnected(false);
      
      // Tentar reconectar após 5 segundos apenas se o componente ainda estiver montado
      if (user) {
        debugLogger('WebSocket', 'Agendando reconexão em 5 segundos');
        const timeoutId = setTimeout(() => {
          debugLogger('WebSocket', 'Tentando reconexão automática');
          connect();
        }, 5000);
        
        // Armazenar o ID do timeout para cancelar se necessário
        return () => clearTimeout(timeoutId);
      }
    };

    socket.onerror = (error) => {
      debugLogger('WebSocket', 'Erro na conexão WebSocket', error);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        debugLogger('WebSocket', `Mensagem recebida: ${data.type}`, data);
        
        // Atualizar último estado da mensagem
        setLastMessage(data);
        
        // Mostrar notificação toast e invalidar queries necessárias
        if (data.type === 'new_application') {
          debugLogger('WebSocket', 'Processando notificação de nova candidatura', {
            serviceId: data.serviceId
          });
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
          
          toast({
            title: 'Nova candidatura',
            description: data.message,
            duration: 5000
          });
          
          // Importante: debugar para verificar se isto está sendo executado
          debugLogger('WebSocket', 'Notificação de candidatura processada com sucesso', {
            message: data.message,
            serviceId: data.serviceId
          });
        } else if (data.type === 'new_message') {
          debugLogger('WebSocket', 'Processando notificação de nova mensagem', {
            serviceId: data.serviceId
          });
          
          toast({
            title: 'Nova mensagem',
            description: data.message,
            duration: 5000
          });
        } else if (data.type === 'application_accepted') {
          debugLogger('WebSocket', 'Processando notificação de candidatura aceita', {
            serviceId: data.serviceId
          });
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          
          toast({
            title: 'Candidatura aceita!',
            description: data.message,
            duration: 5000
          });
          
          debugLogger('WebSocket', 'Notificação de candidatura aceita processada com sucesso', {
            message: data.message,
            serviceId: data.serviceId
          });
        }
      } catch (error) {
        debugLogger('WebSocket', 'Erro ao processar mensagem', error);
      }
    };
  }, [user, toast]);

  // Conectar ao WebSocket quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      connect();
    }
    
    // Limpar ao desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user, connect]);

  return {
    connected,
    lastMessage
  };
}