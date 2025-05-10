import React, { ReactNode } from 'react';
import { useLocation } from 'wouter';
import Logo from '../logo/logo';
import { Bell, Home, List, MessageSquare, Calendar, Map, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };

  const renderNavigation = () => {
    if (userType === 'lojista') {
      return (
        <div className="grid grid-cols-4 gap-1">
          <button className="flex flex-col items-center py-1 text-primary">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
            <List className="h-5 w-5" />
            <span className="text-xs mt-1">Serviços</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Chat</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Agenda</span>
          </button>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-4 gap-1">
          <button className="flex flex-col items-center py-1 text-primary">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Início</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
            <Map className="h-5 w-5" />
            <span className="text-xs mt-1">Explorar</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Chat</span>
          </button>
          <button className="flex flex-col items-center py-1 text-gray-500">
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
            <button className="text-white">
              <Bell className="h-5 w-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden"
            >
              <UserCircle className="h-6 w-6 text-gray-600" />
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
