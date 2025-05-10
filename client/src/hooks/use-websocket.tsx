import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

type WebSocketMessage = {
  type: 'connection' | 'new_application' | 'new_message';
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
    if (!user) return;

    // Fechar conexão anterior se existir
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Criar nova conexão
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    console.log('Conectando ao WebSocket:', wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket conectado');
      setConnected(true);
    };

    socket.onclose = () => {
      console.log('WebSocket desconectado');
      setConnected(false);
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        if (user) connect();
      }, 5000);
    };

    socket.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.log('Mensagem recebida:', data);
        
        setLastMessage(data);
        
        // Mostrar notificação toast
        if (data.type === 'new_application' || data.type === 'new_message') {
          toast({
            title: data.type === 'new_application' ? 'Nova candidatura' : 'Nova mensagem',
            description: data.message,
            duration: 5000
          });
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
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