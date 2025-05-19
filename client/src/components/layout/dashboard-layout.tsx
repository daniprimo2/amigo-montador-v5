import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Logo from '../logo/logo';
import { Bell, Home, List, MessageSquare, Calendar, Map, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';

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
  
  // Monitorar mensagens recebidas via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log('[DashboardLayout] Nova mensagem recebida via WebSocket', lastMessage);
      
      // Se não estiver na aba de chat, marcar como mensagem não lida
      if (activeTab !== 'chat') {
        setHasUnreadMessage(true);
      }
    }
  }, [lastMessage, activeTab]);
  
  // Limpar indicador de mensagem não lida quando mudar para a aba de chat
  useEffect(() => {
    if (activeTab === 'chat') {
      setHasUnreadMessage(false);
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
    
    // Navigate back to the appropriate dashboard page if on a different route
    if (userType === 'lojista') {
      navigate('/lojista');
    } else {
      navigate('/montador');
    }

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
      <div className="relative">
        <MessageSquare className="h-5 w-5" />
        {hasUnreadMessage && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full animate-pulse">!</span>
        )}
      </div>
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

  return (
    <div className="flex flex-col h-screen">
      <div className="gradient-bg w-full p-4">
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
              <Bell className="h-5 w-5" />
              {hasUnreadMessage && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full animate-pulse">!</span>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden"
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
