import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Search, SlidersHorizontal, MessageSquare, Wifi, Star, CheckCheck, ChevronRight, User, ChevronDown, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AvailableServiceCard from './available-service-card';
import CompletedServiceCard from './completed-service-card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceCardSkeletonGrid } from '@/components/ui/service-card-skeleton';
import { useWebSocket } from '@/hooks/use-websocket';
import { ChatInterface } from '@/components/chat/chat-interface';
import { RatingDialog } from '@/components/rating/rating-dialog';
import { ProfileDialog } from './profile-dialog';
import { SkillsUpdateWizard } from './skills-update-wizard';
import { MandatoryRatingDialog } from '@/components/rating/mandatory-rating-dialog';
import { useMandatoryRatings } from '@/hooks/use-mandatory-ratings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { RankingSection } from '@/components/ranking/ranking-section';

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
const formatServiceForDisplay = (service: ServiceData & { startDate?: string; endDate?: string; projectFiles?: any; distance?: string }) => {
  return {
    id: service.id,
    title: service.title,
    location: service.location,
    distance: service.distance || 'Distância não calculada', // Use calculated distance from backend
    date: service.date || 'Data não informada', // Manter o formato original do backend
    startDate: service.startDate || null, // Incluir startDate do backend
    endDate: service.endDate || null, // Incluir endDate do backend
    price: `R$ ${parseFloat(service.price).toFixed(2).replace('.', ',')}`,
    store: typeof service.store === 'object' && service.store?.name ? service.store.name : (service.store || 'Loja não especificada'),
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
  const [selectedState, setSelectedState] = useState('Todos os estados');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState(1000); // Default 1000km - mostrar todos os serviços
  const [isDistanceFilterOpen, setIsDistanceFilterOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'home' | 'explore' | 'chat' | 'ranking'>('home');
  const [activeTab, setActiveTab] = useState<'available' | 'in-progress' | 'completed'>('available');
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSkillsWizardOpen, setIsSkillsWizardOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<any>(null);
  const [selectedServiceForConfirm, setSelectedServiceForConfirm] = useState<any>(null);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<any>(null);
  const { connected, lastMessage } = useWebSocket();
  
  // Hook para gerenciar avaliações obrigatórias
  const {
    currentRating,
    isRatingDialogOpen: isMandatoryRatingOpen,
    handleRatingCompleted,
  } = useMandatoryRatings();

  // Mapeamento de equivalências de cidades para normalização
  const cityEquivalences: Record<string, string[]> = {
    // São Paulo
    'são paulo': ['sp', 'são paulo sp', 'sao paulo', 'sampa'],
    'sp': ['são paulo', 'são paulo sp', 'sao paulo', 'sampa'],
    
    // Rio de Janeiro
    'rio de janeiro': ['rj', 'rio de janeiro rj', 'rio'],
    'rj': ['rio de janeiro', 'rio de janeiro rj', 'rio'],
    'rio': ['rio de janeiro', 'rj', 'rio de janeiro rj'],
    
    // Brasília
    'brasília': ['df', 'brasilia', 'brasília df'],
    'df': ['brasília', 'brasilia', 'brasília df'],
    'brasilia': ['brasília', 'df', 'brasília df'],
    
    // Belo Horizonte
    'belo horizonte': ['mg', 'bh', 'belo horizonte mg'],
    'bh': ['belo horizonte', 'mg', 'belo horizonte mg'],
    
    // Salvador
    'salvador': ['ba', 'salvador ba'],
    
    // Fortaleza
    'fortaleza': ['ce', 'fortaleza ce'],
    
    // Curitiba
    'curitiba': ['pr', 'curitiba pr'],
    
    // Recife
    'recife': ['pe', 'recife pe'],
    
    // Porto Alegre
    'porto alegre': ['rs', 'porto alegre rs', 'poa'],
    'poa': ['porto alegre', 'rs', 'porto alegre rs'],
    
    // Manaus
    'manaus': ['am', 'manaus am'],
    
    // Goiânia
    'goiânia': ['go', 'goiania', 'goiânia go'],
    'goiania': ['goiânia', 'go', 'goiânia go'],
    
    // Belém
    'belém': ['pa', 'belem', 'belém pa'],
    'belem': ['belém', 'pa', 'belém pa'],
    
    // Guarulhos
    'guarulhos': ['guarulhos sp'],
    
    // Campinas
    'campinas': ['campinas sp'],
    
    // São Luís
    'são luís': ['ma', 'sao luis', 'são luís ma'],
    'sao luis': ['são luís', 'ma', 'são luís ma'],
    
    // Maceió
    'maceió': ['al', 'maceio', 'maceió al'],
    'maceio': ['maceió', 'al', 'maceió al'],
    
    // Natal
    'natal': ['rn', 'natal rn'],
    
    // Teresina
    'teresina': ['pi', 'teresina pi'],
    
    // Campo Grande
    'campo grande': ['ms', 'campo grande ms'],
    
    // João Pessoa
    'joão pessoa': ['pb', 'joao pessoa', 'joão pessoa pb'],
    'joao pessoa': ['joão pessoa', 'pb', 'joão pessoa pb'],
    
    // Florianópolis
    'florianópolis': ['sc', 'florianopolis', 'floripa', 'florianópolis sc'],
    'florianopolis': ['florianópolis', 'sc', 'floripa', 'florianópolis sc'],
    'floripa': ['florianópolis', 'sc', 'florianopolis', 'florianópolis sc'],
    
    // Cuiabá
    'cuiabá': ['mt', 'cuiaba', 'cuiabá mt'],
    'cuiaba': ['cuiabá', 'mt', 'cuiabá mt'],
    
    // Aracaju
    'aracaju': ['se', 'aracaju se'],
    
    // Vitória
    'vitória': ['es', 'vitoria', 'vitória es'],
    'vitoria': ['vitória', 'es', 'vitória es'],
    
    // Osasco
    'osasco': ['osasco sp'],
    
    // Santo André
    'santo andré': ['santo andre', 'santo andré sp'],
    'santo andre': ['santo andré', 'santo andré sp'],
    
    // São Bernardo do Campo
    'são bernardo do campo': ['sao bernardo do campo', 'são bernardo', 'sao bernardo', 'são bernardo do campo sp'],
    'sao bernardo do campo': ['são bernardo do campo', 'são bernardo', 'sao bernardo', 'são bernardo do campo sp'],
    'são bernardo': ['são bernardo do campo', 'sao bernardo do campo', 'sao bernardo', 'são bernardo do campo sp'],
    'sao bernardo': ['são bernardo do campo', 'sao bernardo do campo', 'são bernardo', 'são bernardo do campo sp'],
    
    // Santos
    'santos': ['santos sp'],
    
    // Sorocaba
    'sorocaba': ['sorocaba sp'],
    
    // Ribeirão Preto
    'ribeirão preto': ['ribeirao preto', 'ribeirão preto sp'],
    'ribeirao preto': ['ribeirão preto', 'ribeirão preto sp'],
    
    // São José dos Campos
    'são josé dos campos': ['sao jose dos campos', 'sjc', 'são josé dos campos sp'],
    'sao jose dos campos': ['são josé dos campos', 'sjc', 'são josé dos campos sp'],
    'sjc': ['são josé dos campos', 'sao jose dos campos', 'são josé dos campos sp'],
    
    // Joinville
    'joinville': ['joinville sc'],
    
    // Londrina
    'londrina': ['londrina pr'],
    
    // Contagem
    'contagem': ['contagem mg'],
    
    // Uberlândia
    'uberlândia': ['uberlandia', 'uberlândia mg'],
    'uberlandia': ['uberlândia', 'uberlândia mg'],
    
    // Juiz de Fora
    'juiz de fora': ['juiz de fora mg'],
    
    // Feira de Santana
    'feira de santana': ['feira de santana ba'],
    
    // Caxias do Sul
    'caxias do sul': ['caxias do sul rs'],
    
    // Aparecida de Goiânia
    'aparecida de goiânia': ['aparecida de goiania', 'aparecida de goiânia go'],
    'aparecida de goiania': ['aparecida de goiânia', 'aparecida de goiânia go'],
    
    // Niterói
    'niterói': ['niteroi', 'niterói rj'],
    'niteroi': ['niterói', 'niterói rj'],
    
    // Carapicuíba
    'carapicuíba': ['carapicuiba', 'carapicuíba sp'],
    'carapicuiba': ['carapicuíba', 'carapicuíba sp'],
    
    // Itapecerica da Serra
    'itapecerica da serra': ['itapecerica', 'itapecerica da serra sp'],
    'itapecerica': ['itapecerica da serra', 'itapecerica da serra sp'],
    
    // São Roque
    'são roque': ['sao roque', 'são roque sp'],
    'sao roque': ['são roque', 'são roque sp']
  };

  // Função para normalizar nome da cidade
  const normalizeCityName = (cityName: string): string => {
    const normalized = cityName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim();
    
    return normalized;
  };

  // Função para verificar se duas cidades são equivalentes
  const areCitiesEquivalent = (city1: string, city2: string): boolean => {
    const norm1 = normalizeCityName(city1);
    const norm2 = normalizeCityName(city2);
    
    // Verificação direta
    if (norm1 === norm2) return true;
    
    // Verificação por equivalências mapeadas
    const equivalents1: string[] = cityEquivalences[norm1] || [];
    const equivalents2: string[] = cityEquivalences[norm2] || [];
    
    // Verifica se city2 está nas equivalências de city1
    if (equivalents1.some((eq: string) => normalizeCityName(eq) === norm2)) return true;
    
    // Verifica se city1 está nas equivalências de city2
    if (equivalents2.some((eq: string) => normalizeCityName(eq) === norm1)) return true;
    
    // Verifica se ambas têm equivalências em comum
    const normalizedEquiv1: string[] = equivalents1.map((eq: string) => normalizeCityName(eq));
    const normalizedEquiv2: string[] = equivalents2.map((eq: string) => normalizeCityName(eq));
    
    return normalizedEquiv1.some((eq: string) => normalizedEquiv2.includes(eq));
  };

  // Lista de estados brasileiros para filtro
  const brazilianStates = [
    'Todos os estados',
    'AC', // Acre
    'AL', // Alagoas
    'AP', // Amapá
    'AM', // Amazonas
    'BA', // Bahia
    'CE', // Ceará
    'DF', // Distrito Federal
    'ES', // Espírito Santo
    'GO', // Goiás
    'MA', // Maranhão
    'MT', // Mato Grosso
    'MS', // Mato Grosso do Sul
    'MG', // Minas Gerais
    'PA', // Pará
    'PB', // Paraíba
    'PR', // Paraná
    'PE', // Pernambuco
    'PI', // Piauí
    'RJ', // Rio de Janeiro
    'RN', // Rio Grande do Norte
    'RS', // Rio Grande do Sul
    'RO', // Rondônia
    'RR', // Roraima
    'SC', // Santa Catarina
    'SP', // São Paulo
    'SE', // Sergipe
    'TO'  // Tocantins
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
  
  // Fetch available services with real distance calculation - force fresh data
  const { data: services, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return response.json();
    },
    select: (data: ServiceData[]) => data.map(formatServiceForDisplay),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: false
  });
  
  // Fetch available services
  const { data: rawServices } = useQuery({
    queryKey: ['/api/services'],
    select: (data: ServiceData[]) => data,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always'
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

  // Buscar dados completos do montador logado
  const { data: assemblerProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/profile/assembler'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Falha ao buscar dados do perfil');
      }
      return response.json();
    }
  });
  
  // Filter services - MONTADORES DEVEM VER TODOS OS SERVIÇOS DISPONÍVEIS
  // Only apply filters if user has actively searched or selected specific filters
  const hasActiveFilters = searchTerm !== '' || selectedState !== 'Todos os estados' || maxDistance < 1000;
  
  const filteredServices = services?.filter(service => {
    // Se não há filtros ativos, mostrar TODOS os serviços para montadores
    if (!hasActiveFilters) {
      return true; // Mostrar todos os serviços disponíveis
    }
    
    // Aplicar filtros apenas quando o usuário especificamente pesquisar/filtrar
    const matchesSearch = searchTerm === '' || 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.type && service.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof service.store === 'string' ? service.store.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      service.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // State filtering based on abbreviations (only when state is specifically selected)
    const matchesState = selectedState === 'Todos os estados' || (() => {
      // Extract state from service location (format: "Address, Neighborhood, Number - City, State - CEP: xxxxx")
      const locationParts = service.location.split(' - ');
      
      if (locationParts.length >= 2) {
        const cityStatePart = locationParts[1]; // "City, State"
        const statePart = cityStatePart.split(',')[1]?.trim(); // Extract state abbreviation
        
        // Check if the extracted state matches the selected state
        const stateMatches = statePart === selectedState;
        
        return stateMatches;
      }
      
      return false;
    })();
    
    // Distance filtering (only when distance is specifically limited)
    const matchesDistance = maxDistance >= 500 || (() => {
      if (!service.distance || service.distance === 'Distância não calculada') {
        return true; // Include services without distance data
      }
      
      // Extract numeric distance from string like "21.7 km"
      const distanceMatch = service.distance.match(/^(\d+\.?\d*)\s*km$/);
      if (distanceMatch) {
        const serviceDistance = parseFloat(distanceMatch[1]);
        return serviceDistance <= maxDistance;
      }
      
      return true; // Include if distance format is unexpected
    })();
    
    return matchesSearch && matchesState && matchesDistance;
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
  
  // Debug completo do activeServices para entender todos os status
  console.log("[AssemblerDashboard] Todos os activeServices com status:", activeServices?.map((s: any) => ({ id: s.id, title: s.title, status: s.status })) || []);
  
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
        const response = await fetch(`/api/services/${serviceId}/apply`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const result = await response.json();
        
        // Always return the result - backend handles duplicate detection
        // and returns appropriate messages for existing applications
        return {
          ...result,
          statusCode: response.status,
          isExistingApplication: response.status === 200 && result.application && result.message
        };
      } catch (error) {
        console.error("Erro na candidatura:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Resposta da candidatura:", data);
      
      // Refresh services list to get updated application status
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/active'] });
      
      // Handle different response types
      if (data.isExistingApplication) {
        // User already applied - show status message
        console.log("Candidatura já existente:", data.message);
        
        // If application is pending, might open chat
        if (data.application?.status === 'pending') {
          const serviceId = data.application.serviceId;
          setTimeout(() => {
            setSelectedChatService(serviceId);
            setDashboardSection('chat');
          }, 500);
        }
      } else if (data.application?.serviceId) {
        // New application created successfully
        const serviceId = data.application.serviceId;
        console.log(`Nova candidatura criada para serviço ID: ${serviceId}`);
        
        // Open chat automatically for new applications
        setTimeout(() => {
          setSelectedChatService(serviceId);
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
      // Error handling is done in the component
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
  const handleRateClick = async (service: any) => {
    try {
      // Buscar informações completas do serviço para ter o userId da loja
      const response = await fetch(`/api/services/${service.id}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar informações do serviço');
      }
      const serviceData = await response.json();
      
      // Criar objeto de serviço com informações completas
      const completeService = {
        ...service,
        store: serviceData.store || service.store
      };
      
      setSelectedServiceForRating(completeService);
      setIsRatingDialogOpen(true);
      
      // Mostrar notificação sobre a avaliação obrigatória
      toast({
        title: '🌟 Avaliação Necessária',
        description: 'É necessário avaliar este serviço antes de continuar usando o aplicativo.',
        duration: 8000,
        variant: 'destructive',
        className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg'
      });
    } catch (error) {
      console.error('Erro ao abrir diálogo de avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o diálogo de avaliação. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Olá, <span className="text-primary">{user?.name || 'Montador'}</span>
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsSkillsWizardOpen(true)}
                className="text-xs px-2 py-1 h-7"
              >
                🚀 Atualizar Habilidades
              </Button>
              <button 
                className="text-primary text-sm font-medium"
                onClick={() => setIsProfileDialogOpen(true)}
              >
                Ver Perfil
              </button>
            </div>
          </div>
          
          {/* Exibir avaliação média do montador */}
          {assemblerProfile && assemblerProfile.rating && (
            <div className="flex items-center mt-1">
              <div className="flex items-center text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= (assemblerProfile?.rating || 0)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm ml-2 text-gray-600">
                {assemblerProfile?.rating ? assemblerProfile.rating.toFixed(1) : '0.0'} Avaliação média
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
                // Show animated service card skeletons
                <div className="p-4">
                  <ServiceCardSkeletonGrid count={3} />
                </div>
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
                    service={formatServiceForDisplay(service)} 
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
                // Show animated service card skeletons
                <div className="p-4">
                  <ServiceCardSkeletonGrid count={2} />
                </div>
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
                // Show animated service card skeletons
                <div className="p-4">
                  <ServiceCardSkeletonGrid count={2} />
                </div>
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
    </>
  );

  const renderExploreSection = () => (
    <>
      <div className="dashboard-card bg-white rounded-xl shadow-md mb-4 mt-2">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Serviços Próximos</h3>
            <Popover open={isStateDropdownOpen} onOpenChange={setIsStateDropdownOpen}>
              <PopoverTrigger asChild>
                <button className="text-sm text-primary flex items-center hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="max-w-[120px] truncate">{selectedState}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-2 border-b">
                    <p className="text-sm font-medium text-gray-700">Filtrar por estado</p>
                  </div>
                  <div className="py-2">
                    {brazilianStates.map((state) => (
                      <button
                        key={state}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          selectedState === state ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setSelectedState(state);
                          setIsStateDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {state}
                          {selectedState === state && (
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
              <Popover open={isDistanceFilterOpen} onOpenChange={setIsDistanceFilterOpen}>
                <PopoverTrigger asChild>
                  <button className={`p-2 rounded-full transition-colors ${maxDistance < 50 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Filtrar por distância</h4>
                      <p className="text-xs text-gray-500 mb-4">
                        Mostrando serviços até {maxDistance} km de distância
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>0 km</span>
                        <span className="font-medium text-primary">{maxDistance} km</span>
                        <span>100 km</span>
                      </div>
                      
                      <Slider
                        value={[maxDistance]}
                        onValueChange={(value) => setMaxDistance(value[0])}
                        max={100}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaxDistance(10)}
                          className={maxDistance === 10 ? 'bg-primary text-white' : ''}
                        >
                          10 km
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaxDistance(25)}
                          className={maxDistance === 25 ? 'bg-primary text-white' : ''}
                        >
                          25 km
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaxDistance(50)}
                          className={maxDistance === 50 ? 'bg-primary text-white' : ''}
                        >
                          50 km
                        </Button>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMaxDistance(50);
                            setIsDistanceFilterOpen(false);
                          }}
                          className="w-full text-gray-500"
                        >
                          Limpar filtro
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
    
    // Mostrar serviços onde o montador tem conversas aceitas ou em andamento
    const activeChats = activeServices ? activeServices.filter((service: any) => {
      return service.applicationStatus === 'accepted' || service.status === 'in-progress' || service.status === 'completed';
    }) : [];
    
    // Mostrar serviços onde o montador se candidatou mas ainda está pendente
    const pendingChats = rawServices ? rawServices.filter((service: any) => {
      return service.applicationStatus === 'pending' && service.hasApplied;
    }) : [];
    
    console.log('[AssemblerDashboard] Serviços com candidaturas aceitas:', activeChats);
    console.log('[AssemblerDashboard] Serviços com candidaturas pendentes:', pendingChats);
    
    return (
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-4">Conversas e Candidaturas</h3>
        
        {isLoading || isLoadingActiveServices ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seção de conversas ativas (candidaturas aceitas) */}
            {activeChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-green-600">Conversas Ativas</h4>
                <div className="space-y-3">
                  {activeChats.map((service: any) => (
                    <div 
                      key={service.id} 
                      className={`bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 cursor-pointer border-l-4 border-green-500 ${service.hasUnreadMessages ? 'animate-pulse' : ''}`}
                      onClick={() => setSelectedChatService(service.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{service.title}</h4>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Aceita
                            </span>
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
                        <MessageSquare className={`h-5 w-5 ${service.hasUnreadMessages ? 'text-primary' : 'text-green-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção de candidaturas pendentes */}
            {pendingChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-orange-600">Candidaturas Pendentes</h4>
                <div className="space-y-3">
                  {pendingChats.map((service: any) => (
                    <div 
                      key={service.id} 
                      className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedChatService(service.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="font-medium">{service.title}</h4>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Aguardando resposta
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Loja: {service.store || 'Não especificada'}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Converse com o lojista sobre os detalhes do serviço
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5 text-orange-500" />
                          <Clock className="h-5 w-5 text-orange-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vazio quando não há conversas nem candidaturas */}
            {activeChats.length === 0 && pendingChats.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h4 className="text-lg font-medium mb-2">Nenhuma conversa disponível</h4>
                <p className="text-gray-500 mb-4">
                  Candidate-se a serviços na seção "Explorar" para começar conversas com lojas.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setDashboardSection('explore')}
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  Explorar Serviços
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };



  // Reagir a novas mensagens recebidas via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      console.log("[AssemblerDashboard] Nova mensagem recebida via WebSocket", lastMessage);
      console.log("[AssemblerDashboard] ID do montador do perfil:", assemblerProfile?.id);
      
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

  const renderRankingSection = () => (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-responsive-lg font-semibold">Ranking de Avaliações</h2>
      </div>
      
      <div className="padding-responsive">
        <RankingSection />
      </div>
    </div>
  );
  
  // Renderiza a seção apropriada com base na aba selecionada
  const renderDashboardContent = () => {
    // Log para diagnosticar se estamos obtendo o ID do montador corretamente
    console.log("Renderizando dashboard com perfil:", user);
    
    // Se estivermos na seção de chat E houver um serviço selecionado, mostrar a interface de chat
    if (dashboardSection === 'chat' && selectedChatService !== null) {
      const assemblerId = assemblerProfile?.id;
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
      case 'ranking':
        return renderRankingSection();
      default:
        return renderHomeSection();
    }
  };

  return (
    <div className="px-4 py-6 min-h-full">
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
      
      {/* Assistente de Atualização de Habilidades */}
      <SkillsUpdateWizard
        open={isSkillsWizardOpen}
        onOpenChange={setIsSkillsWizardOpen}
      />
      
      {/* Diálogo de Avaliação Obrigatória */}
      {currentRating && (
        <MandatoryRatingDialog
          open={isMandatoryRatingOpen}
          serviceId={currentRating.serviceId}
          serviceName={currentRating.serviceName}
          otherUserName={currentRating.otherUserName}
          userType={currentRating.userType}
          onSuccess={handleRatingCompleted}
        />
      )}
    </div>
  );
};

export default AssemblerDashboard;
