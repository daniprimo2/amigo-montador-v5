import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AvailableServiceCard from './available-service-card';
import ServiceCalendar from './service-calendar';

interface AssemblerDashboardProps {
  onLogout: () => void;
}

export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  
  // Dados de exemplo para os serviços disponíveis
  const availableServices = [
    {
      id: 1,
      title: 'Cozinha Planejada Milano',
      location: 'São Paulo, SP',
      distance: '5 km',
      date: '15/06/2023',
      price: 'R$ 1.500,00',
      store: 'Móveis Planejados Ltda.',
      type: 'Marcenaria',
    },
    {
      id: 2,
      title: 'Guarda-roupa Casal Completo',
      location: 'São Paulo, SP',
      distance: '8 km',
      date: '18/06/2023',
      price: 'R$ 850,00',
      store: 'Casa & Decoração',
      type: 'Marcenaria',
    },
    {
      id: 3,
      title: 'Painel para TV com Rack',
      location: 'São Paulo, SP',
      distance: '3 km',
      date: '20/06/2023',
      price: 'R$ 600,00',
      store: 'Móveis Sob Medida',
      type: 'Plano de corte',
    },
  ];

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Montador'}</span>
          </h2>
          <button className="text-primary text-sm font-medium">Ver Perfil</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">15</div>
            <div className="text-xs text-gray-500">Disponíveis</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">2</div>
            <div className="text-xs text-gray-500">Em Andamento</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">28</div>
            <div className="text-xs text-gray-500">Finalizados</div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Serviços Próximos</h3>
            <button className="text-sm text-primary flex items-center">
              <MapPin className="h-4 w-4 mr-1" /> São Paulo, SP
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
          <div className="mt-2 relative">
            <div className="relative">
              <Input
                placeholder="Pesquisar serviços"
                className="w-full pl-10 pr-12 py-2 rounded-full"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute top-0 right-0">
              <button className="bg-gray-100 p-2 rounded-full">
                <SlidersHorizontal className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y">
          {availableServices.map(service => (
            <AvailableServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4 mt-4">Minha Agenda</h3>
      
      <ServiceCalendar 
        markedDates={['13', '14']} 
        month="Junho" 
        year="2023" 
      />
    </div>
  );
};

export default AssemblerDashboard;
