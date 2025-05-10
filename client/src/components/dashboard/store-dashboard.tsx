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

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
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
    date: '',
    price: '',
    type: '',
    materialType: ''
  });
  const [isValidatingCep, setIsValidatingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const { toast } = useToast();
  
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
  
  const handleCreateService = () => {
    // Aqui você implementaria a lógica para enviar os dados para o backend
    // Por enquanto, vamos apenas fechar o modal e mostrar um toast
    
    if (!newService.title || !newService.location || !newService.date || !newService.price || !newService.cep) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
    
    toast({
      title: "Serviço criado",
      description: "O serviço foi criado com sucesso!",
    });
    
    // Resetar o formulário e fechar o modal
    setNewService({
      title: '',
      description: '',
      cep: '',
      address: '',
      location: '',
      date: '',
      price: '',
      type: '',
      materialType: ''
    });
    setIsNewServiceOpen(false);
  };
  
  // Dados de exemplo para os cards de serviço
  const allServices = [
    {
      id: 1,
      title: 'Cozinha Planejada Milano',
      location: 'São Paulo, SP',
      date: '15/06/2023',
      price: 'R$ 1.500,00',
      candidates: 3,
      status: 'open' as const,
    },
    {
      id: 2,
      title: 'Guarda-roupa Casal Completo',
      location: 'São Paulo, SP',
      date: '18/06/2023',
      price: 'R$ 850,00',
      candidates: 1,
      status: 'open' as const,
    },
    {
      id: 3,
      title: 'Painel para TV com Rack',
      location: 'São Paulo, SP',
      date: '20/06/2023',
      price: 'R$ 600,00',
      candidates: 0,
      status: 'open' as const,
    },
    {
      id: 4,
      title: 'Mesa de Jantar com 6 Cadeiras',
      location: 'São Paulo, SP',
      date: '25/06/2023',
      price: 'R$ 780,00',
      candidates: 2,
      status: 'in-progress' as const,
    },
    {
      id: 5,
      title: 'Estante para Escritório',
      location: 'São Paulo, SP',
      date: '27/06/2023',
      price: 'R$ 450,00',
      candidates: 1,
      status: 'in-progress' as const,
    },
    {
      id: 6,
      title: 'Home Theater Completo',
      location: 'São Paulo, SP',
      date: '02/06/2023',
      price: 'R$ 920,00',
      candidates: 3,
      status: 'completed' as const,
    },
    {
      id: 7,
      title: 'Escrivaninha com Estante',
      location: 'São Paulo, SP',
      date: '05/06/2023',
      price: 'R$ 380,00',
      candidates: 2,
      status: 'completed' as const,
    },
  ];
  
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
          {services.map(service => (
            <StoreServiceCard key={service.id} service={service} />
          ))}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Serviço de Montagem</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para criar um novo serviço de montagem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título do Serviço *</Label>
              <Input 
                id="title" 
                name="title" 
                placeholder="Ex: Montagem de Cozinha Completa" 
                value={newService.title}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description"
                name="description"
                placeholder="Descreva detalhes do serviço, móveis a serem montados, etc." 
                rows={3}
                value={newService.description}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP *</Label>
              <div className="relative">
                <Input 
                  id="cep" 
                  name="cep" 
                  placeholder="Digite o CEP (somente números)" 
                  value={newService.cep}
                  onChange={handleInputChange}
                  maxLength={9}
                  className={cepError ? "border-red-500" : ""}
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
              <Label htmlFor="address">Endereço</Label>
              <Input 
                id="address" 
                name="address" 
                placeholder="Rua, número, bairro" 
                value={newService.address}
                onChange={handleInputChange}
                readOnly={!newService.cep}
                className={!newService.cep ? "bg-gray-100" : ""}
              />
              <p className="text-xs text-gray-500">Preenchido automaticamente ao digitar o CEP</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Cidade/UF *</Label>
                <Input 
                  id="location" 
                  name="location" 
                  placeholder="Ex: São Paulo, SP" 
                  value={newService.location}
                  onChange={handleInputChange}
                  readOnly={!newService.cep}
                  className={!newService.cep ? "bg-gray-100" : ""}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="date">Data *</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date"
                  value={newService.date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Valor *</Label>
                <Input 
                  id="price" 
                  name="price" 
                  placeholder="Ex: R$ 500,00" 
                  value={newService.price}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Móvel</Label>
                <Input 
                  id="type" 
                  name="type" 
                  placeholder="Ex: Cozinha, Guarda-roupa" 
                  value={newService.type}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="materialType">Material</Label>
              <Input 
                id="materialType" 
                name="materialType" 
                placeholder="Ex: MDF, Madeira Maciça" 
                value={newService.materialType}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewServiceOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateService}>Criar Serviço</Button>
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
