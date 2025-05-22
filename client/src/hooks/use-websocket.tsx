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
  type: 'connection' | 'new_application' | 'new_message' | 'application_accepted' | 'service_completed';
  message: string;
  serviceId?: number;
  timestamp?: string;
  serviceData?: any; // Para carregar informações do serviço quando necessário
};

// Função para tocar som de notificação
const playNotificationSound = (type: 'message' | 'application' | 'default' = 'default') => {
  try {
    // Podemos usar o mesmo som para todos os tipos por enquanto, mas a função está preparada para sons diferentes
    const audio = new Audio('/notification.mp3');
    
    // Ajustar volume baseado no tipo de notificação
    switch (type) {
      case 'message':
        audio.volume = 0.7; // Volume mais alto para mensagens
        break;
      case 'application':
        audio.volume = 0.6; // Volume médio para candidaturas
        break;
      default:
        audio.volume = 0.5; // Volume padrão para outras notificações
    }
    
    audio.play().catch(error => {
      // Alguns navegadores bloqueiam a reprodução automática
      console.log('Erro ao reproduzir som:', error);
    });
  } catch (error) {
    console.error('Erro ao criar objeto de áudio:', error);
  }
};

// Função para enviar notificação do navegador
const sendBrowserNotification = (title: string, body: string, icon: string = '/logo.png') => {
  // Verificar se o navegador suporta notificações
  if (!("Notification" in window)) {
    console.log("Este navegador não suporta notificações desktop");
    return;
  }
  
  // Verificar a permissão
  if (Notification.permission === "granted") {
    // Se for permitido, criar notificação
    new Notification(title, { body, icon });
  } else if (Notification.permission !== "denied") {
    // Caso contrário, pedir permissão
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body, icon });
      }
    });
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
        
        // Atualizar último estado da mensagem e enviar evento de notificação
        setLastMessage(data);
        
        // Disparar evento global para qualquer componente que precise reagir a novas mensagens
        // (incluindo o indicador de notificação no Bell)
        const notificationEvent = new CustomEvent('new-notification', { 
          detail: { type: data.type, data } 
        });
        window.dispatchEvent(notificationEvent);
        
        // Mostrar notificação toast e invalidar queries necessárias
        if (data.type === 'new_application') {
          debugLogger('WebSocket', 'Processando notificação de nova candidatura', {
            serviceId: data.serviceId
          });
          
          // Tocar som de notificação com tipo específico
          playNotificationSound('application');
          
          // Enviar notificação do navegador
          sendBrowserNotification(
            '🔔 Nova candidatura', 
            data.message || 'Um montador se candidatou ao seu serviço'
          );
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
          
          // Mostrar notificação em estilo destacado com animação de pulso
          toast({
            title: '🔔 Nova candidatura',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-blue-100 border-blue-500 border-2 animate-pulse-once shadow-lg'
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
          
          // Tocar som de notificação com tipo específico
          playNotificationSound('message');
          
          // Enviar notificação do navegador
          sendBrowserNotification(
            '💬 Nova mensagem recebida!', 
            data.message || 'Você recebeu uma nova mensagem. Clique para visualizar.'
          );
          
          // Invalidar consultas para atualizar mensagens
          if (data.serviceId) {
            queryClient.invalidateQueries({ queryKey: [`/api/services/${data.serviceId}/messages`] });
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
          }
          
          // Mostrar notificação visível e com ícone e animação
          toast({
            title: '💬 Nova mensagem recebida!',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg animate-pulse-once'
          });
          
          // Vibrar no celular se API estiver disponível
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          
          debugLogger('WebSocket', 'Notificação de nova mensagem processada com sucesso', {
            message: data.message,
            serviceId: data.serviceId
          });
        } else if (data.type === 'application_accepted') {
          debugLogger('WebSocket', 'Processando notificação de candidatura aceita', {
            serviceId: data.serviceId
          });
          
          // Tocar som de notificação
          playNotificationSound('application');
          
          // Enviar notificação do navegador
          sendBrowserNotification(
            '✅ Candidatura aceita!', 
            data.message || 'Uma loja aceitou sua candidatura para um serviço'
          );
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          
          // Mostrar notificação com estilo personalizado
          toast({
            title: '✅ Candidatura aceita!',
            description: data.message,
            duration: 8000,
            variant: 'default',
            className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg animate-pulse-once'
          });
          
          // Vibrar no celular se API estiver disponível
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100, 50, 100]);
          }
          
          debugLogger('WebSocket', 'Notificação de candidatura aceita processada com sucesso', {
            message: data.message,
            serviceId: data.serviceId
          });
        } else if (data.type === 'service_completed') {
          debugLogger('WebSocket', 'Processando notificação de serviço finalizado', {
            serviceId: data.serviceId,
            serviceData: data.serviceData
          });
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Enviar notificação do navegador
          sendBrowserNotification(
            '🌟 Serviço finalizado!', 
            'Por favor, avalie sua experiência com este serviço.'
          );
          
          // Invalidar consultas para atualizar listas de serviços
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          
          // Disparar evento para abrir tela de avaliação
          if (data.serviceId && data.serviceData) {
            // Criar e disparar evento personalizado para abertura do diálogo de avaliação
            const ratingEvent = new CustomEvent('open-rating-dialog', { 
              detail: { 
                serviceId: data.serviceId,
                serviceData: data.serviceData
              } 
            });
            window.dispatchEvent(ratingEvent);
          }
          
          // Mostrar notificação com estilo personalizado
          toast({
            title: '🌟 Serviço finalizado!',
            description: 'Por favor, avalie sua experiência.',
            duration: 10000,
            variant: 'default',
            className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg animate-pulse-once'
          });
          
          debugLogger('WebSocket', 'Notificação de serviço finalizado processada com sucesso', {
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