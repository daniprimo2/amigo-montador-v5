import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  LogOut, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  ChevronRight,
  User,
  CheckCheck,
  Clock,
  Eye
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChatInterface } from '@/components/chat/chat-interface';
import { RatingDialog } from '@/components/rating/rating-dialog';

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'home' | 'services' | 'chat'>('home');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingData, setRatingData] = useState<any>(null);

  // Buscar dados da loja
  const { data: store } = useQuery({
    queryKey: ['/api/store/profile'],
    enabled: !!user?.id,
  });

  // Buscar serviços pendentes com candidaturas
  const { data: pendingServices = [], isLoading: isLoadingPendingServices } = useQuery({
    queryKey: ['/api/services/pending'],
    enabled: !!user?.id,
  });

  // Buscar serviços ativos
  const { data: activeServices = [], isLoading: isLoadingActiveServices } = useQuery({
    queryKey: ['/api/services/active'],
    enabled: !!user?.id,
  });

  // Buscar serviços com mensagens
  const { data: servicesWithMessages = [], isLoading: isLoadingServicesWithMessages } = useQuery({
    queryKey: ['/api/services/with-messages'],
    enabled: !!user?.id,
  });

  // Mutation para criar novo serviço
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });
      if (!response.ok) throw new Error('Erro ao criar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsNewServiceOpen(false);
      toast({
        title: 'Serviço criado com sucesso!',
        description: 'Seu serviço foi publicado e montadores podem se candidatar.',
      });
    },
  });

  // Schema de validação para novo serviço
  const serviceSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    location: z.string().min(1, 'Localização é obrigatória'),
    address: z.string().min(1, 'Endereço é obrigatório'),
    addressNumber: z.string().min(1, 'Número é obrigatório'),
    cep: z.string().min(8, 'CEP deve ter 8 dígitos'),
    date: z.string().min(1, 'Data é obrigatória'),
    price: z.string().min(1, 'Preço é obrigatório'),
    materialType: z.string().min(1, 'Tipo de material é obrigatório'),
  });

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      address: '',
      addressNumber: '',
      cep: '',
      date: '',
      price: '',
      materialType: '',
    },
  });

  const onSubmit = (data: any) => {
    createServiceMutation.mutate({
      ...data,
      storeId: (store as any)?.id,
      status: 'open',
      startDate: new Date(data.date),
    });
  };

  // Handlers de eventos customizados
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setSelectedTab(event.detail.tab);
    };

    const handleOpenRatingDialog = (event: CustomEvent) => {
      setRatingData(event.detail);
      setRatingDialogOpen(true);
    };

    document.addEventListener('tabChange' as any, handleTabChange);
    document.addEventListener('openRatingDialog' as any, handleOpenRatingDialog);

    return () => {
      document.removeEventListener('tabChange' as any, handleTabChange);
      document.removeEventListener('openRatingDialog' as any, handleOpenRatingDialog);
    };
  }, []);

  // Combinar serviços com informações de chat
  const servicesWithChat = React.useMemo(() => {
    const allServices: any[] = [];
    const pendingArray = Array.isArray(pendingServices) ? pendingServices : [];
    const activeArray = Array.isArray(activeServices) ? activeServices : [];
    const messagesArray = Array.isArray(servicesWithMessages) ? servicesWithMessages : [];

    // Serviços pendentes com candidaturas
    pendingArray.forEach((service: any) => {
      if (service.applications && service.applications.length > 0) {
        service.applications.forEach((application: any) => {
          allServices.push({
            ...service,
            chatType: 'pending',
            application,
            assembler: application.assembler,
            assemblerName: application.assembler?.name || 'Montador',
            assemblerPhoto: application.assembler?.profilePhotoUrl,
          });
        });
      }
    });

    // Serviços ativos com montador aceito
    activeArray.forEach((service: any) => {
      if (service.assembler) {
        allServices.push({
          ...service,
          chatType: 'active',
          assemblerName: service.assembler.name,
          assemblerPhoto: service.assembler.profilePhotoUrl,
        });
      }
    });

    // Serviços com mensagens (finalizados)
    messagesArray.forEach((service: any) => {
      if (service.status === 'completed' && service.assembler) {
        allServices.push({
          ...service,
          chatType: 'completed',
          assemblerName: service.assembler.name,
          assemblerPhoto: service.assembler.profilePhotoUrl,
        });
      }
    });

    return allServices;
  }, [pendingServices, activeServices, servicesWithMessages]);

  // Renderizar seção home com estatísticas
  const renderHomeSection = () => {
    const pendingArray = Array.isArray(pendingServices) ? pendingServices : [];
    const activeArray = Array.isArray(activeServices) ? activeServices : [];
    const messagesArray = Array.isArray(servicesWithMessages) ? servicesWithMessages : [];
    
    const stats = {
      totalServices: pendingArray.length + activeArray.length,
      activeServices: activeArray.length,
      pendingApplications: pendingArray.reduce((acc: number, service: any) => 
        acc + (service.applications?.length || 0), 0),
      completedServices: messagesArray.filter((s: any) => s.status === 'completed').length,
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Olá, {(store as any)?.name || (user as any)?.name}!</h1>
            <p className="text-gray-600">Gerencie seus serviços de montagem</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsNewServiceOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Ativos</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeServices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidaturas Pendentes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Concluídos</CardTitle>
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedServices}</div>
            </CardContent>
          </Card>
        </div>

        {/* Navegação rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" 
                onClick={() => setDashboardSection('chat')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Conversas e Candidaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Visualize candidaturas e converse com montadores</p>
              <div className="flex items-center mt-2 text-blue-600">
                <span className="mr-1">Ver conversas</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setDashboardSection('services')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Meus Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Gerencie todos os seus serviços publicados</p>
              <div className="flex items-center mt-2 text-blue-600">
                <span className="mr-1">Ver serviços</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Renderizar seção de serviços
  const renderServicesSection = () => {
    const pendingArray = Array.isArray(pendingServices) ? pendingServices : [];
    const activeArray = Array.isArray(activeServices) ? activeServices : [];
    const messagesArray = Array.isArray(servicesWithMessages) ? servicesWithMessages : [];
    const allServices = [...pendingArray, ...activeArray, ...messagesArray];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Meus Serviços</h2>
          <Button onClick={() => setDashboardSection('home')} variant="outline">
            Voltar
          </Button>
        </div>

        {allServices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum serviço encontrado</h3>
              <p className="text-gray-500 mb-4">Você ainda não publicou nenhum serviço.</p>
              <Button onClick={() => setIsNewServiceOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Serviço
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {allServices.map((service: any) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {service.location}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.status === 'open' ? 'bg-green-100 text-green-800' :
                      service.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      service.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {service.status === 'open' ? 'Aberto' :
                       service.status === 'in-progress' ? 'Em Andamento' :
                       service.status === 'completed' ? 'Concluído' : 'Cancelado'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{service.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(service.startDate).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                      R$ {service.price}
                    </div>
                  </div>
                  {service.applications && service.applications.length > 0 && (
                    <div className="mt-3 text-sm text-blue-600">
                      {service.applications.length} candidatura(s) recebida(s)
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar seção de chat com conversas e candidaturas
  const renderChatSection = () => {
    if (selectedService) {
      return (
        <ChatInterface
          serviceId={selectedService.id}
          onBack={() => setSelectedService(null)}
        />
      );
    }

    // Separar por tipo de conversa
    const pendingChats = servicesWithChat.filter(service => service.chatType === 'pending');
    const activeChats = servicesWithChat.filter(service => service.chatType === 'active');
    const completedChats = servicesWithChat.filter(service => service.chatType === 'completed');
    
    // Estado de carregamento combinado
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
            {/* Candidaturas pendentes */}
            {pendingChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-orange-600">Candidaturas Pendentes</h4>
                <div className="space-y-3">
                  {pendingChats.map((service: any) => (
                    <div
                      key={`${service.id}-${service.application?.id}`}
                      className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={service.assemblerPhoto} />
                            <AvatarFallback>
                              {service.assemblerName?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{service.title}</h5>
                            <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Candidato: {service.assemblerName}</span>
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
                              <p className="text-sm text-orange-600">
                                Nova candidatura
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-orange-500 mr-1" />
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversas ativas */}
            {activeChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-blue-600">Conversas Ativas</h4>
                <div className="space-y-3">
                  {activeChats.map((service: any) => (
                    <div
                      key={service.id}
                      className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={service.assemblerPhoto} />
                            <AvatarFallback>
                              {service.assemblerName?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{service.title}</h5>
                            <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Montador: {service.assemblerName}</span>
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
                              <p className="text-sm text-blue-600">
                                Serviço em andamento
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-5 w-5 text-blue-500 mr-1" />
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversas finalizadas */}
            {completedChats.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-green-600">Conversas Finalizadas</h4>
                <div className="space-y-3">
                  {completedChats.map((service: any) => (
                    <div
                      key={service.id}
                      className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={service.assemblerPhoto} />
                            <AvatarFallback>
                              {service.assemblerName?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{service.title}</h5>
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
              Preencha os detalhes do seu serviço para encontrar montadores qualificados.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Serviço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Montagem de guarda-roupa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva os detalhes do serviço..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Serviço</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100.00" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Material</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="madeira">Madeira</SelectItem>
                        <SelectItem value="metal">Metal</SelectItem>
                        <SelectItem value="plastico">Plástico</SelectItem>
                        <SelectItem value="vidro">Vidro</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewServiceOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServiceMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createServiceMutation.isPending ? 'Criando...' : 'Criar Serviço'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de avaliação */}
      {ratingDialogOpen && ratingData && (
        <RatingDialog
          open={ratingDialogOpen}
          onClose={() => setRatingDialogOpen(false)}
          serviceId={ratingData.serviceId}
          toUserId={ratingData.toUserId}
          fromUserType="store"
          onSuccess={() => {
            setRatingDialogOpen(false);
            toast({
              title: 'Avaliação enviada!',
              description: 'Obrigado por avaliar o serviço realizado.',
            });
          }}
        />
      )}
    </div>
  );
};

export default StoreDashboard;