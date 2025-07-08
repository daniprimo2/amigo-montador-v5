import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Bell, Home, List, MessageSquare, Map, LogOut, User, Trophy, MessageCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationBadge from '@/components/ui/notification-badge';
import { ProfileDialog } from '@/components/dashboard/profile-dialog';
import { useNotification } from '@/hooks/use-notification';

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
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'chat' | 'explore' | 'ranking' | 'analytics'>('home');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [testUnreadCount, setTestUnreadCount] = useState(0);
  const { showNotification } = useNotification();
  
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
    refetchInterval: activeTab === 'chat' ? 1000 : 3000, // Atualizar mais frequentemente quando estiver no chat
  });
  
  // Use test count to demonstrate notification or real data if available
  const realUnreadCount = unreadData.count || 0;
  const unreadCount = Math.max(realUnreadCount, testUnreadCount);
  const hasUnreadMessage = unreadCount > 0;
  

  
  // Detectar quando uma nova mensagem chega
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount >= 0) {
      setHasNewMessage(true);
      
      // Mostrar notificação visual e sonora
      showNotification({
        title: 'Nova mensagem recebida',
        body: 'Você tem uma nova mensagem no chat',
        icon: '/favicon.ico'
      });
      
      // Vibrar dispositivo se suportado
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount, showNotification]);
  
  // Monitorar mensagens recebidas via WebSocket e atualizar contagem
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      // Atualizar a contagem de mensagens não lidas
      refetchUnreadCount();
    }
  }, [lastMessage, refetchUnreadCount]);

  // Escutar eventos de limpeza de notificações do chat
  useEffect(() => {
    const handleChatOpened = () => {
      setHasNewMessage(false);
      refetchUnreadCount();
    };

    const handleMessagesViewed = () => {
      setHasNewMessage(false);
      refetchUnreadCount();
    };

    // Listener para mudanças de visibilidade da página
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === 'chat') {
        // Quando o usuário volta para a aba e está no chat, atualizar notificações
        setHasNewMessage(false);
        refetchUnreadCount();
      }
    };

    window.addEventListener('chat-opened', handleChatOpened);
    window.addEventListener('chat-messages-viewed', handleMessagesViewed);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('chat-opened', handleChatOpened);
      window.removeEventListener('chat-messages-viewed', handleMessagesViewed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchUnreadCount, activeTab]);
  
  // Limpar contagem quando mudar para a aba de chat
  useEffect(() => {
    if (activeTab === 'chat') {
      // Limpar imediatamente a notificação visual quando o usuário acessa o chat
      setHasNewMessage(false);
      
      // Atualizar a contagem imediatamente e após um pequeno delay para garantir sincronização
      refetchUnreadCount();
      setTimeout(() => {
        refetchUnreadCount();
      }, 500);
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
  const handleTabChange = (tab: 'home' | 'services' | 'chat' | 'explore' | 'ranking' | 'analytics') => {
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
      onClick={() => {
        // Limpar notificações imediatamente quando o usuário clica no chat
        setHasNewMessage(false);
        refetchUnreadCount();
        handleTabChange('chat');
      }}
      className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
        activeTab === 'chat' 
          ? 'text-primary bg-primary/10 scale-105' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
      } ${
        hasUnreadMessage && activeTab !== 'chat' 
          ? 'chat-button-glow-active' 
          : hasUnreadMessage 
            ? 'chat-button-glow' 
            : ''
      }`}
    >
      <NotificationBadge
        count={unreadCount}
        type="message"
        size="md"
        className={activeTab === 'chat' ? 'text-primary' : 'text-gray-500'}
        showPulse={false}
        hasNewMessage={hasNewMessage}
        onAnimationComplete={() => setHasNewMessage(false)}
      />
      <span className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1">Chat</span>
    </button>
  );

  // Componente para o botão de suporte
  const SupportButton = () => {
    const handleSupportClick = () => {
      const whatsappNumber = "5511993505241";
      const message = encodeURIComponent("Olá Leonardo! Preciso de ajuda com o Amigo Montador. 🏠🔧");
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      
      try {
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
        window.location.href = whatsappUrl;
      }
    };

    return (
      <button 
        onClick={handleSupportClick}
        className="flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] text-green-500 hover:text-green-700 hover:bg-green-50 active:scale-95 touch-target"
        title="Suporte via WhatsApp"
      >
        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
        <span className="text-[10px] sm:text-xs font-medium">Suporte</span>
      </button>
    );
  };

  const renderNavigation = () => {
    if (userType === 'lojista') {
      return (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'home' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('services')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'services' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <List className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Serviços</span>
          </button>
          <button 
            onClick={() => handleTabChange('analytics')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'analytics' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => handleTabChange('ranking')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'ranking' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Ranking</span>
          </button>
          <ChatButton />
          <SupportButton />
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] text-red-500 hover:text-red-700 hover:bg-red-50 active:scale-95 touch-target"
            title="Voltar ao login"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Sair</span>
          </button>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          <button 
            onClick={() => handleTabChange('home')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'home' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Início</span>
          </button>
          <button 
            onClick={() => handleTabChange('explore')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'explore' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Map className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Explorar</span>
          </button>
          <button 
            onClick={() => handleTabChange('analytics')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'analytics' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Analytics</span>
          </button>
          <button 
            onClick={() => handleTabChange('ranking')}
            className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] touch-target ${
              activeTab === 'ranking' 
                ? 'text-primary bg-primary/10 scale-105' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Ranking</span>
          </button>
          <ChatButton />
          <SupportButton />
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[48px] sm:min-h-[64px] text-red-500 hover:text-red-700 hover:bg-red-50 active:scale-95 touch-target"
            title="Voltar ao login"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Sair</span>
          </button>
        </div>
      );
    }
  };

  // Get user data including store for lojista
  const { user } = useAuth();
  const [storeLogoData, setStoreLogoData] = useState<string | null>(null);
  const [profilePhotoData, setProfilePhotoData] = useState<string | null>(null);

  // Fetch store logo and profile photo on mount for any user type
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          
          // Set store logo if user is lojista
          if (user?.userType === 'lojista' && data.store?.logoData) {
            setStoreLogoData(data.store.logoData);
          }
          
          // Set profile photo data if available for any user type
          if (data.profilePhotoData) {
            setProfilePhotoData(data.profilePhotoData);
          } else if (user?.profileData && typeof user.profileData === 'object' && 'photoData' in user.profileData) {
            setProfilePhotoData(user.profileData.photoData as string);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    if (user) {
      fetchUserData();
    }

    // Listen for profile photo updates
    const handleProfilePhotoUpdate = () => {
      if (user) {
        fetchUserData();
      }
    };

    window.addEventListener('profile-photo-updated', handleProfilePhotoUpdate);
    
    return () => {
      window.removeEventListener('profile-photo-updated', handleProfilePhotoUpdate);
    };
  }, [user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Mobile First */}
      <div className="bg-zinc-800 w-full p-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-white text-2xl font-bold flex items-center">
              🔧
              <span className="ml-2 text-lg">
                <span className="font-light">Amigo</span>
                <span className="font-bold ml-1">Montador</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="text-white relative p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => {
                // Limpar notificações imediatamente quando o usuário clica no sino
                setHasNewMessage(false);
                refetchUnreadCount();
                handleTabChange('chat');
              }} 
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
              className="text-white p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
              title="Voltar ao login"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setShowProfileDialog(true)}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-white hover:bg-gray-50 transition-colors overflow-hidden"
              title="Ver perfil"
            >
              {profilePhotoData ? (
                <img 
                  src={profilePhotoData} 
                  alt="Foto de perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-gray-600" />
              )}
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

      {/* Profile Dialog */}
      <ProfileDialog 
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default DashboardLayout;
