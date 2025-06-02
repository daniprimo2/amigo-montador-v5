import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Search, SlidersHorizontal, MessageSquare, Wifi, Star, CheckCheck, ChevronRight, User, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AvailableServiceCard from './available-service-card';
import CompletedServiceCard from './completed-service-card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebSocket } from '@/hooks/use-websocket';
import { ChatInterface } from '@/components/chat/chat-interface';
import { RatingDialog } from '@/components/rating/rating-dialog';
import { ProfileDialog } from './profile-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  completedAt?: string; // Data de finalização do serviço
}

interface ChatMessage {
  id: number;
  content: string;
  timestamp: string;
  isFromUser: boolean;
  sender: {
    name: string;
    avatar: string;
  };
}

interface ChatService {
  id: number;
  store: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface ChatDialogProps {
  serviceId: number;
  onClose: () => void;
}

const ChatDialog: React.FC<ChatDialogProps> = ({ serviceId, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chat do Serviço</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>
        <div className="flex-1">
          <ChatInterface 
            serviceId={serviceId} 
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

// Lista das principais cidades brasileiras
const brazilianCities = [
  'Todas as cidades',
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Salvador',
  'Brasília',
  'Fortaleza',
  'Curitiba',
  'Recife',
  'Porto Alegre',
  'Manaus',
  'Belém',
  'Goiânia',
  'Guarulhos',
  'Campinas',
  'São Luís',
  'São Gonçalo',
  'Maceió',
  'Duque de Caxias',
  'Natal'
];

export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas as cidades');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'home' | 'explore' | 'chat'>('home');
  const [activeTab, setActiveTab] = useState<'available' | 'in-progress' | 'completed'>('available');
  const [selectedChatService, setSelectedChatService] = useState<number | null>(null);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [ratingServiceId, setRatingServiceId] = useState<number | null>(null);
  const [ratingToUserId, setRatingToUserId] = useState<number | null>(null);
  const [ratingUserName, setRatingUserName] = useState<string>('');
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Configurar WebSocket para notificações em tempo real
  const socket = useWebSocket();

  // Função para lidar com as mensagens do WebSocket
  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Mensagem recebida:', data.type, data);
          
          if (data.type === 'new_message') {
            // Invalidar consultas relacionadas a mensagens
            queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            // Mostrar notificação
            toast({
              title: "Nova mensagem",
              description: `Nova mensagem de ${data.storeName}`,
            });
          } else if (data.type === 'new_application') {
            // Invalidar serviços quando há nova candidatura
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            toast({
              title: "Nova candidatura",
              description: data.message,
            });
          } else if (data.type === 'service_completed') {
            // Invalidar serviços quando um serviço é finalizado
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            toast({
              title: "Serviço finalizado",
              description: data.message,
            });
          } else if (data.type === 'service_confirmed') {
            // Invalidar serviços quando um serviço é confirmado
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            toast({
              title: "Serviço confirmado",
              description: data.message,
            });
          } else if (data.type === 'payment_ready') {
            // Invalidar serviços quando pagamento está pronto
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            toast({
              title: "Pagamento disponível",
              description: data.message,
            });
          }
        } catch (error) {
          console.error('[WebSocket] Erro ao processar mensagem:', error);
        }
      };

      socket.addEventListener('message', handleMessage);

      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, queryClient, toast]);

  // Carregar os serviços disponíveis para candidatura
  const { data: rawServices = [], isLoading, error } = useQuery({
    queryKey: ['/api/services'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    select: (data: ServiceData[]) => {
      return data.map(service => ({
        id: service.id,
        title: service.title,
        location: service.location,
        distance: '2.5 km', // Placeholder - seria calculado baseado na localização
        date: service.date,
        startDate: service.startDate || null,
        endDate: service.endDate || null,
        price: service.price,
        store: service.store || 'Loja não especificada',
        type: service.materialType || service.type || 'Não especificado',
        status: service.status,
        projectFiles: service.projectFiles || [],
        description: service.description
      }));
    }
  });

  // Filtrar apenas serviços com status 'open' para exibir na aba "Disponíveis"
  const availableServices = rawServices.filter(service => service.status === 'open');

  // Filter services based on search and city
  const filteredServices = availableServices.filter(service => {
    const matchesSearch = !searchTerm || 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof service.store === 'string' ? service.store.toLowerCase() : service.store?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      service.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = selectedCity === 'Todas as cidades' || 
      service.location.toLowerCase().includes(selectedCity.toLowerCase());
    
    return matchesSearch && matchesCity;
  });

  // Carregar serviços ativos (candidaturas aceitas e em andamento)
  const { data: activeServices = [], isLoading: isLoadingActiveServices } = useQuery({
    queryKey: ['/api/services/active'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Separar serviços ativos por status
  const inProgressServices = activeServices.filter((service: any) => service.status === 'in-progress');
  const completedServicesFromActive = activeServices.filter((service: any) => service.status === 'completed');

  // Calculate service counts by status
  const serviceCounts = {
    // Disponíveis: apenas serviços com status 'open' do rawServices
    available: availableServices.length,
    // Em andamento: apenas contar serviços do activeServices com status 'in-progress'
    inProgress: inProgressServices.length,
    // Finalizados: apenas serviços do activeServices com status 'completed'
    completed: completedServicesFromActive.length
  };
  
  // Handle applying for a service
  const applyMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      try {
        console.log(`Enviando candidatura para serviço ID: ${serviceId}`);
        const url = `/api/services/${serviceId}/apply`;
        const response = await apiRequest({
          method: "POST",
          url
        });
        console.log('Resposta da candidatura:', response);
        return response;
      } catch (error) {
        console.error('Erro ao enviar candidatura:', error);
        throw error;
      }
    },
    onSuccess: (data, serviceId) => {
      console.log('Candidatura enviada com sucesso para o serviço:', serviceId);
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      toast({
        title: "Candidatura enviada",
        description: "Sua candidatura foi enviada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Erro na candidatura:', error);
      let errorMessage = "Erro ao enviar candidatura. Tente novamente.";
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Erro na candidatura",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleApply = (serviceId: number) => {
    console.log(`Aplicando para serviço ID: ${serviceId}`);
    applyMutation.mutate(serviceId);
  };

  // Carregar contagem de mensagens não lidas
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Handle tab change event
  const handleTabChange = (event: CustomEvent) => {
    setActiveTab(event.detail.value);
  };

  // Handle opening rating dialog
  const handleOpenRatingDialog = (event: CustomEvent) => {
    setIsRatingDialogOpen(true);
    setRatingServiceId(event.detail.serviceId);
    setRatingToUserId(event.detail.toUserId);
    setRatingUserName(event.detail.userName);
  };

  // Handle rating click
  const handleRateClick = (serviceId: number, toUserId: number, userName: string) => {
    setIsRatingDialogOpen(true);
    setRatingServiceId(serviceId);
    setRatingToUserId(toUserId);
    setRatingUserName(userName);
  };

  // Render content based on dashboard section
  const renderHomeSection = () => (
    <>
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Disponíveis</p>
              <p className="text-2xl font-bold text-blue-600">{serviceCounts.available}</p>
            </div>
            <Search className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em andamento</p>
              <p className="text-2xl font-bold text-orange-600">{serviceCounts.inProgress}</p>
            </div>
            <Wifi className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concluídos</p>
              <p className="text-2xl font-bold text-green-600">{serviceCounts.completed}</p>
            </div>
            <CheckCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tabs para diferentes tipos de serviços */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">
            Disponíveis ({serviceCounts.available})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            Em Andamento ({serviceCounts.inProgress})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Finalizados ({serviceCounts.completed})
          </TabsTrigger>
        </TabsList>

        {/* Aba de Serviços Disponíveis */}
        <TabsContent value="available">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Serviços Disponíveis</h3>
              <p className="text-sm text-gray-600">Encontre e candidate-se aos serviços disponíveis</p>
            </div>
            
            <div className="p-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por título, loja ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Popover open={isCityDropdownOpen} onOpenChange={setIsCityDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] justify-between">
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedCity}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <div className="max-h-[200px] overflow-y-auto">
                      {brazilianCities.map((city) => (
                        <div
                          key={city}
                          className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                            selectedCity === city ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                          onClick={() => {
                            setSelectedCity(city);
                            setIsCityDropdownOpen(false);
                          }}
                        >
                          {city}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Services List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">
                  Erro ao carregar serviços. Por favor, tente novamente.
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="space-y-4">
                  {filteredServices.map(service => (
                    <AvailableServiceCard
                      key={service.id}
                      service={service}
                      onApply={() => handleApply(service.id)}
                      isApplying={applyMutation.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum serviço encontrado com os filtros selecionados.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aba de Serviços Em Andamento */}
        <TabsContent value="in-progress">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Serviços Em Andamento</h3>
              <p className="text-sm text-gray-600">
                Gerencie seus serviços aceitos - {user?.assembler?.name || user?.name}
              </p>
            </div>
            
            <div className="p-4">
              {isLoadingActiveServices ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : inProgressServices.length > 0 ? (
                <div className="space-y-4">
                  {inProgressServices.map((service: any) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{service.title}</h4>
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          Em andamento
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.store}</p>
                      <p className="text-sm text-gray-500 mb-3">{service.location}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedChatService(service.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Wifi className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum serviço em andamento no momento.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aba de Serviços Finalizados */}
        <TabsContent value="completed">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Serviços Finalizados</h3>
              <p className="text-sm text-gray-600">Histórico de serviços concluídos</p>
            </div>
            
            <div className="p-4">
              {isLoadingActiveServices ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : error ? (
                // Show error message
                <div className="p-8 text-center text-red-500">
                  Erro ao carregar serviços. Por favor, tente novamente.
                </div>
              ) : completedServicesFromActive.length > 0 ? (
                // Show completed services
                <>
                  {completedServicesFromActive.map((service: any) => (
                    <CompletedServiceCard 
                      key={`completed-${service.id}`}
                      service={{
                        id: service.id,
                        title: service.title,
                        location: service.location || '',
                        date: service.date ? new Date(service.date).toLocaleDateString('pt-BR') : 'Data não especificada',
                        price: service.price ? `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}` : '',
                        store: service.store?.name || service.store || 'Loja não especificada',
                        type: service.materialType || 'Não especificado',
                        completedAt: service.completedAt ? new Date(service.completedAt).toLocaleDateString('pt-BR') : undefined,
                        rated: !!service.rated
                      }}
                      onRateClick={handleRateClick}
                      onChatClick={(serviceId) => setSelectedChatService(serviceId)}
                    />
                  ))}
                </>
              ) : (
                // Show empty state
                <div className="p-8 text-center text-gray-500">
                  <CheckCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum serviço concluído ainda.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Montador</h1>
            <p className="text-sm text-gray-600">
              Bem-vindo, {user?.assembler?.name || user?.name}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setDashboardSection('chat')}
              >
                <MessageSquare className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Perfil</span>
            </Button>

            {/* Logout Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onLogout}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {renderHomeSection()}
      </div>

      {/* Chat Dialog */}
      {selectedChatService && (
        <ChatDialog
          serviceId={selectedChatService}
          onClose={() => setSelectedChatService(null)}
        />
      )}
      
      {/* Rating Dialog */}
      <RatingDialog
        isOpen={isRatingDialogOpen}
        onClose={() => setIsRatingDialogOpen(false)}
        serviceId={ratingServiceId}
        toUserId={ratingToUserId}
        userName={ratingUserName}
      />

      {/* Profile Dialog */}
      <ProfileDialog
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        onLogout={onLogout}
      />
    </div>
  );
};

export default AssemblerDashboard;