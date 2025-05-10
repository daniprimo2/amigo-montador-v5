import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Calendar, CalendarDays, Plus } from 'lucide-react';
import StoreServiceCard from './store-service-card';
import ServiceCalendar from './service-calendar';

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  
  // Dados de exemplo para os cards de serviço
  const services = [
    {
      id: 1,
      title: 'Cozinha Planejada Milano',
      location: 'São Paulo, SP',
      date: '15/06/2023',
      price: 'R$ 1.500,00',
      candidates: 3,
      status: 'open',
    },
    {
      id: 2,
      title: 'Guarda-roupa Casal Completo',
      location: 'São Paulo, SP',
      date: '18/06/2023',
      price: 'R$ 850,00',
      candidates: 1,
      status: 'open',
    },
    {
      id: 3,
      title: 'Painel para TV com Rack',
      location: 'São Paulo, SP',
      date: '20/06/2023',
      price: 'R$ 600,00',
      candidates: 0,
      status: 'open',
    },
  ];

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Lojista'}</span>
          </h2>
          <button className="text-primary text-sm font-medium">Ver Perfil</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">5</div>
            <div className="text-xs text-gray-500">Em Aberto</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">3</div>
            <div className="text-xs text-gray-500">Em Andamento</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">12</div>
            <div className="text-xs text-gray-500">Finalizados</div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Serviços</h3>
        <Button variant="default" className="bg-primary hover:bg-primary/90 text-white text-sm py-1.5 px-4 rounded-full flex items-center gap-1.5 font-medium">
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
        <div className="flex border-b">
          <button className="flex-1 py-3 text-center font-medium text-primary border-b-2 border-primary">Em Aberto</button>
          <button className="flex-1 py-3 text-center font-medium text-gray-500">Em Andamento</button>
          <button className="flex-1 py-3 text-center font-medium text-gray-500">Finalizados</button>
        </div>
        
        <div className="divide-y">
          {services.map(service => (
            <StoreServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4">Agenda</h3>
      
      <ServiceCalendar 
        markedDates={['15', '18', '20']} 
        month="Junho" 
        year="2023" 
      />
    </div>
  );
};

export default StoreDashboard;
