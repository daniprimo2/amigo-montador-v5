import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Logo from '../logo/logo';
import { Bell, Home, List, MessageSquare, Calendar, Map, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import NotificationBadge from '@/components/ui/notification-badge';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'lojista' | 'montador';
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children,
  userType
}) => {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { lastMessage } = useWebSocket();
  // Define the tabs with a state to track which tab is active
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'chat' | 'calendar' | 'explore'>('home');
  // Estado para controlar a notificação de mensagem não lida
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  // Contador de mensagens não lidas
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Monitorar mensagens recebidas via WebSocket (através do hook)
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log('[DashboardLayout] Nova mensagem recebida via WebSocket', lastMessage);
      
      // Se não estiver na aba de chat, marcar como mensagem não lida e incrementar contador
      if (activeTab !== 'chat') {
        setHasUnreadMessage(true);
        setUnreadCount(prevCount => prevCount + 1);
      }
    }
  }, [lastMessage, activeTab]);
  
  // Ouvir eventos de notificação diretamente disparados pelo WebSocket
  useEffect(() => {
    const handleNotification = (event: any) => {
      const { type, data } = event.detail;
      console.log('[DashboardLayout] Notificação recebida via evento:', type, data);
      
      if (type === 'new_message') {
        // Se não estiver na aba de chat, marcar como mensagem não lida e incrementar contador
        if (activeTab !== 'chat') {
          setHasUnreadMessage(true);
          setUnreadCount(prevCount => prevCount + 1);
        }
      } else if (type === 'new_application') {
        // Se não estiver na aba de chat, marcar como mensagem não lida e incrementar contador
        if (activeTab !== 'chat') {
          setHasUnreadMessage(true);
          setUnreadCount(prevCount => prevCount + 1);
        }
      }
    };
    
    // Adicionar ouvinte de evento
    window.addEventListener('new-notification', handleNotification);
    
    // Remover ouvinte ao desmontar
    return () => {
      window.removeEventListener('new-notification', handleNotification);
    };
  }, [activeTab]);
  
  // Limpar indicador de mensagem não lida quando mudar para a aba de chat
  useEffect(() => {
    if (activeTab === 'chat') {
      setHasUnreadMessage(false);
      setUnreadCount(0); // Reiniciar o contador ao abrir o chat
    }
  }, [activeTab]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };
  
  // Function to handle tab changes and communicate with parent components
  const handleTabChange = (tab: 'home' | 'services' | 'chat' | 'calendar' | 'explore') => {
    setActiveTab(tab);
    
    // Não navega para outra rota, apenas emite o evento para mudar a aba
    // Isso garante que o estado do componente filho (incluindo o chat) seja preservado
    
    // We'll pass the active tab to child components through a custom event
    const event = new CustomEvent('dashboard-tab-change', { detail: { tab } });
    window.dispatchEvent(event);
  };

  // Componente para o botão de chat com indicador de notificação
  const ChatButton = () => (
    <button 
      onClick={() => handleTabChange('chat')}
      className={`flex flex-col items-center py-1 ${activeTab === 'chat' ? 'text-primary' : 'text-gray-500'}`}
    >
      <NotificationBadge
        count={unreadCount}
        type="message"
        size="md"
        className={activeTab === 'chat' ? 'text-primary' : 'text-gray-500'}
        showPulse={false}
      />
      <span className="text-xs mt-1">Chat</span>
    </button>
  );

  const renderNavigation = () => {
    if (userType === 'lojista') {
      return (
        <div className="grid grid-cols-4 gap-1">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-1 ${activeTab === 'home' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('services')}
            className={`flex flex-col items-center py-1 ${activeTab === 'services' ? 'text-primary' : 'text-gray-500'}`}
          >
            <List className="h-5 w-5" />
            <span className="text-xs mt-1">Serviços</span>
          </button>
          <ChatButton />
          <button 
            onClick={() => handleTabChange('calendar')}
            className={`flex flex-col items-center py-1 ${activeTab === 'calendar' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Agenda</span>
          </button>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-4 gap-1">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-1 ${activeTab === 'home' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('explore')}
            className={`flex flex-col items-center py-1 ${activeTab === 'explore' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Map className="h-5 w-5" />
            <span className="text-xs mt-1">Explorar</span>
          </button>
          <ChatButton />
          <button 
            onClick={() => handleTabChange('calendar')}
            className={`flex flex-col items-center py-1 ${activeTab === 'calendar' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Agenda</span>
          </button>
        </div>
      );
    }
  };

  // Get user data including store for lojista
  const { user } = useAuth();
  const [storeLogoUrl, setStoreLogoUrl] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Fetch store logo and profile photo on mount for any user type
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          
          // Set store logo if user is lojista
          if (user?.userType === 'lojista' && data.store?.logoUrl) {
            setStoreLogoUrl(data.store.logoUrl);
          }
          
          // Set profile photo URL if available for any user type
          if (user?.profileData && typeof user.profileData === 'object' && 'photoUrl' in user.profileData) {
            setProfilePhotoUrl(user.profileData.photoUrl as string);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-zinc-800 w-full p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Logo size="sm" className="text-white" />
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="text-white relative"
              onClick={() => handleTabChange('chat')} 
              title="Ir para o chat"
            >
              <NotificationBadge
                count={unreadCount}
                type="bell"
                size="md"
                className="text-white"
                showPulse={hasUnreadMessage}
              />
            </button>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white"
              title="Sair"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-100">
        {children}
      </div>
      
      <div className="bg-white border-t border-gray-200 py-2">
        {renderNavigation()}
      </div>
    </div>
  );
};

export default DashboardLayout;
