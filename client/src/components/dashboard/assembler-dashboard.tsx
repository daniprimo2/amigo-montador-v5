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

// Format data for display in the UI
const formatServiceForDisplay = (service: ServiceData & { startDate?: string; endDate?: string; projectFiles?: any }) => {
  return {
    id: service.id,
    title: service.title,
    location: service.location,
    distance: '5 km', // This would be calculated based on user location
    date: service.date || 'Data não informada', // Manter o formato original do backend
    startDate: service.startDate || null, // Incluir startDate do backend
    endDate: service.endDate || null, // Incluir endDate do backend
    price: `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}`,
    store: service.store || 'Loja não especificada',
    type: service.materialType || service.type || 'Não especificado', // Garantir que nunca seja undefined
    status: service.status, // Passar o status do serviço para o componente
    projectFiles: service.projectFiles || [], // Incluir os arquivos do projeto
    description: service.description // Incluir a descrição se houver
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

// Importar o diálogo de confirmação
import { ServiceConfirmDialog } from '@/components/payment/service-confirm-dialog';
import { PaymentDialog } from '@/components/payment/payment-dialog';

export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas as cidades');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'home' | 'explore' | 'chat'>('home');
  const [activeTab, setActiveTab] = useState<'available' | 'in-progress' | 'completed'>('available');
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<any>(null);
  const [selectedServiceForConfirm, setSelectedServiceForConfirm] = useState<any>(null);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<any>(null);
  const { connected, lastMessage } = useWebSocket();

  // Lista de cidades brasileiras principais para filtro
  const brazilianCities = [
    'Todas as cidades',
    'São Paulo, SP',
    'Rio de Janeiro, RJ',
    'Brasília, DF',
    'Salvador, BA',
    'Fortaleza, CE',
    'Belo Horizonte, MG',
    'Manaus, AM',
    'Curitiba, PR',
    'Recife, PE',
    'Goiânia, GO',
    'Belém, PA',
    'Porto Alegre, RS',
    'Guarulhos, SP',
    'Campinas, SP',
    'São Luís, MA',
    'São Gonçalo, RJ',
    'Maceió, AL',
    'Duque de Caxias, RJ',
    'Natal, RN',
    'Teresina, PI',
    'Campo Grande, MS',
    'Nova Iguaçu, RJ',
    'São Bernardo do Campo, SP',
    'João Pessoa, PB',
    'Santo André, SP',
    'Osasco, SP',
    'Jaboatão dos Guararapes, PE',
    'São José dos Campos, SP',
    'Ribeirão Preto, SP',
    'Uberlândia, MG',
    'Sorocaba, SP',
    'Contagem, MG',
    'Aracaju, SE',
    'Feira de Santana, BA',
    'Cuiabá, MT',
    'Joinville, SC',
    'Juiz de Fora, MG',
    'Londrina, PR',
    'Aparecida de Goiânia, GO',
    'Niterói, RJ',
    'Ananindeua, PA',
    'Belford Roxo, RJ',
    'Caxias do Sul, RS',
    'Campos dos Goytacazes, RJ',
    'São João de Meriti, RJ',
    'Vila Velha, ES',
    'Florianópolis, SC',
    'Santos, SP',
    'Carapicuíba, SP'
  ];
  
  // Reagir a mensagens de WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    
    if (lastMessage.type === 'application_accepted') {
      // Isso muda automaticamente para a seção de chat
      setDashboardSection('chat');
      
      console.log("[AssemblerDashboard] Candidatura aceita! Atualizando interface...");
      
      // Invalidar queries manualmente para garantir atualização
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    } 
    // Quando receber notificação automática de serviço pelo lojista
    else if (lastMessage.type === 'automatic_notification') {
      console.log("[AssemblerDashboard] Notificação automática recebida do lojista", lastMessage);
      
      // Atualizar todas as listas de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Se houver dados do serviço, abrir diálogo de confirmação
      if (lastMessage.serviceId && lastMessage.serviceData) {
        const service = lastMessage.serviceData;
        
        // Configurar dados para confirmação do serviço pelo montador
        setSelectedServiceForConfirm({
          id: service.id,
          title: service.title,
          price: service.price || 'Valor não definido'
        });
        
        // Forçar a abertura do diálogo de confirmação
        setIsConfirmDialogOpen(true);
        
        // Vibrar no celular se API estiver disponível
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 100, 300]);
        }
        
        // Mudar para a seção inicial para contexto
        setDashboardSection('home');
        
        // Notificar o montador sobre a necessidade de confirmar
        toast({
          title: '🔔 Notificação automática',
          description: 'O lojista enviou uma notificação de serviço. Por favor, confirme para prosseguir.',
          duration: 10000,
          variant: 'default',
          className: 'bg-orange-100 border-orange-500 border-2 font-medium shadow-lg animate-pulse'
        });
      }
    }
    // Quando receber notificação de pagamento disponível após confirmação
    else if (lastMessage.type === 'payment_ready') {
      console.log("[AssemblerDashboard] Notificação de pagamento disponível recebida", lastMessage);
      
      // Atualizar todas as listas de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      // Se houver dados do serviço, abrir diálogo de pagamento
      if (lastMessage.serviceId && lastMessage.serviceData) {
        const service = lastMessage.serviceData;
        
        // Configurar dados para pagamento do serviço pelo montador
        setSelectedServiceForPayment({
          id: service.id,
          title: service.title,
          amount: service.price || '0.00'
        });
        
        // Forçar a abertura do diálogo de pagamento
        setIsPaymentDialogOpen(true);
        
        // Vibrar no celular se API estiver disponível (padrão mais longo para pagamento)
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }
        
        // Mudar para a seção inicial para contexto
        setDashboardSection('home');
        
        // Notificar o montador sobre disponibilidade de pagamento
        toast({
          title: '💳 Pagamento Disponível',
          description: 'O serviço foi confirmado. Você já pode fazer o pagamento.',
          duration: 10000,
          variant: 'default',
          className: 'bg-blue-100 border-blue-500 border-2 font-medium shadow-lg animate-pulse'
        });
      }
    }
    // Quando o serviço já foi confirmado pelo montador e está pronto para pagamento
    else if (lastMessage.type === 'payment_ready') {
      console.log("[AssemblerDashboard] Serviço confirmado e pronto para pagamento", lastMessage);
      
      // Atualizar todas as listas de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Se houver dados do serviço, abrir diálogo de pagamento
      if (lastMessage.serviceId && lastMessage.serviceData) {
        const service = lastMessage.serviceData;
        
        // Configurar dados para pagamento
        setSelectedServiceForPayment({
          id: service.id,
          title: service.title,
          amount: service.price || 'Valor não definido'
        });
        
        // Forçar a abertura do diálogo de pagamento
        setIsPaymentDialogOpen(true);
        
        // Notificar o montador sobre a necessidade de pagamento
        toast({
          title: '💰 Pagamento pendente',
          description: 'O serviço foi confirmado e agora está pronto para pagamento.',
          duration: 8000,
          className: 'bg-green-100 border-green-500 border-2 font-medium shadow-lg'
        });
      }
    }
    else if (lastMessage.type === 'service_completed') {
      console.log("[AssemblerDashboard] Serviço finalizado, abrindo tela de avaliação", lastMessage);
      
      // Atualizar todas as listas de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Se houver dados do serviço, abrir diálogo de avaliação
      if (lastMessage.serviceId && lastMessage.serviceData) {
        const service = lastMessage.serviceData;
        const storeData = service.storeData;
        
        if (storeData) {
          // Configurar dados para avaliação da loja pelo montador
          setSelectedServiceForRating({
            id: service.id,
            title: service.title,
            store: {
              id: storeData.id,
              userId: storeData.userId,
              name: storeData.name
            }
          });
          
          // Bloquear o restante da interface até que a avaliação seja concluída
          // Forçar a abertura do diálogo de avaliação
          setIsRatingDialogOpen(true);
          
          // Mudar para a seção inicial e mostrar serviços concluídos para contexto
          setDashboardSection('home');
          
          toast({
            title: '🌟 Serviço finalizado!',
            description: 'É necessário avaliar o serviço antes de continuar.',
            duration: 10000,
            variant: 'destructive',
            className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg'
          });
        }
      }
    }
  }, [lastMessage, queryClient, toast]);
  
  // Escuta os eventos de mudança de aba do layout
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      setDashboardSection(tab);
    };
    
    // Listener para evento de abrir avaliação
    const handleOpenRatingDialog = (event: CustomEvent) => {
      const { serviceId, serviceData } = event.detail;
      
      if (serviceData && serviceData.storeData) {
        // Configurar dados para avaliação da loja pelo montador
        setSelectedServiceForRating({
          id: serviceData.id,
          title: serviceData.title,
          store: {
            id: serviceData.storeData.id,
            userId: serviceData.storeData.userId,
            name: serviceData.storeData.name
          }
        });
        
        // Abrir diálogo de avaliação automaticamente
        setIsRatingDialogOpen(true);
        
        // Mudar para a seção de serviços concluídos
        setDashboardSection('home');
      }
    };
    
    // Adiciona os listeners para os eventos personalizados
    window.addEventListener('dashboard-tab-change', handleTabChange as EventListener);
    window.addEventListener('open-rating-dialog', handleOpenRatingDialog as EventListener);
    
    // Remove os listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('dashboard-tab-change', handleTabChange as EventListener);
      window.removeEventListener('open-rating-dialog', handleOpenRatingDialog as EventListener);
    };
  }, []);
  
  // Fetch available services
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['/api/services'],
    select: (data: ServiceData[]) => data.map(formatServiceForDisplay),
    staleTime: 0, // Force fresh data
    cacheTime: 0 // Don't cache
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
  
  // Filter services by search term and selected city
  const filteredServices = services?.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.type && service.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      service.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = selectedCity === 'Todas as cidades' || 
      service.location.toLowerCase().includes(selectedCity.toLowerCase());
    
    return matchesSearch && matchesCity;
  }) || [];

  // Filtrar serviços por status para cada aba
  const availableServices = filteredServices.filter(service => service.status === 'open');
  const inProgressServices = activeServices?.filter((service: any) => 
    service.status === 'in-progress'
  ) || [];
  const completedServicesFromRaw = rawServices?.filter(s => s.status === 'completed') || [];
  const completedServicesFromActive = activeServices?.filter((s: any) => s.status === 'completed') || [];
  
  // Debug logs para entender a categorização
  console.log("[AssemblerDashboard] Serviços disponíveis:", availableServices.length);
  console.log("[AssemblerDashboard] Serviços em andamento:", inProgressServices.length);
  console.log("[AssemblerDashboard] Serviços finalizados (raw):", completedServicesFromRaw.length);
  console.log("[AssemblerDashboard] Serviços finalizados (active):", completedServicesFromActive.length);
  console.log("[AssemblerDashboard] Total rawServices:", rawServices?.length || 0);
  console.log("[AssemblerDashboard] Total activeServices:", activeServices?.length || 0);
  
  // Debug detalhado dos serviços por status
  console.log("[AssemblerDashboard] Serviços disponíveis detalhados:", availableServices.map(s => ({ id: s.id, title: s.title, status: s.status })));
  console.log("[AssemblerDashboard] Serviços em andamento detalhados:", inProgressServices.map((s: any) => ({ id: s.id, title: s.title, status: s.status })));
  console.log("[AssemblerDashboard] Serviços finalizados detalhados:", completedServicesFromActive.map((s: any) => ({ id: s.id, title: s.title, status: s.status })));
  
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
    
    // Mostrar notificação sobre a avaliação obrigatória
    toast({
      title: '🌟 Avaliação Necessária',
      description: 'É necessário avaliar este serviço antes de continuar usando o aplicativo.',
      duration: 8000,
      variant: 'destructive',
      className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg'
    });
  };

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex flex-col mb-4">
          <div className="flex items-center justify-between">
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
          
          {/* Exibir avaliação média do montador */}
          {user?.assembler && 'rating' in user.assembler && (
            <div className="flex items-center mt-1">
              <div className="flex items-center text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= (user.assembler?.rating || 0)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm ml-2 text-gray-600">
                {user.assembler?.rating ? user.assembler.rating.toFixed(1) : '0.0'} Avaliação média
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div 
            className={`rounded-lg p-3 text-center transition-all duration-300 cursor-pointer ${
              serviceCounts.available > 0 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:from-blue-100 hover:to-indigo-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => serviceCounts.available > 0 && setDashboardSection('explore')}
          >
            <div className={`font-bold text-xl ${serviceCounts.available > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
              🔵 {serviceCounts.available}
            </div>
            <div className="text-xs text-gray-600 font-medium">Disponíveis</div>
          </div>
          <div 
            className={`rounded-lg p-3 text-center transition-all duration-300 cursor-pointer ${
              serviceCounts.inProgress > 0 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm hover:shadow-md hover:from-amber-100 hover:to-orange-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => {
              if (serviceCounts.inProgress > 0) {
                setDashboardSection('home');
                setActiveTab('in-progress');
              }
            }}
          >
            <div className={`font-bold text-xl ${serviceCounts.inProgress > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
              🟠 {serviceCounts.inProgress}
            </div>
            <div className="text-xs text-gray-600 font-medium">Em Andamento</div>
          </div>
          <div 
            className={`rounded-lg p-3 text-center transition-all duration-300 cursor-pointer ${
              serviceCounts.completed > 0 
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 shadow-sm hover:shadow-md hover:from-emerald-100 hover:to-green-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => {
              if (serviceCounts.completed > 0) {
                setDashboardSection('home');
                setActiveTab('completed');
              }
            }}
          >
            <div className={`font-bold text-xl ${serviceCounts.completed > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
              ✅ {serviceCounts.completed}
            </div>
            <div className="text-xs text-gray-600 font-medium">Finalizados</div>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'available' | 'in-progress' | 'completed')} className="mt-4">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="available">Disponíveis</TabsTrigger>
          <TabsTrigger value="in-progress">Em Andamento</TabsTrigger>
          <TabsTrigger value="completed">Finalizados</TabsTrigger>
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
              ) : availableServices.length > 0 ? (
                // Show all available services
                availableServices.map(service => (
                  <AvailableServiceCard 
                    key={service.id} 
                    service={service} 
                    onApply={handleApply}
                    activeServices={activeServices || []}
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
              ) : !inProgressServices || inProgressServices.length === 0 ? (
                // Show empty state
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum serviço em andamento.</p>
                </div>
              ) : (
                // Show only truly in-progress services (not completed ones)
                inProgressServices.filter((service: any) => service.status === 'in-progress').map((service: any) => (
                  <div 
                    key={service.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedChatService(service.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-lg">{service.title}</h4>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2"
                          style={{ 
                            backgroundColor: service.status === 'completed' ? '#dcfce7' : '#dbeafe',
                            color: service.status === 'completed' ? '#166534' : '#1e40af'
                          }}>
                          {service.status === 'completed' ? 'Finalizado' : 'Em Andamento'}
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
                          setDashboardSection('chat');
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
              {isLoading || isLoadingActiveServices ? (
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
              ) : (completedServicesFromRaw.length > 0 || completedServicesFromActive.length > 0) ? (
                // Show completed services from both sources
                <>
                  {/* Show completed services from rawServices */}
                  {completedServicesFromRaw.map(service => (
                    <CompletedServiceCard 
                      key={`raw-${service.id}`} 
                      service={{
                        id: service.id,
                        title: service.title,
                        location: service.location || '',
                        date: new Date(service.date).toLocaleDateString('pt-BR'),
                        price: `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}`,
                        store: service.store || 'Loja não especificada',
                        type: service.materialType || service.type || 'Não especificado',
                        completedAt: service.completedAt ? new Date(service.completedAt).toLocaleDateString('pt-BR') : undefined,
                        rated: false // Será atualizado pelo backend
                      }}
                      onRateClick={handleRateClick}
                      onChatClick={(serviceId) => setSelectedChatService(serviceId)}
                    />
                  ))}
                  
                  {/* Show completed chat services */}
                  {completedServicesFromActive.map((service: any) => (
                    <CompletedServiceCard 
                      key={`chat-${service.id}`}
                      service={{
                        id: service.id,
                        title: service.title,
                        location: service.location || '',
                        date: service.date ? new Date(service.date).toLocaleDateString('pt-BR') : 'Data não especificada',
                        price: service.price ? `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}` : '',
                        store: service.store || 'Loja não especificada',
                        type: service.materialType || 'Não especificado',
                        completedAt: service.completedAt ? new Date(service.completedAt).toLocaleDateString('pt-BR') : undefined,
                        rated: !!service.rated
                      }}
                      onRateClick={handleRateClick}
                      onChatClick={(serviceId) => setSelectedChatService(serviceId)}
                    />
                  ))}
                  
                  {/* Seção de conversas finalizadas */}
                  {completedServicesFromActive.filter((service: any) => service.applicationStatus).length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <h4 className="text-md font-medium mb-3 text-gray-700">Ver Conversas Finalizadas</h4>
                      <div className="space-y-3">
                        {completedServicesFromActive.filter((service: any) => service.applicationStatus).map((service: any) => (
                          <div 
                            key={`completed-chat-${service.id}`} 
                            className="bg-white rounded-lg shadow-sm p-3 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                            onClick={() => setSelectedChatService(service.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="font-medium text-gray-800">{service.title}</h4>
                                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Finalizado
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  Loja: {service.store?.name || 'Não especificada'}
                                </p>
                              </div>
                              <MessageSquare className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
      
      <h3 className="text-lg font-semibold mb-4">Próximos Serviços</h3>
      
      <div className="bg-white rounded-lg p-4">
        <p className="text-gray-500 text-center">
          Visualização de próximos serviços disponível na aba "Início"
        </p>
      </div>
    </>
  );

  const renderExploreSection = () => (
    <>
      <div className="dashboard-card bg-white rounded-xl shadow-md mb-4 mt-2">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Serviços Próximos</h3>
            <Popover open={isCityDropdownOpen} onOpenChange={setIsCityDropdownOpen}>
              <PopoverTrigger asChild>
                <button className="text-sm text-primary flex items-center hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="max-w-[120px] truncate">{selectedCity}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-2 border-b">
                    <p className="text-sm font-medium text-gray-700">Filtrar por cidade</p>
                  </div>
                  <div className="py-2">
                    {brazilianCities.map((city) => (
                      <button
                        key={city}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          selectedCity === city ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setSelectedCity(city);
                          setIsCityDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {city}
                          {selectedCity === city && (
                            <CheckCheck className="h-4 w-4 ml-auto text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                activeServices={activeServices || []}
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
  
  // Buscar o perfil completo do montador para obter o ID
  const { data: profileData } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      if (!user || user.userType !== 'montador') return null;
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Falha ao buscar perfil do montador');
      }
      const data = await response.json();
      console.log("Perfil do montador carregado:", data);
      return data;
    },
    enabled: !!user && user.userType === 'montador'
  });
  
  const renderChatSection = () => {
    // Se estiver selecionado um chat específico, exibir a interface de chat
    if (selectedChatService !== null) {
      return (
        <ChatInterface 
          serviceId={selectedChatService} 
          onBack={() => setSelectedChatService(null)} 
        />
      );
    }
    
    // Mostrar serviços onde o montador tem conversas ativas (apenas serviços não finalizados)
    // Incluir serviços onde há candidatura (qualquer status) ou se está em andamento, mas NÃO os completos
    const activeChats = activeServices ? activeServices.filter((service: any) => {
      // Mostrar se tem candidatura ou está em andamento, mas excluir os completos
      return (service.applicationStatus || service.status === 'in-progress') && 
             service.status !== 'completed';
    }) : [];
    
    // Conversas finalizadas (apenas serviços completos)
    const completedChats = activeServices ? activeServices.filter((service: any) => {
      return service.status === 'completed' && service.applicationStatus;
    }) : [];
    
    console.log('[AssemblerDashboard] Serviços disponíveis para chat:', activeChats);
    
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
        ) : (activeChats.length === 0) ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma conversa disponível</h4>
            <p className="text-gray-500 mb-4">Quando você tiver mensagens de lojas ou clientes, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seção de conversas ativas */}
            {activeChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3">Conversas Ativas</h4>
                <div className="space-y-3">
                  {activeChats.map((service: any) => (
                    <div 
                      key={service.id} 
                      className={`bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 cursor-pointer ${service.hasUnreadMessages ? 'border-l-4 border-primary' : ''}`}
                      onClick={() => setSelectedChatService(service.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{service.title}</h4>
                            {service.hasUnreadMessages && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white animate-pulse">
                                Nova mensagem
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Loja: {service.store?.name || 'Não especificada'}
                          </p>
                        </div>
                        <MessageSquare className={`h-5 w-5 ${service.hasUnreadMessages ? 'text-primary' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Removido a seção de conversas finalizadas - movidas para a aba "Finalizados" */}
          </div>
        )}
      </div>
    );
  };



  // Reagir a novas mensagens recebidas via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log("[AssemblerDashboard] Nova mensagem recebida via WebSocket", lastMessage);
      console.log("[AssemblerDashboard] ID do montador do perfil:", user?.assembler?.id);
      
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
    // Log para diagnosticar se estamos obtendo o ID do montador corretamente
    console.log("Renderizando dashboard com perfil:", user);
    
    // Se estivermos na seção de chat E houver um serviço selecionado, mostrar a interface de chat
    if (dashboardSection === 'chat' && selectedChatService !== null) {
      const assemblerId = user?.assembler?.id;
      console.log(`Abrindo chat para serviço ${selectedChatService} com montador ID: ${assemblerId}`);
      
      return (
        <ChatInterface 
          serviceId={selectedChatService}
          assemblerId={assemblerId} // Passa ID do montador atual obtido do perfil
          onBack={() => setSelectedChatService(null)} 
        />
      );
    }
    
    // Se um tab de navegação foi selecionado, mas ainda estamos com um chat aberto, fechar o chat
    if (selectedChatService !== null && dashboardSection !== 'chat') {
      setSelectedChatService(null);
    }
    
    // Mostrar a seção correspondente à aba selecionada
    switch(dashboardSection) {
      case 'home':
        return renderHomeSection();
      case 'explore':
        return renderExploreSection();
      case 'chat':
        return renderChatSection();
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
      
      {/* Diálogo de Confirmação de Serviço (NOVO) */}
      {selectedServiceForConfirm && (
        <ServiceConfirmDialog
          open={isConfirmDialogOpen}
          onClose={() => setIsConfirmDialogOpen(false)}
          serviceId={selectedServiceForConfirm.id}
          serviceTitle={selectedServiceForConfirm.title}
          onConfirmed={() => {
            // Após confirmação, limpar os dados e atualizar listas
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
            
            // Aguardar um momento antes de abrir o diálogo de pagamento
            // Na prática, será aberto quando receber a notificação payment_ready
            setTimeout(() => {
              // Configurar dados para pagamento
              setSelectedServiceForPayment({
                id: selectedServiceForConfirm.id,
                title: selectedServiceForConfirm.title,
                amount: selectedServiceForConfirm.price
              });
              
              // Abrir diálogo de pagamento automaticamente
              setIsPaymentDialogOpen(true);
            }, 500);
            
            // Limpar dados da confirmação
            setSelectedServiceForConfirm(null);
          }}
        />
      )}
      
      {/* Diálogo de Pagamento (NOVO) */}
      {selectedServiceForPayment && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onClose={() => {
            setIsPaymentDialogOpen(false);
            setSelectedServiceForPayment(null);
          }}
          serviceId={selectedServiceForPayment.id}
          amount={selectedServiceForPayment.amount}
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
