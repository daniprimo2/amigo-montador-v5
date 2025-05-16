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

// Função para tocar som de notificação
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(error => {
      // Alguns navegadores bloqueiam a reprodução automática
      console.log('Erro ao reproduzir som:', error);
    });
  } catch (error) {
    console.error('Erro ao criar objeto de áudio:', error);
  }
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
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
          
          // Mostrar notificação em estilo destacado
          toast({
            title: '🔔 Nova candidatura',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-blue-100 border-blue-500 border-2'
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
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Invalidar consultas para atualizar mensagens
          if (data.serviceId) {
            queryClient.invalidateQueries({ queryKey: [`/api/services/${data.serviceId}/messages`] });
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
          }
          
          // Mostrar notificação visível e com ícone
          toast({
            title: '💬 Nova mensagem recebida!',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg'
          });
          
          debugLogger('WebSocket', 'Notificação de nova mensagem processada com sucesso', {
            message: data.message,
            serviceId: data.serviceId
          });
        } else if (data.type === 'application_accepted') {
          debugLogger('WebSocket', 'Processando notificação de candidatura aceita', {
            serviceId: data.serviceId
          });
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          
          // Mostrar notificação com estilo personalizado
          toast({
            title: '✅ Candidatura aceita!',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg'
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