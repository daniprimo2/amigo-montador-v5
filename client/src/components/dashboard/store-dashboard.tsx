import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, Calendar, CalendarDays, Plus } from 'lucide-react';
import StoreServiceCard from './store-service-card';
import ServiceCalendar from './service-calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface StoreDashboardProps {
  onLogout: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    price: '',
    type: '',
    materialType: ''
  });
  const { toast } = useToast();
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewService(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateService = () => {
    // Aqui você implementaria a lógica para enviar os dados para o backend
    // Por enquanto, vamos apenas fechar o modal e mostrar um toast
    
    if (!newService.title || !newService.location || !newService.date || !newService.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
      location: '',
      date: '',
      price: '',
      type: '',
      materialType: ''
    });
    setIsNewServiceOpen(false);
  };
  
  // Dados de exemplo para os cards de serviço
  const services = [
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
  ];

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Olá, <span className="text-primary">{user?.name || 'Lojista'}</span>
          </h2>
          <Button 
            variant="link" 
            className="text-primary text-sm font-medium p-0"
          >
            Ver Perfil
          </Button>
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
        <h3 className="text-lg font-semibold">Serviços</h3>
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
          <Button 
            variant="ghost" 
            className="flex-1 py-3 text-center font-medium text-primary border-b-2 border-primary rounded-none"
          >
            Em Aberto
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 py-3 text-center font-medium text-gray-500 rounded-none"
          >
            Em Andamento
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 py-3 text-center font-medium text-gray-500 rounded-none"
          >
            Finalizados
          </Button>
        </div>
        
        <div className="divide-y">
          {services.map(service => (
            <StoreServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4">Agenda</h3>
      
      <ServiceCalendar 
        markedDates={['15', '18', '20']} 
        month="Junho" 
        year="2023" 
      />
      
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Localização *</Label>
                <Input 
                  id="location" 
                  name="location" 
                  placeholder="Ex: São Paulo, SP" 
                  value={newService.location}
                  onChange={handleInputChange}
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
    </div>
  );
};

export default StoreDashboard;
