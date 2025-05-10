import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Calendar, CalendarDays, Plus, MessageSquare, Loader2, FileDown } from 'lucide-react';
import StoreServiceCard from './store-service-card';
import ServiceCalendar from './service-calendar';
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

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'in-progress' | 'completed'>('open');
  const [dashboardSection, setDashboardSection] = useState<'home' | 'services' | 'chat' | 'calendar'>('home');
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    cep: '',
    address: '',
    location: '',
    startDate: '',
    endDate: '',
    price: '',
    type: '',
    materialType: ''
  });
  const [projectFile, setProjectFile] = useState<FileList | null>(null);
  const [dateError, setDateError] = useState('');
  const [isValidatingCep, setIsValidatingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const { toast } = useToast();
  
  // Buscar serviços da API
  const servicesQuery = useQuery({
    queryKey: ['/api/services'],
    refetchOnWindowFocus: false
  });
  
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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
  
  // Mutation para criar um serviço
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const formData = new FormData();
      
      // Adicionar campos de texto ao FormData
      Object.keys(serviceData).forEach(key => {
        formData.append(key, serviceData[key]);
      });
      
      // Adicionar arquivo do projeto se existir
      if (projectFile && projectFile.length > 0) {
        formData.append('projectFile', projectFile[0]);
      }
      
      // Enviar para a API
      const response = await fetch('/api/services', {
        method: 'POST',
        credentials: 'include',
        body: formData
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
        location: '',
        startDate: '',
        endDate: '',
        price: '',
        type: '',
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

  const handleCreateService = () => {
    // Criar uma lista de campos obrigatórios não preenchidos
    const missingFields = [];
    
    if (!newService.title) missingFields.push("Título do Serviço");
    if (!newService.cep) missingFields.push("CEP");
    if (!newService.location) missingFields.push("Cidade/UF");
    if (!newService.startDate) missingFields.push("Data de Início");
    if (!newService.endDate) missingFields.push("Data de Fim");
    if (!newService.price) missingFields.push("Valor");
    
    // Se houver campos obrigatórios faltando, exibe mensagem detalhada
    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha os seguintes campos: ${missingFields.join(", ")}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Validar formato de preço (aceita vírgula ou ponto como separador decimal)
    const priceValue = newService.price.replace(/\s/g, '').replace("R$", "");
    const priceRegex = /^[0-9]+([,.][0-9]{1,2})?$/;
    if (!priceRegex.test(priceValue)) {
      toast({
        title: "Formato de valor inválido",
        description: "Por favor, informe um valor no formato correto (ex: 500,00 ou 500.00).",
        variant: "destructive"
      });
      return;
    }
    
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
    if (projectFile[0].size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    // Formatar os dados para a API
    const serviceData = {
      title: newService.title.trim(),
      description: newService.description.trim(),
      location: newService.location.trim(),
      address: newService.address.trim(),
      date: `${newService.startDate} - ${newService.endDate}`,
      price: priceValue,
      type: (newService.type ? newService.type.trim() : "Não especificado"),
      materialType: (newService.materialType ? newService.materialType.trim() : "Não especificado"),
      status: 'open' // Garantir que o serviço seja criado com status 'open'
    };
    
    // Enviar para a API
    createServiceMutation.mutate(serviceData);
  };
  
  // Processar dados de serviços da API
  const processApiServices = (apiServices: any[] = []) => {
    return apiServices.map(service => ({
      id: service.id,
      title: service.title,
      location: service.location,
      date: service.date,
      price: service.price,
      // Contagem de candidaturas será implementada posteriormente
      candidates: 0,
      status: service.status as 'open' | 'in-progress' | 'completed' | 'cancelled'
    }));
  };
  
  // Usar dados da API ou mostrar dados vazios se estiver carregando
  const allServices = servicesQuery.data && Array.isArray(servicesQuery.data) ? processApiServices(servicesQuery.data) : [];
  
  // Filtrar serviços com base na guia ativa
  const services = allServices.filter(service => {
    if (activeTab === 'open') return service.status === 'open';
    if (activeTab === 'in-progress') return service.status === 'in-progress';
    if (activeTab === 'completed') return service.status === 'completed';
    return true;
  });

  // Renderiza diferentes seções com base na aba selecionada
  const renderHomeSection = () => (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Lojista'}</span>
          </h2>
          <a 
            href="#" 
            className="text-primary text-sm font-medium hover:underline"
            onClick={(e) => {
              e.preventDefault();
              setIsProfileOpen(true);
            }}
          >
            Ver Perfil
          </a>
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
        <h3 className="text-lg font-semibold">Serviços Recentes</h3>
        <Button 
          variant="default" 
          className="bg-primary hover:bg-primary/90 text-white text-sm py-1.5 px-4 rounded-full flex items-center gap-1.5 font-medium"
          onClick={() => setIsNewServiceOpen(true)}
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
        <div className="divide-y">
          {allServices.slice(0, 3).map(service => (
            <StoreServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </>
  );

  const renderServicesSection = () => (
    <>
      <div className="flex justify-between items-center mb-4 mt-2">
        <h3 className="text-lg font-semibold">Todos os Serviços</h3>
        <Button 
          variant="default" 
          className="bg-primary hover:bg-primary/90 text-white text-sm py-1.5 px-4 rounded-full flex items-center gap-1.5 font-medium"
          onClick={() => setIsNewServiceOpen(true)}
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
        <div className="flex border-b">
          <div 
            onClick={() => setActiveTab('open')}
            className={cn(
              "flex-1 py-3 text-center font-medium cursor-pointer transition-colors",
              activeTab === 'open' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            Em Aberto
          </div>
          <div 
            onClick={() => setActiveTab('in-progress')}
            className={cn(
              "flex-1 py-3 text-center font-medium cursor-pointer transition-colors",
              activeTab === 'in-progress' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            Em Andamento
          </div>
          <div 
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 py-3 text-center font-medium cursor-pointer transition-colors",
              activeTab === 'completed' 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-primary"
            )}
          >
            Finalizados
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
              <StoreServiceCard key={service.id} service={service} />
            ))
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
        <p className="text-gray-500 mb-4">Quando você tiver mensagens de montadores, elas aparecerão aqui.</p>
      </div>
    </div>
  );

  const renderCalendarSection = () => (
    <div className="mt-2">
      <h3 className="text-lg font-semibold mb-4">Minha Agenda</h3>
      <ServiceCalendar 
        markedDates={['15', '18', '20']} 
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
      case 'services':
        return renderServicesSection();
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
              <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
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
                placeholder="Rua, número, bairro" 
                value={newService.address}
                onChange={handleInputChange}
                readOnly={!newService.cep}
                className={`w-full ${!newService.cep ? "bg-gray-100" : ""}`}
              />
              <p className="text-xs text-gray-500">Preenchido automaticamente ao digitar o CEP</p>
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
                  placeholder="Ex: R$ 500,00" 
                  value={newService.price}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-medium">Tipo de Móvel</Label>
                <Input 
                  id="type" 
                  name="type" 
                  placeholder="Ex: Cozinha, Guarda-roupa" 
                  value={newService.type}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="materialType" className="text-sm font-medium">Material</Label>
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
                multiple={false}
                label="Arquivo PDF do Projeto"
                helpText="Apenas arquivos no formato PDF (máx. 10MB)"
                onChange={setProjectFile}
                required={true}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsNewServiceOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateService}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Criar Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Perfil do Usuário */}
      <ProfileDialog 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
      />
    </div>
  );
};

export default StoreDashboard;
