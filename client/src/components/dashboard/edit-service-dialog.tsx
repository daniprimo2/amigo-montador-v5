import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PencilIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ServiceProps {
  id: number;
  title: string;
  description: string;
  location: string;
  date: string;
  price: string;
  materialType: string;
  cep: string;
  address: string;
  addressNumber: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
}

interface EditServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceProps;
}

export const EditServiceDialog: React.FC<EditServiceDialogProps> = ({
  isOpen,
  onClose,
  service
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedService, setEditedService] = useState({
    title: service.title,
    description: service.description || '',
    price: service.price,
    materialType: service.materialType,
    startDate: '',
    endDate: '',
  });
  const [dateError, setDateError] = useState<string | null>(null);

  // Extrair e formatar datas do período do serviço
  useEffect(() => {
    if (service.date && service.date.includes('-')) {
      const [startDateStr, endDateStr] = service.date.split('-').map(d => d.trim());
      const startDate = formatDateForInput(startDateStr);
      const endDate = formatDateForInput(endDateStr);
      
      setEditedService(prev => ({
        ...prev,
        startDate,
        endDate
      }));
    }
  }, [service]);

  // Função para formatar data de DD/MM/YYYY para YYYY-MM-DD (formato de input date)
  const formatDateForInput = (dateStr: string): string => {
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch {
      return '';
    }
  };

  // Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedService(prev => ({ ...prev, [name]: value }));
    
    // Verificar erros de data quando algum dos campos de data mudar
    if (name === 'startDate' || name === 'endDate') {
      validateDates(name === 'startDate' ? value : editedService.startDate, 
                   name === 'endDate' ? value : editedService.endDate);
    }
  };

  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        setDateError('A data de início não pode ser posterior à data de fim');
        return false;
      }
    }
    
    setDateError(null);
    return true;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números e formatar como moeda
    const value = e.target.value.replace(/\D/g, '');
    
    if (value) {
      // Formatar o valor para exibição como moeda
      const numericValue = parseInt(value, 10);
      const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(numericValue / 100);
      
      setEditedService(prev => ({ ...prev, price: formattedValue }));
    } else {
      setEditedService(prev => ({ ...prev, price: '' }));
    }
  };

  // Função para extrair o valor numérico do preço formatado
  const extractNumericValue = (formattedPrice: string): number => {
    // Remover todos os caracteres não numéricos
    const numericString = formattedPrice.replace(/\D/g, '');
    // Converter para número
    return numericString ? parseInt(numericString, 10) / 100 : 0;
  };

  const handleSubmit = async () => {
    try {
      // Validar datas
      if (!validateDates(editedService.startDate, editedService.endDate)) {
        return;
      }
      
      // Verificar campos obrigatórios
      if (!editedService.title || !editedService.price || !editedService.materialType || 
          !editedService.startDate || !editedService.endDate) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      
      // Formatar as datas para exibição
      const formattedStartDate = formatDateForDisplay(editedService.startDate);
      const formattedEndDate = formatDateForDisplay(editedService.endDate);
      
      // Preparar dados para envio
      const serviceData = {
        title: editedService.title,
        description: editedService.description,
        date: `${formattedStartDate} - ${formattedEndDate}`,
        price: extractNumericValue(editedService.price),
        materialType: editedService.materialType
      };
      
      // Enviar para a API
      await apiRequest({
        method: 'PATCH',
        url: `/api/services/${service.id}`,
        data: serviceData
      });
      
      // Atualizar os dados em cache
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      toast({
        title: "Serviço atualizado",
        description: "As informações do serviço foram atualizadas com sucesso!"
      });
      
      // Fechar o diálogo
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar serviço:", error);
      toast({
        title: "Erro ao atualizar serviço",
        description: error.response?.data?.message || "Ocorreu um erro ao atualizar o serviço.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Serviço</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium">Título *</Label>
            <Input 
              id="title" 
              name="title" 
              placeholder="Ex: Montagem de armário de cozinha" 
              value={editedService.title}
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
              value={editedService.description}
              onChange={handleInputChange}
              className="w-full resize-y min-h-[5rem]"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Data de Início *</Label>
              <Input 
                id="startDate" 
                name="startDate" 
                type="date"
                value={editedService.startDate}
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
                value={editedService.endDate}
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
                value={editedService.price}
                onChange={handlePriceChange}
                className="w-full"
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500">Digite apenas números (sem pontos ou vírgulas)</p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="materialType" className="text-sm font-medium">Material *</Label>
              <Input 
                id="materialType" 
                name="materialType" 
                placeholder="Ex: MDF, Madeira Maciça" 
                value={editedService.materialType}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !!dateError}
            className="bg-primary hover:bg-opacity-90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <PencilIcon className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog;