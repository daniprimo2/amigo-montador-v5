import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Search, SlidersHorizontal, MessageSquare, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AvailableServiceCard from './available-service-card';
import ServiceCalendar from './service-calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface AssemblerDashboardProps {
  onLogout: () => void;
}

// Define the service interface to match what's returned from the API
interface ServiceData {
  id: number;
  title: string;
  description: string;
  location: string;
  date: string;
  price: string; // price é uma string no banco de dados
  type?: string;
  materialType?: string;
  storeId: number;
  store?: {
    name: string;
  };
  status: string;
  createdAt: string;
}

// Format data for display in the UI
const formatServiceForDisplay = (service: ServiceData) => {
  return {
    id: service.id,
    title: service.title,
    location: service.location,
    distance: '5 km', // This would be calculated based on user location
    date: new Date(service.date).toLocaleDateString('pt-BR'),
    price: `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}`,
    store: service.store?.name || 'Loja não especificada',
    type: service.materialType || service.type || 'Não especificado' // Garantir que nunca seja undefined
  };
};

export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardSection, setDashboardSection] = useState<'home' | 'explore' | 'chat' | 'calendar'>('home');
  
  // Escuta os eventos de mudança de aba do layout
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      setDashboardSection(tab);
    };
    
    // Adiciona o listener para o evento personalizado
    window.addEventListener('dashboard-tab-change', handleTabChange as EventListener);
    
    // Remove o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('dashboard-tab-change', handleTabChange as EventListener);
    };
  }, []);
  
  // Fetch available services
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['/api/services'],
    select: (data: ServiceData[]) => data.map(formatServiceForDisplay)
  });
  
  // Filter services by search term
  const filteredServices = services?.filter(service => 
    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.type && service.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    service.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.location.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Handle applying for a service
  const applyMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const url = `/api/services/${serviceId}/apply`;
      return await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Candidatura enviada",
        description: "Sua candidatura foi enviada com sucesso!"
      });
      // Refresh services list
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao candidatar-se",
        description: error.message || "Não foi possível enviar sua candidatura. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  const handleApply = (serviceId: number) => {
    applyMutation.mutate(serviceId);
  };

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Montador'}</span>
          </h2>
          <button className="text-primary text-sm font-medium">Ver Perfil</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">{filteredServices.length || 0}</div>
            <div className="text-xs text-gray-500">Disponíveis</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">0</div>
            <div className="text-xs text-gray-500">Em Andamento</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">0</div>
            <div className="text-xs text-gray-500">Finalizados</div>
          </div>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4">Serviços Recentes</h3>
      
      <div className="dashboard-card bg-white rounded-xl shadow-md mb-4">
        <div className="divide-y">
          {isLoading ? (
            // Show loading skeletons
            Array(2).fill(0).map((_, index) => (
              <div key={index} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ))
          ) : error ? (
            // Show error message
            <div className="p-8 text-center text-red-500">
              Erro ao carregar serviços. Por favor, tente novamente.
            </div>
          ) : filteredServices.length > 0 ? (
            // Show services (limitado a 2 para a tela inicial)
            filteredServices.slice(0, 2).map(service => (
              <AvailableServiceCard 
                key={service.id} 
                service={service} 
                onApply={handleApply}
              />
            ))
          ) : (
            // Show empty state
            <div className="p-8 text-center text-gray-500">
              Nenhum serviço disponível no momento.
            </div>
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4">Próximos Serviços</h3>
      
      <ServiceCalendar 
        markedDates={['13', '14']} 
        month="Junho" 
        year="2023" 
      />
    </>
  );

  const renderExploreSection = () => (
    <>
      <div className="dashboard-card bg-white rounded-xl shadow-md mb-4 mt-2">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
          {isLoading ? (
            // Show loading skeletons
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ))
          ) : error ? (
            // Show error message
            <div className="p-8 text-center text-red-500">
              Erro ao carregar serviços. Por favor, tente novamente.
            </div>
          ) : filteredServices.length > 0 ? (
            // Show services
            filteredServices.map(service => (
              <AvailableServiceCard 
                key={service.id} 
                service={service} 
                onApply={handleApply}
              />
            ))
          ) : (
            // Show empty state
            <div className="p-8 text-center text-gray-500">
              Nenhum serviço disponível no momento.
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderChatSection = () => (
    <div className="mt-2">
      <h3 className="text-lg font-semibold mb-4">Mensagens</h3>
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h4 className="text-lg font-medium mb-2">Nenhuma mensagem disponível</h4>
        <p className="text-gray-500 mb-4">Quando você tiver mensagens de lojas ou clientes, elas aparecerão aqui.</p>
      </div>
    </div>
  );

  const renderCalendarSection = () => (
    <div className="mt-2">
      <h3 className="text-lg font-semibold mb-4">Minha Agenda</h3>
      <ServiceCalendar 
        markedDates={['13', '14']} 
        month="Junho" 
        year="2023" 
      />
    </div>
  );

  // Renderiza a seção apropriada com base na aba selecionada
  const renderDashboardContent = () => {
    switch(dashboardSection) {
      case 'home':
        return renderHomeSection();
      case 'explore':
        return renderExploreSection();
      case 'chat':
        return renderChatSection();
      case 'calendar':
        return renderCalendarSection();
      default:
        return renderHomeSection();
    }
  };

  return (
    <div className="p-4">
      {renderDashboardContent()}
    </div>
  );
};

export default AssemblerDashboard;
