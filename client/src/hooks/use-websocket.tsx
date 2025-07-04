import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

// Função global de debug para maior visibilidade nos logs
const debugLogger = (context: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  };

type WebSocketMessage = {
  type: 'connection' | 'new_application' | 'new_message' | 'application_accepted' | 'service_completed' | 'automatic_notification' | 'service_confirmed' | 'payment_ready' | 'payment_confirmed' | 'evaluation_required' | 'service_started_with_other' | 'ping' | 'pong';
  message?: string;
  serviceId?: number;
  serviceTitle?: string;
  timestamp?: string;
  serviceData?: any; // Para carregar informações do serviço quando necessário
  amount?: string; // Para notificações de pagamento
  userId?: number; // Para identificar o usuário alvo da mensagem
  data?: any; // Para dados adicionais da notificação
  evaluateUser?: {
    id: number;
    name: string;
    type: 'lojista' | 'montador';
  };
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
      });
  } catch (error) {
    console.error('Erro ao criar objeto de áudio:', error);
  }
};

// Função para enviar notificação do navegador única por usuário
const sendBrowserNotification = (title: string, body: string, icon: string = '/logo.png', userId?: number) => {
  // Verificar se o navegador suporta notificações
  if (!("Notification" in window)) {
    return;
  }
  
  // Verificar a permissão
  if (Notification.permission === "granted") {
    // Criar notificação com tag única por usuário para evitar duplicatas
    const notificationTag = `amigomontador-user-${userId || 'unknown'}-${Date.now()}`;
    new Notification(title, { 
      body, 
      icon, 
      tag: notificationTag,
      requireInteraction: false,
      silent: false
    });
  } else if (Notification.permission !== "denied") {
    // Caso contrário, pedir permissão
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        const notificationTag = `amigomontador-user-${userId || 'unknown'}-${Date.now()}`;
        new Notification(title, { 
          body, 
          icon, 
          tag: notificationTag,
          requireInteraction: false,
          silent: false
        });
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
      debugLogger('WebSocket', 'Usuário não autenticado - não iniciando conexão WebSocket');
      setConnected(false);
      return;
    }

    // Fechar conexão anterior se existir
    if (socketRef.current) {
      debugLogger('WebSocket', 'Fechando conexão WebSocket existente');
      socketRef.current.close();
    }

    try {
      // Criar nova conexão
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
      
      debugLogger('WebSocket', `Iniciando conexão para usuário ${user.id}`, { url: wsUrl });
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        debugLogger('WebSocket', 'Conexão estabelecida com sucesso');
        setConnected(true);
        
        // Enviar mensagem de autenticação para associar o WebSocket ao usuário
        const authMessage = {
          type: 'auth',
          userId: user.id,
          userType: user.userType
        };
        socket.send(JSON.stringify(authMessage));
        debugLogger('WebSocket', 'Mensagem de autenticação enviada', authMessage);
        
        // Configurar heartbeat para manter conexão viva
        const heartbeatInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Ping a cada 30 segundos
        
        // Armazenar referência do intervalo para limpeza
        (socket as any).heartbeatInterval = heartbeatInterval;
      };

      socket.onclose = (event) => {
        debugLogger('WebSocket', `Conexão fechada: Código ${event.code}, Motivo: ${event.reason || 'Não especificado'}`);
        setConnected(false);
        
        // Limpar heartbeat se existir
        if ((socket as any).heartbeatInterval) {
          clearInterval((socket as any).heartbeatInterval);
        }
        
        // Tentar reconectar após 2 segundos apenas se o componente ainda estiver montado
        // e se não foi um fechamento intencional (código 1000)
        if (user && event.code !== 1000) {
          debugLogger('WebSocket', 'Agendando reconexão em 2 segundos');
          setTimeout(() => {
            if (user) { // Verificar novamente se o usuário ainda está logado
              debugLogger('WebSocket', 'Tentando reconexão automática');
              connect();
            }
          }, 2000);
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
          
          // Verificar se a mensagem é destinada a este usuário
          if (data.userId && data.userId !== user.id) {
            debugLogger('WebSocket', `Mensagem não destinada a este usuário (${user.id}), ignorando mensagem para usuário ${data.userId}`);
            return;
          }
          
          // Log para debug se a mensagem não tem userId (pode indicar problema)
          if (!data.userId && data.type !== 'ping' && data.type !== 'pong') {
            debugLogger('WebSocket', `⚠️ Mensagem recebida sem userId - tipo: ${data.type}`, data);
          }
          
          // Log específico para mensagens que passaram pela validação
          if (data.userId === user.id && data.type !== 'ping' && data.type !== 'pong') {
            debugLogger('WebSocket', `✅ Processando notificação para usuário ${user.id} - tipo: ${data.type}`, data);
          }
          
          // Atualizar último estado da mensagem e enviar evento de notificação
          setLastMessage(data);
          
          // Disparar evento global para qualquer componente que precise reagir a novas mensagens
          const notificationEvent = new CustomEvent('new-notification', { 
            detail: { type: data.type, data } 
          });
          window.dispatchEvent(notificationEvent);
          
          // Ignorar mensagens de heartbeat
          if (data.type === 'ping' || data.type === 'pong') {
            return;
          }
          
          // Processar diferentes tipos de mensagem
          if (data.type === 'new_application') {
            playNotificationSound('application');
            sendBrowserNotification('🔔 Nova candidatura', data.message || 'Um montador se candidatou ao seu serviço', '/logo.png', user.id);
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
            
            toast({
              title: '🔔 Nova candidatura',
              description: data.message,
              duration: 8000,
              variant: 'default',
              className: 'bg-blue-100 border-blue-500 border-2 animate-pulse-once shadow-lg'
            });
          } else if (data.type === 'new_message') {
            playNotificationSound('message');
            sendBrowserNotification('💬 Nova mensagem recebida!', data.message || 'Você recebeu uma nova mensagem. Clique para visualizar.', '/logo.png', user.id);
            
            if (data.serviceId) {
              queryClient.invalidateQueries({ queryKey: [`/api/services/${data.serviceId}/messages`] });
              queryClient.invalidateQueries({ queryKey: ['/api/services'] });
              queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            }
            
            toast({
              title: '💬 Nova mensagem recebida!',
              description: data.message,
              duration: 8000,
              variant: 'default',
              className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg animate-pulse-once'
            });
            
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          } else if (data.type === 'application_accepted') {
            playNotificationSound('application');
            sendBrowserNotification('✅ Candidatura aceita!', data.message || 'Uma loja aceitou sua candidatura para um serviço', '/logo.png', user.id);
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            
            toast({
              title: '✅ Candidatura aceita!',
              description: data.message,
              duration: 8000,
              variant: 'default',
              className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg animate-pulse-once'
            });
            
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100, 50, 100]);
            }
          } else if (data.type === 'service_completed') {
            playNotificationSound();
            sendBrowserNotification('🌟 Serviço finalizado!', 'Por favor, avalie sua experiência com este serviço.', '/logo.png', user.id);
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            
            if (data.serviceId && data.serviceData) {
              const ratingEvent = new CustomEvent('open-rating-dialog', { 
                detail: { 
                  serviceId: data.serviceId,
                  serviceData: data.serviceData
                } 
              });
              window.dispatchEvent(ratingEvent);
            }
            
            toast({
              title: '🌟 Serviço finalizado!',
              description: 'Por favor, avalie sua experiência.',
              duration: 10000,
              variant: 'default',
              className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg animate-pulse-once'
            });
          } else if (data.type === 'service_started_with_other') {
            playNotificationSound();
            sendBrowserNotification('📋 Serviço iniciado', data.message || 'Um serviço foi iniciado com outro montador', '/logo.png', user.id);
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/available'] });
            
            toast({
              title: '📋 Serviço iniciado',
              description: data.message,
              duration: 8000,
              variant: 'default',
              className: 'bg-orange-100 border-orange-500 border-2 font-medium shadow-lg animate-pulse-once'
            });
            
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
          } else if (data.type === 'evaluation_required') {
            // Notificação de avaliação obrigatória
            playNotificationSound();
            sendBrowserNotification('⭐ Avaliação obrigatória', data.message || 'É necessário avaliar o serviço para finalizá-lo', '/logo.png', user.id);
            
            // Invalidar queries para atualizar listas
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/pending-evaluations'] });
            
            // Disparar evento personalizado para abrir o diálogo de avaliação imediatamente
            const evaluationEvent = new CustomEvent('mandatory-evaluation-required', { 
              detail: { 
                serviceId: data.serviceId,
                serviceData: data.serviceData,
                userId: data.userId,
                evaluateUser: data.evaluateUser
              } 
            });
            window.dispatchEvent(evaluationEvent);
            
            toast({
              title: '⭐ Avaliação obrigatória',
              description: data.message || 'É necessário avaliar o serviço para finalizá-lo',
              duration: 10000,
              variant: 'default',
              className: 'bg-purple-100 border-purple-500 border-2 font-medium shadow-lg animate-pulse-once'
            });
            
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
          }
        } catch (error) {
          debugLogger('WebSocket', 'Erro ao processar mensagem', error);
        }
      };
      
    } catch (error) {
      debugLogger('WebSocket', 'Erro ao criar conexão WebSocket', error);
      setConnected(false);
      return;
    }
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