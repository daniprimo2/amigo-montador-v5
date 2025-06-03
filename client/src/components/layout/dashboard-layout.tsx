import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import amigoMontadorLogo from '@assets/Logo - Amigo Montador.jpg';
import { Bell, Home, List, MessageSquare, Map, LogOut, User, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  // Define the tabs with a state to track which tab is active
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'chat' | 'explore' | 'ranking'>('home');
  
  // Buscar contagem de mensagens não lidas do servidor
  const { data: unreadData = { count: 0 }, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/messages/unread-count');
      if (!response.ok) {
        throw new Error('Erro ao buscar contagem de mensagens não lidas');
      }
      return await response.json();
    },
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });
  
  const unreadCount = unreadData.count;
  const hasUnreadMessage = unreadCount > 0;
  
  // Monitorar mensagens recebidas via WebSocket e atualizar contagem
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log('[DashboardLayout] Nova mensagem recebida via WebSocket', lastMessage);
      
      // Atualizar a contagem de mensagens não lidas
      refetchUnreadCount();
    }
  }, [lastMessage, refetchUnreadCount]);
  
  // Limpar contagem quando mudar para a aba de chat
  useEffect(() => {
    if (activeTab === 'chat') {
      // Atualizar a contagem após um pequeno delay para permitir que as mensagens sejam marcadas como lidas
      setTimeout(() => {
        refetchUnreadCount();
      }, 1000);
    }
  }, [activeTab, refetchUnreadCount]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };
  
  // Function to handle tab changes and communicate with parent components
  const handleTabChange = (tab: 'home' | 'services' | 'chat' | 'explore' | 'ranking') => {
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
      className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 min-h-[64px] ${
        activeTab === 'chat' 
          ? 'text-primary bg-primary/10 scale-105' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
      }`}
    >
      <NotificationBadge
        count={unreadCount}
        type="message"
        size="lg"
        className={activeTab === 'chat' ? 'text-primary' : 'text-gray-500'}
        showPulse={false}
      />
      <span className="text-xs font-medium mt-1">Chat</span>
    </button>
  );

  const renderNavigation = () => {
    if (userType === 'lojista') {
      return (
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-200 min-h-[64px] ${
              activeTab === 'home' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('services')}
            className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-200 min-h-[64px] ${
              activeTab === 'services' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <List className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Serviços</span>
          </button>
          <ChatButton />
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-4 gap-1">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 min-h-[64px] ${
              activeTab === 'home' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('explore')}
            className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 min-h-[64px] ${
              activeTab === 'explore' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Map className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Explorar</span>
          </button>
          <button 
            onClick={() => handleTabChange('ranking')}
            className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-200 min-h-[64px] ${
              activeTab === 'ranking' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Trophy className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Ranking</span>
          </button>
          <ChatButton />
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
          if (data.profilePhotoUrl) {
            setProfilePhotoUrl(data.profilePhotoUrl);
          } else if (user?.profileData && typeof user.profileData === 'object' && 'photoUrl' in user.profileData) {
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Mobile First */}
      <div className="bg-zinc-800 w-full p-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={amigoMontadorLogo} 
              alt="Amigo Montador" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="text-white relative p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => handleTabChange('chat')} 
              title="Ir para o chat"
            >
              <NotificationBadge
                count={unreadCount}
                type="bell"
                size="lg"
                className="text-white"
                showPulse={hasUnreadMessage}
              />
            </button>
            <button 
              onClick={handleLogout}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-white hover:bg-gray-50 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content - Mobile optimized */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="min-h-full">
          {children}
        </div>
      </div>
      
      {/* Bottom Navigation - iOS/Android style */}
      <div className="bg-white border-t border-gray-200 pt-2 pb-6 px-4 safe-bottom">
        <div className="max-w-md mx-auto">
          {renderNavigation()}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
