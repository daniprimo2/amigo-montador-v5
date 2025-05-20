import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Search, SlidersHorizontal, MessageSquare, Calendar, Wifi, Star, CheckCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AvailableServiceCard from './available-service-card';
import CompletedServiceCard from './completed-service-card';
import ServiceCalendar from './service-calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebSocket } from '@/hooks/use-websocket';
import { ChatInterface } from '@/components/chat/chat-interface';
import { RatingDialog } from '@/components/rating/rating-dialog';
import { ProfileDialog } from './profile-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
    type: service.materialType || service.type || 'Não especificado', // Garantir que nunca seja undefined
    status: service.status // Passar o status do serviço para o componente
  };
};

// Extrair as datas dos serviços para marcação no calendário
const getServiceDates = (services?: ServiceData[]) => {
  if (!services) return [];
  
  const dates: string[] = [];
  
  services.forEach(service => {
    try {
      // Tenta extrair o dia da data do serviço
      const dateString = service.date;
      
      // Verifica se contém um intervalo (formato "2025-05-15 - 2025-05-30")
      if (dateString.includes(' - ')) {
        const [startDate] = dateString.split(' - ');
        const day = new Date(startDate).getDate().toString();
        if (!dates.includes(day)) {
          dates.push(day);
        }
      } else {
        // Formato data normal
        const day = new Date(dateString).getDate().toString();
        if (!isNaN(Number(day)) && !dates.includes(day)) {
          dates.push(day);
        }
      }
    } catch (e) {
      console.error('Erro ao processar data:', service.date);
    }
  });
  
  return dates;
};

// Obter o mês atual em português
const getCurrentMonth = () => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[new Date().getMonth()];
};

// Obter o ano atual
const getCurrentYear = () => {
  return new Date().getFullYear().toString();
};

export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardSection, setDashboardSection] = useState<'home' | 'explore' | 'chat' | 'calendar'>('home');
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<any>(null);
  const { connected, lastMessage } = useWebSocket();
  
  // Reagir a mensagens de WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'application_accepted') {
      // Isso poderia mudar automaticamente para a seção de chat
      setDashboardSection('chat');
      
      console.log("[AssemblerDashboard] Candidatura aceita! Atualizando interface...");
      
      // Invalidar queries manualmente para garantir atualização
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    }
  }, [lastMessage, queryClient]);
  
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
  
  // Fetch available services
  const { data: rawServices } = useQuery({
    queryKey: ['/api/services'],
    select: (data: ServiceData[]) => data
  });
  
  // Buscar serviços em andamento que o montador está participando
  const { data: activeServices, isLoading: isLoadingActiveServices } = useQuery({
    queryKey: ['/api/services/active'],
    queryFn: async () => {
      const response = await fetch('/api/services/active');
      if (!response.ok) {
        throw new Error('Falha ao buscar serviços ativos');
      }
      return response.json();
    }
    // Sempre buscar os serviços ativos independente da aba selecionada
  });
  
  // Filter services by search term
  const filteredServices = services?.filter(service => 
    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.type && service.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    service.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.location.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Calculate service counts by status
  const serviceCounts = {
    available: filteredServices.length || 0,
    inProgress: activeServices?.length || 0, // Usar os serviços ativos do endpoint /api/services/active
    completed: rawServices?.filter(s => s.status === 'completed').length || 0
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
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Falha ao enviar candidatura");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro na candidatura:", error);
        throw error; // Propagando o erro para o onError
      }
    },
    onSuccess: (data) => {
      console.log("Candidatura enviada com sucesso:", data);
      
      // Extrair o ID do serviço da resposta
      const serviceId = data.application?.serviceId;
      console.log(`Candidatura aceita para serviço ID: ${serviceId}`);
      
      // Refresh services list
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Atualizar o estado para abrir o chat automaticamente
      if (serviceId) {
        // Esperar um momento para a UI atualizar
        setTimeout(() => {
          // Definir o serviço selecionado para o chat
          setSelectedChatService(serviceId);
          
          // Mudar para a seção de chat
          setDashboardSection('chat');
          
          toast({
            title: "Candidatura enviada",
            description: "Chat aberto automaticamente para comunicação com a loja",
            duration: 5000
          });
        }, 500);
      }
    },
    onError: (error: any) => {
      console.error("Erro completo ao candidatar-se:", error);
      // Sem toast aqui, pois já mostramos no componente
    }
  });
  
  const handleApply = async (serviceId: number) => {
    try {
      console.log(`AssemblerDashboard iniciando aplicação para serviço ${serviceId}`);
      return await applyMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error(`AssemblerDashboard erro ao aplicar para serviço ${serviceId}:`, error);
      throw error; // Propagando o erro para o componente AvailableServiceCard
    }
  };
  
  // Função para lidar com o clique no botão de avaliação
  const handleRateClick = (service: any) => {
    setSelectedServiceForRating(service);
    setIsRatingDialogOpen(true);
  };

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Montador'}</span>
          </h2>
          <button 
            className="text-primary text-sm font-medium"
            onClick={() => setIsProfileDialogOpen(true)}
          >
            Ver Perfil
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">{serviceCounts.available}</div>
            <div className="text-xs text-gray-500">Disponíveis</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">{serviceCounts.inProgress}</div>
            <div className="text-xs text-gray-500">Em Andamento</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-center">
            <div className="font-bold text-xl text-primary">{serviceCounts.completed}</div>
            <div className="text-xs text-gray-500">Finalizados</div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="available" className="mt-4">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="available">Disponíveis</TabsTrigger>
          <TabsTrigger value="in-progress">Em Andamento</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available">
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
                // Show services (limitado a 3 para a tela inicial)
                filteredServices.slice(0, 3).map(service => (
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
        </TabsContent>
        
        <TabsContent value="in-progress">
          <div className="dashboard-card bg-white rounded-xl shadow-md mb-4">
            <div className="divide-y">
              {isLoadingActiveServices ? (
                // Show loading skeletons
                Array(2).fill(0).map((_, index) => (
                  <div key={index} className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                  </div>
                ))
              ) : !activeServices || activeServices.length === 0 ? (
                // Show empty state
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum serviço em andamento.</p>
                </div>
              ) : (
                // Show active services
                activeServices.map((service: any) => (
                  <div 
                    key={service.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedChatService(service.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-lg">{service.title}</h4>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          Em Andamento
                        </span>
                        {service.hasNewMessages ? (
                          <div className="relative">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full animate-pulse">!</span>
                          </div>
                        ) : (
                          <MessageSquare className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      <p>Loja: {service.store?.name || 'Não especificada'}</p>
                      <p>Local: {service.location || 'Não especificado'}</p>
                      <p>Data: {service.date ? new Date(service.date).toLocaleDateString('pt-BR') : 'Não especificada'}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-primary font-semibold">
                        {service.price ? `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}` : 'Preço não especificado'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedChatService(service.id);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ver Chat
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="dashboard-card bg-white rounded-xl shadow-md mb-4">
            <div className="divide-y">
              {isLoading ? (
                // Show loading skeletons
                Array(2).fill(0).map((_, index) => (
                  <div key={index} className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                  </div>
                ))
              ) : error ? (
                // Show error message
                <div className="p-8 text-center text-red-500">
                  Erro ao carregar serviços. Por favor, tente novamente.
                </div>
              ) : (rawServices && rawServices.filter(s => s.status === 'completed').length > 0) ? (
                // Show completed services
                rawServices.filter(s => s.status === 'completed').map(service => (
                  <CompletedServiceCard 
                    key={service.id} 
                    service={{
                      id: service.id,
                      title: service.title,
                      location: service.location || '',
                      date: new Date(service.date).toLocaleDateString('pt-BR'),
                      price: `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}`,
                      store: service.store?.name || 'Loja não especificada',
                      type: service.materialType || service.type || 'Não especificado',
                      rated: false // Isso teria que vir do backend
                    }}
                    onRateClick={handleRateClick}
                  />
                ))
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
      
      <h3 className="text-lg font-semibold mb-4">Próximos Serviços</h3>
      
      <ServiceCalendar 
        markedDates={getServiceDates(rawServices)} 
        month={getCurrentMonth()} 
        year={getCurrentYear()} 
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

  // Buscar serviços em andamento que o montador está participando
  
  // Estado para controlar qual serviço está selecionado para chat
  const [selectedChatService, setSelectedChatService] = useState<number | null>(null);
  // No dashboard do montador, não precisamos armazenar o ID do montador em um estado separado
  // já que só exibimos as mensagens do próprio montador logado
  
  const renderChatSection = () => {
    return (
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-4">Conversas</h3>
        
        {isLoadingActiveServices ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : activeServices && activeServices.length > 0 ? (
          <div className="space-y-3">
            {activeServices.map((service: any) => (
              <div 
                key={service.id} 
                className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedChatService(service.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{service.title}</h4>
                    <p className="text-sm text-gray-500">
                      Loja: {service.store?.name || 'Não especificada'}
                    </p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma conversa disponível</h4>
            <p className="text-gray-500 mb-4">Quando você tiver mensagens de lojas ou clientes, elas aparecerão aqui.</p>
          </div>
        )}
      </div>
    );
  };

  const renderCalendarSection = () => (
    <div className="mt-2">
      <h3 className="text-lg font-semibold mb-4">Minha Agenda</h3>
      <ServiceCalendar 
        markedDates={getServiceDates(rawServices)} 
        month={getCurrentMonth()} 
        year={getCurrentYear()} 
      />
    </div>
  );

  // Reagir a novas mensagens recebidas via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log("[AssemblerDashboard] Nova mensagem recebida via WebSocket", lastMessage);
      
      // Atualizar as listas relevantes para refletir nova mensagem
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Invalidar a lista de mensagens específica se houver serviceId
      if (lastMessage.serviceId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/services/${lastMessage.serviceId}/messages`] 
        });
        
        // Definir o serviço selecionado para o chat
        setSelectedChatService(lastMessage.serviceId);
        
        // Mudar para a seção de chat
        setDashboardSection('chat');
        
        // Exibir notificação sonora ou visual para o usuário
        toast({
          title: "Nova mensagem recebida",
          description: "Chat aberto automaticamente",
          duration: 5000
        });
      } else if (dashboardSection !== 'chat') {
        toast({
          title: "Novo chat disponível",
          description: "Clique na aba Chat para visualizar a conversa",
          duration: 5000
        });
      }
    }
  }, [lastMessage, dashboardSection, queryClient, toast]);
  
  // Renderiza a seção apropriada com base na aba selecionada
  const renderDashboardContent = () => {
    // Se houver um serviço selecionado para chat, mostra a interface de chat
    // independente da seção atual do dashboard
    if (selectedChatService !== null) {
      return (
        <ChatInterface 
          serviceId={selectedChatService}
          assemblerId={user?.assembler?.id} // Passa ID do montador atual 
          onBack={() => setSelectedChatService(null)} 
        />
      );
    }
    
    // Caso contrário, mostra a seção correspondente à aba selecionada
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
      
      {/* Diálogo de Avaliação */}
      {selectedServiceForRating && (
        <RatingDialog
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          serviceId={selectedServiceForRating.id}
          toUserId={selectedServiceForRating.store?.userId || 0}
          toUserName={selectedServiceForRating.store?.name || 'Loja'}
          serviceName={selectedServiceForRating.title}
          onSuccess={() => {
            // Atualizar listas de serviços após avaliação
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            // Notificar usuário sobre avaliação
            toast({
              title: 'Avaliação enviada com sucesso',
              description: 'Obrigado por avaliar este serviço!'
            });
          }}
        />
      )}
      
      {/* Diálogo de Perfil */}
      <ProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        onLogout={onLogout}
      />
    </div>
  );
};

export default AssemblerDashboard;
