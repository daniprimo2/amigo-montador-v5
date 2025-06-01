import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Plus, MessageSquare, Loader2, FileDown, Wifi, Star, User, CheckCheck } from 'lucide-react';
import StoreServiceCard from './store-service-card';
import ProfileDialog from './profile-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';
import FileUpload from '@/components/ui/file-upload';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingDialog } from '@/components/rating/rating-dialog';
import { RatingList } from '@/components/rating/rating-list';
import { PendingEvaluationsModal } from './pending-evaluations-modal';

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'in-progress' | 'completed'>('open');
  const [dashboardSection, setDashboardSection] = useState<'home' | 'services' | 'chat'>('home');
  const [showPendingEvaluations, setShowPendingEvaluations] = useState(false);
  const { connected, lastMessage } = useWebSocket();
  
  // Ouvir evento para abrir o diálogo de perfil
  useEffect(() => {
    const handleOpenProfileDialog = () => {
      setIsProfileOpen(true);
    };
    
    window.addEventListener('open-profile-dialog', handleOpenProfileDialog);
    
    return () => {
      window.removeEventListener('open-profile-dialog', handleOpenProfileDialog);
    };
  }, []);
  
  // Reagir a mensagens do WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    
    console.log("[StoreDashboard] Nova mensagem recebida via WebSocket:", lastMessage);
    
    if (lastMessage.type === 'new_application') {
      console.log("[StoreDashboard] Nova candidatura recebida! Atualizando interface...", lastMessage);
      
      // Invalidar queries manualmente para garantir atualização
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
      
      // Se houver um serviceId, marcar esse serviço como tendo uma nova candidatura
      if (lastMessage.serviceId) {
        // Notificar o usuário com um toast
        toast({
          title: "Nova candidatura recebida!",
          description: "Um montador se candidatou ao seu serviço. Verifique na seção de Chat.",
          duration: 8000,
          variant: "default",
          className: "bg-blue-100 border-blue-500 border-2 font-medium"
        });
        
        // Mudar para a seção de chat
        setDashboardSection('chat');
      }
    } else if (lastMessage.type === 'new_message') {
      console.log("[StoreDashboard] Nova mensagem recebida via WebSocket", lastMessage);
      
      // Atualizar as listas relevantes 
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
      
      // Atualizar mensagens específicas do serviço se o ID estiver disponível
      if (lastMessage.serviceId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/services/${lastMessage.serviceId}/messages`] 
        });
      }
    }
  }, [lastMessage, queryClient, toast]);
  
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    cep: '',
    address: '',
    addressNumber: '',
    location: '',
    startDate: '',
    endDate: '',
    price: '',
    materialType: ''
  });
  const [projectFile, setProjectFile] = useState<FileList | null>(null);
  const [dateError, setDateError] = useState('');
  const [isValidatingCep, setIsValidatingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Buscar serviços da API
  const servicesQuery = useQuery({
    queryKey: ['/api/services'],
    refetchOnWindowFocus: false
  });

  // Buscar avaliações pendentes
  const pendingEvaluationsQuery = useQuery({
    queryKey: ['/api/services/pending-evaluations'],
    refetchOnWindowFocus: false
  });

  // Verificar se há avaliações pendentes quando a dashboard carrega
  useEffect(() => {
    if (pendingEvaluationsQuery.data?.hasPendingEvaluations) {
      setShowPendingEvaluations(true);
    }
  }, [pendingEvaluationsQuery.data]);
  
  // Buscar serviços com candidaturas aceitas
  const servicesWithApplicationsQuery = useQuery({
    queryKey: ['/api/store/services/with-applications'],
    refetchOnWindowFocus: false
  });
  
  // Buscar serviços com candidaturas pendentes
  const servicesWithPendingApplicationsQuery = useQuery({
    queryKey: ['/api/store/services/with-pending-applications'],
    refetchOnWindowFocus: false
  });
  
  // Escuta os eventos de mudança de aba do layout
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail;
      setDashboardSection(tab);
    };
    
    // Listener para evento de abrir avaliação
    const handleOpenRatingDialog = (event: CustomEvent) => {
      const { serviceId, serviceData } = event.detail;
      
      if (serviceData && serviceData.assemblerData) {
        // Configurar dados para avaliação do montador pelo lojista
        setSelectedServiceForRating({
          id: serviceData.id,
          title: serviceData.title,
          assembler: {
            id: serviceData.assemblerData.id,
            userId: serviceData.assemblerData.userId,
            name: serviceData.assemblerData.name
          }
        });
        
        // Abrir diálogo de avaliação automaticamente
        setIsRatingDialogOpen(true);
        
        // Mudar para a aba de serviços concluídos
        setActiveTab('completed');
        setDashboardSection('services');
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
  
  // Reagir a novas mensagens ou candidaturas recebidas via WebSocket
  useEffect(() => {
    if (lastMessage) {
      // Notificação já foi exibida pelo hook do WebSocket
      
      if (lastMessage.type === 'new_application') {
        // Atualizar a lista de serviços para mostrar a nova candidatura
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-pending-applications'] });
        
        // Se houver um serviceId, marcar esse serviço como tendo uma nova candidatura
        if (lastMessage.serviceId) {
          // Marcar serviço como tendo nova candidatura (isso será atualizado quando os dados forem buscados)
          console.log(`Nova candidatura recebida para serviço ${lastMessage.serviceId}`);
          
          // Notificar o usuário com um toast
          toast({
            title: "Nova candidatura recebida!",
            description: "Um montador se candidatou ao seu serviço. Verifique na seção de Chat.",
            duration: 8000,
            variant: "default",
            className: "bg-blue-100 border-blue-500 border-2 font-medium"
          });
          
          // Mudar para a seção de chat imediatamente para mostrar a nova candidatura
          setDashboardSection('chat');
        }
      } else if (lastMessage.type === 'new_message') {
        console.log("[StoreDashboard] Nova mensagem recebida via WebSocket", lastMessage);
        
        // Atualizar as listas relevantes para refletir nova mensagem
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] });
        
        // Invalidar a lista de mensagens específica se houver serviceId
        if (lastMessage.serviceId) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/services/${lastMessage.serviceId}/messages`] 
          });
          
          // Definir o serviço selecionado para o chat
          setSelectedChatService(lastMessage.serviceId);
          
          // Mudar para a seção de chat e exibir notificação
          setDashboardSection('chat');
          
          toast({
            title: "Nova mensagem recebida",
            description: "Chat aberto automaticamente",
            duration: 5000
          });
        } else if (dashboardSection !== 'chat') {
          toast({
            title: "Nova mensagem recebida",
            description: "Vá para a seção 'Chat' para visualizar",
            duration: 5000
          });
        }
      } else if (lastMessage.type === 'service_completed') {
        console.log("[StoreDashboard] Serviço finalizado, abrindo tela de avaliação", lastMessage);
        
        // Atualizar todas as listas de serviços
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        
        // Se houver dados do serviço, abrir diálogo de avaliação
        if (lastMessage.serviceId && lastMessage.serviceData) {
          const service = lastMessage.serviceData;
          const assemblerData = service.assemblerData;
          
          if (assemblerData) {
            // Configurar dados para avaliação do montador pelo lojista
            setSelectedServiceForRating({
              id: service.id,
              title: service.title,
              assembler: {
                id: assemblerData.id,
                userId: assemblerData.userId,
                name: assemblerData.name
              }
            });
            
            // Abrir diálogo de avaliação automaticamente
            setIsRatingDialogOpen(true);
            
            // Mudar para a aba de serviços concluídos para mostrar o contexto
            setActiveTab('completed');
            setDashboardSection('services');
            
            // Notificação mais enfática sobre a necessidade de avaliação
            toast({
              title: '🌟 Serviço finalizado!',
              description: 'É necessário avaliar o montador antes de continuar usando o aplicativo.',
              duration: 10000,
              variant: 'destructive',
              className: 'bg-yellow-100 border-yellow-500 border-2 font-medium shadow-lg'
            });
          }
        }
      }
    }
  }, [lastMessage, dashboardSection, queryClient, toast]);
  
  // Função para formatar um valor em centavos como moeda brasileira
  const formatAsBrazilianCurrency = (centavos: number): string => {
    // Converter centavos para reais
    const reais = centavos / 100;
    
    // Formatar como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(reais);
  };
  
  // Função para extrair apenas números de uma string
  const extractOnlyNumbers = (value: string): string => {
    return value.replace(/\D/g, '');
  };
  
  // Função para extrair o valor numérico (em formato decimal) de uma string formatada como moeda
  const extractNumericValue = (formattedValue: string): number => {
    // Remove todos os caracteres não numéricos, exceto pontos e vírgulas
    const numericString = formattedValue.replace(/[^\d,.]/g, '');
    
    // Remove pontos de milhar e substitui vírgula por ponto para formato decimal
    const decimalValue = numericString.replace(/\./g, '').replace(',', '.');
    
    // Retorna o valor como número (ou 0 se inválido)
    return parseFloat(decimalValue) || 0;
  };
  
  // Função para lidar com mudanças no campo de preço
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Obter apenas os números do valor digitado (sem pontos, vírgulas, etc)
    const onlyNumbers = extractOnlyNumbers(e.target.value);
    
    // Se o valor for vazio, limpar o campo
    if (!onlyNumbers) {
      setNewService(prev => ({ ...prev, price: '' }));
      return;
    }
    
    // Tratar valor como centavos
    const centavos = parseInt(onlyNumbers, 10);
    
    // Formatar o valor para exibição
    const formattedValue = formatAsBrazilianCurrency(centavos);
    
    // Atualizar o estado com o valor formatado
    setNewService(prev => ({ ...prev, price: formattedValue }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Para outros campos diferentes de price, mantém o comportamento original
    if (name !== 'price') {
      setNewService(prev => ({ ...prev, [name]: value }));
      
      // Se o campo for CEP, remove caracteres não numéricos e valida quando tiver 8 dígitos
      if (name === 'cep') {
        const cepNumbers = value.replace(/\D/g, '');
        if (cepNumbers.length === 8) {
          validateCep(cepNumbers);
        } else if (cepNumbers.length < 8) {
          // Limpa o erro e o endereço se o CEP for apagado
          setCepError('');
        }
      }
      
      // Validar datas quando uma das datas mudar
      if (name === 'startDate' || name === 'endDate') {
        validateDates(name === 'startDate' ? value : newService.startDate, 
                    name === 'endDate' ? value : newService.endDate);
      }
    }
  };
  
  const validateDates = (startDate: string, endDate: string) => {
    // Limpar erro anterior
    setDateError('');
    
    // Verifica se ambas as datas estão preenchidas para poder validar
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Verifica se a data de início é posterior à data de fim
      if (start > end) {
        setDateError('A data de início não pode ser posterior à data de fim');
      }
    }
  };
  
  const validateCep = async (cep: string) => {
    if (cep.length !== 8) {
      setCepError('O CEP deve ter 8 números');
      return;
    }
    
    setIsValidatingCep(true);
    setCepError('');
    
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      setIsValidatingCep(false);
      
      if (response.data.erro) {
        setCepError('CEP não encontrado');
        return;
      }
      
      // Monta o endereço completo a partir dos dados da API
      const { logradouro, bairro, localidade, uf } = response.data;
      const formattedAddress = `${logradouro}, ${bairro}`;
      const formattedLocation = `${localidade}, ${uf}`;
      
      setNewService(prev => ({
        ...prev,
        address: formattedAddress,
        location: formattedLocation
      }));
      
      toast({
        title: "CEP Validado",
        description: "Endereço preenchido automaticamente.",
        variant: "default"
      });
    } catch (error) {
      setIsValidatingCep(false);
      setCepError('Erro ao validar o CEP. Tente novamente.');
      console.error('Erro ao validar CEP:', error);
    }
  };
  
  // Interface para os dados de serviço
  interface ServiceFormData {
    [key: string]: any;
    title: string;
    description: string;
    location: string;
    address: string;
    addressNumber: string;
    date: string;
    price: string;
    materialType: string;
    status: string;
  }

  // Mutation para criar um serviço - simplificado para JSON
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      // Log detalhado dos dados a serem enviados
      console.log("Enviando dados para a API:", serviceData);
      
      // Enviar os dados diretamente como JSON
      const response = await fetch('/api/services', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Passamos o objeto completo de erro para poder acessar campos adicionais como missingFields
        const error = new Error(errorData.message || 'Erro ao criar serviço');
        (error as any).response = errorData;
        throw error;
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso!"
      });
      
      // Resetar o formulário e fechar o modal
      setNewService({
        title: '',
        description: '',
        cep: '',
        address: '',
        addressNumber: '',
        location: '',
        startDate: '',
        endDate: '',
        price: '',
        materialType: ''
      });
      setProjectFile(null);
      setIsNewServiceOpen(false);
      
      // Recarregar a lista de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    },
    onError: (error: any) => {
      // Tentar extrair informações mais detalhadas do erro
      let errorDescription = error.message || "Ocorreu um erro ao criar o serviço. Tente novamente.";
      let errorTitle = "Erro ao criar serviço";
      
      // Verificar se temos os campos obrigatórios que estão faltando
      if (error.response && error.response.missingFields) {
        errorTitle = "Campos obrigatórios não preenchidos";
        errorDescription = `Por favor, preencha os seguintes campos: ${error.response.missingFields.join(", ")}.`;
        
        // Log detalhado dos campos faltantes e valores atuais
        console.log("Campos obrigatórios faltantes:", error.response.missingFields);
        console.log("Valores atuais do formulário:", newService);
      }
      
      // Log do erro completo para depuração
      console.error("Erro completo ao criar serviço:", error);
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    }
  });

  const handleCreateService = async () => {
    // Criar uma lista de campos obrigatórios não preenchidos
    const missingFields = [];
    
    if (!newService.title) missingFields.push("Título do Serviço");
    if (!newService.description || !newService.description.trim()) missingFields.push("Descrição");
    if (!newService.cep) missingFields.push("CEP");
    if (!newService.addressNumber) missingFields.push("Número do Endereço");
    if (!newService.location) missingFields.push("Cidade/UF");
    if (!newService.startDate) missingFields.push("Data de Início");
    if (!newService.endDate) missingFields.push("Data de Fim");
    if (!newService.price) missingFields.push("Valor");
    if (!newService.materialType) missingFields.push("Material");
    if (!projectFile || projectFile.length === 0) missingFields.push("Arquivo PDF");
    
    // Se houver campos obrigatórios faltando, exibe mensagem detalhada
    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha os seguintes campos: ${missingFields.join(", ")}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Se o campo preço estiver vazio
    if (!newService.price) {
      toast({
        title: "Valor obrigatório",
        description: "Por favor, informe o valor do serviço.",
        variant: "destructive"
      });
      return;
    }
    
    // Extrair o valor numérico do preço
    const priceNumeric = extractNumericValue(newService.price);
    
    // Verifica se o preço é um número válido e maior que zero
    if (isNaN(priceNumeric) || priceNumeric <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, informe um valor válido maior que zero.",
        variant: "destructive"
      });
      return;
    }
    
    // Formata o número com duas casas decimais e usa ponto como separador decimal
    // para envio ao backend
    const priceValue = priceNumeric.toFixed(2);
    
    // Verifica se há erro no CEP
    if (cepError) {
      toast({
        title: "CEP inválido",
        description: "Por favor, verifique o CEP informado.",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica se há erro nas datas
    if (dateError) {
      toast({
        title: "Erro nas datas",
        description: dateError,
        variant: "destructive"
      });
      return;
    }
    
    // Verifica se o arquivo PDF foi carregado
    if (!projectFile || projectFile.length === 0) {
      toast({
        title: "Arquivo de projeto obrigatório",
        description: "Por favor, faça o upload do arquivo PDF do projeto.",
        variant: "destructive"
      });
      return;
    }
    
    // Verifica o tamanho do arquivo (máximo 10MB = 10 * 1024 * 1024 bytes)
    for (let i = 0; i < projectFile.length; i++) {
      if (projectFile[i].size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo "${projectFile[i].name}" excede o limite de 10MB.`,
          variant: "destructive"
        });
        return;
      }
      
      if (!projectFile[i].name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: "Formato de arquivo inválido",
          description: `O arquivo "${projectFile[i].name}" não é um PDF.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Ativar estado de upload
    setIsUploading(true);
    
    try {
      // Formatar os dados do serviço para a API
      const serviceData = {
        title: newService.title.trim(),
        description: newService.description.trim(),
        location: newService.location.trim(),
        address: newService.address.trim(),
        addressNumber: newService.addressNumber.trim(),
        cep: newService.cep.trim(),
        date: `${newService.startDate} - ${newService.endDate}`,
        price: priceValue,
        materialType: newService.materialType.trim(),
        status: 'open' // Garantir que o serviço seja criado com status 'open'
      };
      
      // Criar FormData para upload dos arquivos
      const formData = new FormData();
      
      // Adicionar os dados do serviço como um campo JSON
      formData.append('serviceData', JSON.stringify(serviceData));
      
      // Adicionar cada arquivo PDF ao FormData
      if (projectFile) {
        for (let i = 0; i < projectFile.length; i++) {
          formData.append('projectFiles', projectFile[i]);
        }
      }
      
      // Enviar para a API
      const response = await fetch('/api/services/with-files', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar serviço');
      }
      
      const result = await response.json();
      
      // Resetar formulário após sucesso
      setNewService({
        title: '',
        description: '',
        cep: '',
        address: '',
        addressNumber: '',
        location: '',
        startDate: '',
        endDate: '',
        price: '',
        materialType: ''
      });
      setProjectFile(null);
      
      // Fechar modal e mostrar mensagem de sucesso
      setIsNewServiceOpen(false);
      
      toast({
        title: "Serviço criado com sucesso",
        description: "Seus arquivos foram enviados e o serviço está disponível para montadores.",
        variant: "default"
      });
      
      // Recarregar a lista de serviços
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    } catch (error: any) {
      console.error("Erro ao criar serviço:", error);
      
      toast({
        title: "Erro ao criar serviço",
        description: error.message || "Ocorreu um erro ao criar o serviço. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      // Desativar estado de upload
      setIsUploading(false);
    }
  };
  
  // Processar dados de serviços da API
  const processApiServices = (apiServices: any[] = []) => {
    const processedServices = apiServices.map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      location: service.location,
      date: service.date,
      startDate: service.startDate,
      endDate: service.endDate,
      price: service.price,
      materialType: service.materialType,
      cep: service.cep,
      address: service.address,
      addressNumber: service.addressNumber,
      projectFiles: service.projectFiles || [],
      assembler: service.assembler,
      // Contagem de candidaturas será implementada posteriormente
      candidates: 0,
      status: service.status as 'open' | 'in-progress' | 'completed' | 'cancelled' | 'hired'
    }));
    
    return processedServices;
  };
  
  // Usar dados da API ou mostrar dados vazios se estiver carregando
  const allServices = servicesQuery.data && Array.isArray(servicesQuery.data) ? processApiServices(servicesQuery.data) : [];
  
  // Filtrar serviços com base na guia ativa
  const services = allServices.filter(service => {
    if (activeTab === 'open') return service.status === 'open';
    if (activeTab === 'in-progress') return service.status === 'in-progress' || service.status === 'hired';
    if (activeTab === 'completed') return service.status === 'completed';
    return true;
  }).sort((a, b) => {
    // Para serviços "Em Andamento", ordenar por data de início (mais próxima primeiro)
    if (activeTab === 'in-progress') {
      if (a.startDate && b.startDate) {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      // Se um não tem data de início, colocar por último
      if (a.startDate && !b.startDate) return -1;
      if (!a.startDate && b.startDate) return 1;
    }
    // Para outras abas, manter ordenação original (por data de criação)
    return 0;
  });

  // Função para lidar com o clique no botão de avaliação
  const handleRateClick = (service: any) => {
    setSelectedServiceForRating(service);
    setIsRatingDialogOpen(true);
  };

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <div className="padding-responsive">
      <div className="dashboard-card p-3 sm:p-4 lg:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-responsive-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Lojista'}</span>
          </h2>
          <button 
            className="text-primary text-responsive-sm font-medium hover:underline self-start sm:self-auto touch-target"
            onClick={() => setIsProfileOpen(true)}
          >
            Ver Perfil
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <div 
            className={`rounded-lg p-3 sm:p-4 text-center transition-all duration-300 cursor-pointer ${
              allServices.filter(service => service.status === 'open').length > 0 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:from-blue-100 hover:to-indigo-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => {
              if (allServices.filter(service => service.status === 'open').length > 0) {
                setDashboardSection('services');
                setActiveTab('open');
              }
            }}
          >
            <div className={`font-bold text-xl sm:text-2xl lg:text-3xl ${
              allServices.filter(service => service.status === 'open').length > 0 ? 'text-blue-700' : 'text-gray-500'
            }`}>
              🔵 {allServices.filter(service => service.status === 'open').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Em Aberto</div>
          </div>
          <div 
            className={`rounded-lg p-3 sm:p-4 text-center transition-all duration-300 cursor-pointer ${
              allServices.filter(service => service.status === 'in-progress' || service.status === 'hired').length > 0 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm hover:shadow-md hover:from-amber-100 hover:to-orange-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => {
              if (allServices.filter(service => service.status === 'in-progress' || service.status === 'hired').length > 0) {
                setDashboardSection('services');
                setActiveTab('in-progress');
              }
            }}
          >
            <div className={`font-bold text-xl sm:text-2xl lg:text-3xl ${
              allServices.filter(service => service.status === 'in-progress' || service.status === 'hired').length > 0 ? 'text-amber-700' : 'text-gray-500'
            }`}>
              🟠 {allServices.filter(service => service.status === 'in-progress' || service.status === 'hired').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Em Andamento</div>
          </div>
          <div 
            className={`rounded-lg p-3 sm:p-4 text-center transition-all duration-300 cursor-pointer ${
              allServices.filter(service => service.status === 'completed').length > 0 
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 shadow-sm hover:shadow-md hover:from-emerald-100 hover:to-green-100' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
            }`}
            onClick={() => {
              if (allServices.filter(service => service.status === 'completed').length > 0) {
                setDashboardSection('services');
                setActiveTab('completed');
              }
            }}
          >
            <div className={`font-bold text-xl sm:text-2xl lg:text-3xl ${
              allServices.filter(service => service.status === 'completed').length > 0 ? 'text-emerald-700' : 'text-gray-500'
            }`}>
              ✅ {allServices.filter(service => service.status === 'completed').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Finalizados</div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-responsive-lg font-semibold">Serviços Recentes</h3>
        <Button 
          variant="default" 
          className="mobile-button bg-primary hover:bg-primary/90 text-white rounded-full flex items-center gap-1.5 font-medium w-full sm:w-auto"
          onClick={() => setIsNewServiceOpen(true)}
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>
      
      <div className="dashboard-card overflow-hidden mb-4">
        <div className="divide-y">
          {allServices.slice(0, 3).map(service => (
            <StoreServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderServicesSection = () => (
    <div className="padding-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-responsive-lg font-semibold">Todos os Serviços</h3>
        <Button 
          variant="default" 
          className="mobile-button bg-primary hover:bg-primary/90 text-white rounded-full flex items-center gap-1.5 font-medium w-full sm:w-auto"
          onClick={() => setIsNewServiceOpen(true)}
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>
      
      <div className="dashboard-card overflow-hidden mb-4">
        <div className="flex border-b">
          <div 
            onClick={() => setActiveTab('open')}
            className={cn(
              "flex-1 py-3 px-2 text-center font-medium cursor-pointer transition-colors touch-target",
              activeTab === 'open' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            <span className="text-xs sm:text-sm lg:text-base">Em Aberto</span>
          </div>
          <div 
            onClick={() => setActiveTab('in-progress')}
            className={cn(
              "flex-1 py-3 px-2 text-center font-medium cursor-pointer transition-colors touch-target",
              activeTab === 'in-progress' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            <span className="text-xs sm:text-sm lg:text-base">Em Andamento</span>
          </div>
          <div 
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 py-3 px-2 text-center font-medium cursor-pointer transition-colors touch-target",
              activeTab === 'completed' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            <span className="text-xs sm:text-sm lg:text-base">Finalizados</span>
          </div>
        </div>
        
        <div className="divide-y">
          {servicesQuery.isLoading ? (
            // Estado de carregamento
            <div className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-gray-500">Carregando serviços...</p>
            </div>
          ) : servicesQuery.error ? (
            // Estado de erro
            <div className="p-6 text-center">
              <p className="text-red-500 mb-2">Erro ao carregar serviços</p>
              <Button 
                variant="outline" 
                onClick={() => servicesQuery.refetch()}
                className="mx-auto"
              >
                Tentar novamente
              </Button>
            </div>
          ) : services.length === 0 ? (
            // Sem serviços
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-2">Nenhum serviço encontrado para este status</p>
              <Button 
                variant="outline" 
                onClick={() => setIsNewServiceOpen(true)}
                className="mx-auto"
              >
                Criar novo serviço
              </Button>
            </div>
          ) : (
            // Lista de serviços
            services.map(service => (
              <StoreServiceCard 
                key={service.id} 
                service={{
                  id: service.id,
                  title: service.title,
                  description: service.description,
                  location: service.location,
                  date: service.date,
                  startDate: service.startDate,
                  endDate: service.endDate,
                  price: service.price,
                  candidates: service.candidates || 0,
                  materialType: service.materialType,
                  cep: service.cep,
                  address: service.address,
                  addressNumber: service.addressNumber,
                  status: service.status,
                  projectFiles: service.projectFiles,
                  assembler: service.assembler
                }} 
                onClick={async (serviceId) => {
                  // Se o serviço estiver em andamento ou finalizado, redirecionar para o chat
                  if ((service.status === 'in-progress' || service.status === 'completed') && service.assembler) {
                    console.log(`Redirecionando para chat do serviço ${serviceId} com montador ${service.assembler.id}`);
                    
                    // Garantir que os dados estejam carregados antes de mudar para a seção de chat
                    if (!activeServices) {
                      await queryClient.prefetchQuery({
                        queryKey: ['/api/store/services/with-applications'],
                        queryFn: async () => {
                          const response = await fetch('/api/store/services/with-applications');
                          if (!response.ok) {
                            throw new Error('Falha ao buscar serviços com candidaturas aceitas');
                          }
                          return response.json();
                        }
                      });
                    }
                    
                    // Atualizar os estados para abrir o chat corretamente
                    setSelectedChatService(serviceId);
                    setSelectedAssemblerId(service.assembler.id);
                    
                    // Mudar para a seção de chat após garantir que os estados foram atualizados
                    setTimeout(() => {
                      setDashboardSection('chat');
                    }, 100);
                  }
                }}
                onRateClick={(serviceToRate) => {
                  // Configurar o serviço para avaliação
                  if (serviceToRate.assembler) {
                    setSelectedServiceForRating({
                      id: serviceToRate.id,
                      title: serviceToRate.title,
                      assembler: serviceToRate.assembler
                    });
                    // Abrir o diálogo de avaliação
                    setIsRatingDialogOpen(true);
                  }
                }}
                onChatClick={(serviceId) => {
                  // Abrir o chat para o serviço selecionado
                  setSelectedChatService(serviceId);
                  setDashboardSection('chat');
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Estado para o serviço de chat selecionado
  // Estado para controlar qual serviço e montador estão selecionados para chat
  const [selectedChatService, setSelectedChatService] = useState<number | null>(null);
  const [selectedAssemblerId, setSelectedAssemblerId] = useState<number | undefined>(undefined);
  
  // Buscar serviços com candidaturas aceitas (em andamento)
  const { data: activeServices, isLoading: isLoadingActiveServices } = useQuery({
    queryKey: ['/api/store/services/with-applications'],
    queryFn: async () => {
      const response = await fetch('/api/store/services/with-applications');
      if (!response.ok) {
        throw new Error('Falha ao buscar serviços com candidaturas aceitas');
      }
      return response.json();
    },
    enabled: dashboardSection === 'chat' // Buscar apenas quando a aba de chat estiver ativa
  });
  
  // IMPORTANTE: Buscar TODOS os serviços que possuem mensagens (nenhuma conversa pode desaparecer)
  const { data: servicesWithMessages, isLoading: isLoadingServicesWithMessages } = useQuery({
    queryKey: ['/api/store/services/with-messages'],
    queryFn: async () => {
      const response = await fetch('/api/store/services/with-messages');
      if (!response.ok) {
        throw new Error('Falha ao buscar serviços com mensagens');
      }
      return response.json();
    },
    enabled: dashboardSection === 'chat' // Buscar apenas quando a aba de chat estiver ativa
  });

  // Buscar serviços com candidaturas pendentes
  const { data: pendingServices, isLoading: isLoadingPendingServices } = useQuery({
    queryKey: ['/api/store/services/with-pending-applications'],
    queryFn: async () => {
      const response = await fetch('/api/store/services/with-pending-applications');
      if (!response.ok) {
        throw new Error('Falha ao buscar serviços com candidaturas pendentes');
      }
      return response.json();
    },
    enabled: dashboardSection === 'chat' // Buscar apenas quando a aba de chat estiver ativa
  });
  
  // IMPORTANTE: Combinar TODOS os serviços com mensagens para garantir que nenhuma conversa desapareça
  const servicesWithChat = React.useMemo(() => {
    const result: Array<any> = [];
    const addedServiceIds = new Set(); // Para evitar duplicatas
    
    // 1. PRIORIDADE MÁXIMA: Adicionar TODOS os serviços que possuem mensagens
    if (servicesWithMessages && servicesWithMessages.length > 0) {
      console.log('[StoreDashboard] Serviços com mensagens encontrados:', servicesWithMessages);
      
      servicesWithMessages.forEach((service: any) => {
        addedServiceIds.add(service.id);
        
        const chatType = service.status === 'completed' ? 'completed' : 
                        service.status === 'in-progress' ? 'active' : 'active';
        
        console.log(`[StoreDashboard] Processando serviço ${service.title} (ID: ${service.id}), status: ${service.status}, chatType: ${chatType}`);
        
        result.push({
          id: service.id,
          title: service.title,
          status: service.status,
          assemblerName: service.assembler ? service.assembler.name : 'Montador não identificado',
          assemblerId: service.assembler ? service.assembler.id : null,
          hasNewMessages: false, // Será atualizado pelo WebSocket
          hasNewApplications: false,
          chatType: chatType,
          messageCount: service.messageCount || 0,
          lastMessageAt: service.lastMessageAt,
          hasConversation: true // GARANTIR que sempre tenha conversa disponível
        });
      });
    }
    
    // 2. Adicionar serviços com candidaturas aceitas que ainda não foram incluídos
    if (activeServices && activeServices.length > 0) {
      activeServices.forEach((service: any) => {
        if (!addedServiceIds.has(service.id) && service.assembler && service.assembler.id) {
          addedServiceIds.add(service.id);
          
          const chatType = service.status === 'completed' ? 'completed' : 'active';
          
          result.push({
            id: service.id,
            title: service.title,
            status: service.status,
            assemblerName: service.assembler.name,
            assemblerId: service.assembler.id,
            hasNewMessages: service.hasNewMessages || false,
            hasNewApplications: false,
            chatType: chatType
          });
        }
      });
    }
    
    // Adicionar serviços com candidaturas pendentes
    if (pendingServices && pendingServices.length > 0) {
      pendingServices.forEach((service: any) => {
        if (service.pendingApplications && service.pendingApplications.length > 0) {
          // Para cada candidatura pendente, criar um item separado
          service.pendingApplications.forEach((app: any) => {
            if (app.assembler) {
              result.push({
                id: service.id,
                title: service.title,
                status: 'pending_application',
                assemblerName: app.assembler.name,
                assemblerId: app.assembler.id,
                applicationId: app.id,
                hasNewMessages: false,
                hasNewApplications: true,
                chatType: 'pending' // Indica que é um chat com candidatura pendente
              });
            }
          });
        }
      });
    }
    
    // Ordenar por última mensagem (mais recente primeiro)
    return result.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      return 0;
    });
  }, [servicesWithMessages, activeServices, pendingServices]);

  const renderChatSection = () => {
    // Se um serviço estiver selecionado para chat, mostrar a interface de chat
    if (selectedChatService !== null) {
      return (
        <ChatInterface 
          serviceId={selectedChatService}
          assemblerId={selectedAssemblerId} 
          onBack={() => {
            setSelectedChatService(null);
            setSelectedAssemblerId(undefined);
          }} 
        />
      );
    }
    
    // Dividir os serviços em três categorias
    const pendingApplications = servicesWithChat.filter(service => service.chatType === 'pending');
    const activeChats = servicesWithChat.filter(service => service.chatType === 'active');
    const completedChats = servicesWithChat.filter(service => service.chatType === 'completed');
    
    // Estado de carregamento combinado - incluindo serviços com mensagens
    const isLoading = isLoadingActiveServices || isLoadingPendingServices || isLoadingServicesWithMessages;
    
    return (
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-4">Conversas e Candidaturas</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : servicesWithChat.length > 0 ? (
          <div className="space-y-6">
            {/* Seção de candidaturas pendentes */}
            {pendingApplications.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3 text-blue-600 flex items-center">
                  <span className="mr-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Nova</span>
                  Candidaturas Pendentes
                </h4>
                <div className="space-y-3">
                  {pendingApplications.map((service) => (
                    <div 
                      key={`${service.id}-${service.assemblerId}`} 
                      className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 cursor-pointer transition-colors border-2 border-blue-400"
                      onClick={() => {
                        setSelectedChatService(service.id);
                        setSelectedAssemblerId(service.assemblerId);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-start gap-3">
                          {/* Foto do montador */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mt-1">
                            <img
                              src={service.assemblerPhoto || '/default-avatar.svg'}
                              alt={service.assemblerName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-avatar.svg';
                              }}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="font-medium">{service.title}</h4>
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full animate-pulse">
                                Nova candidatura
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Montador: {service.assemblerName}</span>
                              </p>
                              <p className="text-sm text-gray-500">
                                Aguardando sua aprovação
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Seção de conversas ativas */}
            {activeChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3">Conversas Ativas</h4>
                <div className="space-y-3">
                  {activeChats.map((service) => (
                    <div 
                      key={`${service.id}-${service.assemblerId}`} 
                      className="bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedChatService(service.id);
                        setSelectedAssemblerId(service.assemblerId);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-start gap-3">
                          {/* Foto do montador */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mt-1">
                            <img
                              src={service.assembler?.photoUrl || service.assemblerPhoto || '/default-avatar.svg'}
                              alt={service.assembler?.name || service.assemblerName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-avatar.svg';
                              }}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="font-medium">{service.title}</h4>
                              {service.hasNewMessages && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Nova mensagem
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
                                <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Montador: {service.assembler?.name || service.assemblerName}</span>
                                </p>
                                {service.assembler && (
                                  <div className="text-xs text-gray-400 ml-5">
                                    {service.assembler.phone && (
                                      <span>Tel: {service.assembler.phone}</span>
                                    )}
                                    {service.assembler.city && service.assembler.state && (
                                      <span className="ml-3">{service.assembler.city}, {service.assembler.state}</span>
                                    )}
                                    {service.assembler.rating && (
                                      <span className="ml-3">★ {service.assembler.rating}/5</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {service.status === 'open' ? 'Aguardando início' : 
                                 service.status === 'in-progress' ? 'Em andamento' : 
                                 service.status === 'completed' ? 'Concluído' : 'Status desconhecido'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {service.hasNewMessages && (
                            <span className="bg-red-500 h-3 w-3 rounded-full animate-pulse mr-2"></span>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Seção de conversas finalizadas */}
            {completedChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-gray-600">Conversas Finalizadas</h4>
                <div className="space-y-3">
                  {completedChats.map((service) => (
                    <div 
                      key={`${service.id}-${service.assemblerId}`} 
                      className="bg-gray-50 rounded-xl shadow-sm p-4 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                      onClick={() => {
                        setSelectedChatService(service.id);
                        setSelectedAssemblerId(service.assemblerId);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-start gap-3">
                          {/* Foto do montador */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mt-1">
                            <img
                              src={service.assembler?.photoUrl || service.assemblerPhoto || '/default-avatar.svg'}
                              alt={service.assembler?.name || service.assemblerName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/default-avatar.svg';
                              }}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="font-medium">{service.title}</h4>
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Finalizado
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Montador: {service.assembler?.name || service.assemblerName}</span>
                                </p>
                                {service.assembler && (
                                  <div className="text-xs text-gray-400 ml-5">
                                    {service.assembler.phone && (
                                      <span>Tel: {service.assembler.phone}</span>
                                    )}
                                    {service.assembler.city && service.assembler.state && (
                                      <span className="ml-3">{service.assembler.city}, {service.assembler.state}</span>
                                    )}
                                    {service.assembler.rating && (
                                      <span className="ml-3">★ {service.assembler.rating}/5</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Serviço concluído
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <CheckCheck className="h-5 w-5 text-green-500 mr-1" />
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma conversa ou candidatura disponível</h4>
            <p className="text-gray-500 mb-4">Quando você receber candidaturas de montadores para seus serviços, elas aparecerão aqui.</p>
            <p className="text-sm text-gray-400">Crie um serviço e aguarde candidaturas de montadores.</p>
          </div>
        )}
      </div>
    );
  };

  // Renderiza a seção apropriada com base na aba selecionada
  const renderDashboardContent = () => {
    switch(dashboardSection) {
      case 'home':
        return renderHomeSection();
      case 'services':
        return renderServicesSection();
      case 'chat':
        return renderChatSection();
      default:
        return renderHomeSection();
    }
  };

  return (
    <div className="p-4">
      {renderDashboardContent()}
      
      {/* Modal de Novo Serviço */}
      <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:w-[90%] md:max-w-[40rem]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl sm:text-2xl">Novo Serviço de Montagem</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Preencha as informações abaixo para criar um novo serviço de montagem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2 sm:py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">Título do Serviço *</Label>
              <Input 
                id="title" 
                name="title" 
                placeholder="Ex: Montagem de Cozinha Completa" 
                value={newService.title}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
              <Textarea 
                id="description"
                name="description"
                placeholder="Descreva detalhes do serviço, móveis a serem montados, etc." 
                rows={3}
                value={newService.description}
                onChange={handleInputChange}
                className="w-full resize-y min-h-[5rem]"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cep" className="text-sm font-medium">CEP *</Label>
              <div className="relative w-full">
                <Input 
                  id="cep" 
                  name="cep" 
                  placeholder="Digite o CEP (somente números)" 
                  value={newService.cep}
                  onChange={handleInputChange}
                  maxLength={9}
                  className={`w-full ${cepError ? "border-red-500" : ""}`}
                />
                {isValidatingCep && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {cepError && <p className="text-xs text-red-500">{cepError}</p>}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address" className="text-sm font-medium">Endereço</Label>
              <Input 
                id="address" 
                name="address" 
                placeholder="Rua, bairro" 
                value={newService.address}
                onChange={handleInputChange}
                readOnly={!newService.cep}
                className={`w-full ${!newService.cep ? "bg-gray-100" : ""}`}
              />
              <p className="text-xs text-gray-500">Preenchido automaticamente ao digitar o CEP</p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="addressNumber" className="text-sm font-medium">Número do Endereço *</Label>
              <Input 
                id="addressNumber" 
                name="addressNumber" 
                placeholder="Ex: 123" 
                value={newService.addressNumber}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location" className="text-sm font-medium">Cidade/UF *</Label>
              <Input 
                id="location" 
                name="location" 
                placeholder="Ex: São Paulo, SP" 
                value={newService.location}
                onChange={handleInputChange}
                readOnly={!newService.cep}
                className={`w-full ${!newService.cep ? "bg-gray-100" : ""}`}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate" className="text-sm font-medium">Data de Início *</Label>
                <Input 
                  id="startDate" 
                  name="startDate" 
                  type="date"
                  value={newService.startDate}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endDate" className="text-sm font-medium">Data de Fim *</Label>
                <Input 
                  id="endDate" 
                  name="endDate" 
                  type="date"
                  value={newService.endDate}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              {dateError && <p className="text-xs text-red-500 col-span-1 sm:col-span-2">{dateError}</p>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price" className="text-sm font-medium">Valor *</Label>
                <Input
                  id="price"
                  name="price"
                  placeholder="Ex: R$ 0,00"
                  value={newService.price}
                  onChange={handlePriceChange}
                  className="w-full"
                  inputMode="numeric"
                />
                <p className="text-xs text-gray-500">Digite apenas números (sem pontos ou vírgulas)</p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="materialType" className="text-sm font-medium">Material *</Label>
              <Input 
                id="materialType" 
                name="materialType" 
                placeholder="Ex: MDF, Madeira Maciça" 
                value={newService.materialType}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="projectFile" className="text-sm font-medium">Arquivo do Projeto (PDF) *</Label>
              <FileUpload
                accept=".pdf"
                multiple={true}
                label="Arquivo PDF do Projeto"
                helpText="Apenas arquivos no formato PDF (máx. 10MB)"
                onChange={setProjectFile}
                required={true}
                showAddMoreButton={true}
                isUploading={isUploading}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsNewServiceOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateService}
              className="w-full sm:w-auto order-1 sm:order-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando Arquivos...
                </>
              ) : (
                "Criar Serviço"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Perfil do Usuário */}
      <ProfileDialog 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
        onLogout={onLogout}
      />
      
      {/* Modal de Avaliação */}
      {selectedServiceForRating && (
        <RatingDialog
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          serviceId={selectedServiceForRating.id}
          toUserId={selectedServiceForRating.assembler?.userId || 0}
          toUserName={selectedServiceForRating.assembler?.name || 'Montador'}
          serviceName={selectedServiceForRating.title}
          onSuccess={() => {
            // Atualizar listas de serviços após avaliação
            queryClient.invalidateQueries({ queryKey: ['/api/services'] });
            // Notificar usuário sobre avaliação
            toast({
              title: 'Avaliação enviada',
              description: 'Obrigado por avaliar o serviço realizado.',
            });
          }}
        />
      )}
    </div>
  );
};

export default StoreDashboard;
