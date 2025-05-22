import React, { useState } from 'react';
import { CalendarIcon, DollarSign, ChevronRight, CheckSquare, Star, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceProps {
  id: number;
  title: string;
  location: string;
  date: string;
  price: string;
  candidates: number;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  assembler?: {
    id: number;
    name: string;
    userId: number;
  };
}

interface StoreServiceCardProps {
  service: ServiceProps;
  onClick?: (id: number) => void;
  onComplete?: (id: number) => void;
  onRateClick?: (service: ServiceProps) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em aberto' },
    'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em andamento' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizado' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
  };

  const { bg, text, label } = statusMap[status] || statusMap.open;

  return (
    <span className={`px-2 py-1 ${bg} ${text} text-xs rounded-full`}>
      {label}
    </span>
  );
};

export const StoreServiceCard: React.FC<StoreServiceCardProps> = ({ 
  service, 
  onClick,
  onComplete,
  onRateClick
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const handleClick = () => {
    if (onClick) onClick(service.id);
  };
  
  const handleCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onComplete) {
      try {
        setIsCompleting(true);
        
        await apiRequest({
          method: 'POST',
          url: `/api/services/${service.id}/complete`,
          data: {}
        });
        
        toast({
          title: 'Serviço finalizado com sucesso!',
          description: 'É necessário avaliar o serviço para continuar. Uma tela de avaliação será aberta automaticamente.',
          duration: 8000,
          variant: 'default',
          className: 'bg-yellow-100 border-yellow-500 border-2 font-medium'
        });
        
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        
        setIsCompleting(false);
      } catch (error: any) {
        toast({
          title: 'Erro ao finalizar serviço',
          description: error.response?.data?.message || 'Ocorreu um erro ao finalizar o serviço.',
          variant: 'destructive'
        });
        setIsCompleting(false);
      }
    } else {
      onComplete(service.id);
    }
  };
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRateClick) {
      onRateClick(service);
    }
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      
      await apiRequest({
        method: 'DELETE',
        url: `/api/services/${service.id}`,
      });
      
      toast({
        title: 'Serviço excluído com sucesso!',
        description: 'O serviço foi removido permanentemente.',
      });
      
      // Força a invalidação das queries para garantir atualização da interface
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/store/services/with-pending-applications'] })
      ]);
      
      // Adiciona um pequeno delay para garantir que o React tenha tempo de processar a atualização
      setTimeout(() => {
        // Força uma nova busca (refetch) para garantir que os dados estejam atualizados
        queryClient.refetchQueries({ queryKey: ['/api/services'] });
      }, 100);
      
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir serviço',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir o serviço.',
        variant: 'destructive'
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors" onClick={handleClick}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium">{service.title}</h4>
            <p className="text-sm text-gray-500">{service.location}</p>
            {service.assembler && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Montador:</span> {service.assembler.name}
              </p>
            )}
          </div>
          <StatusBadge status={service.status} />
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-600">
              {service.date}
            </span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-600">{service.price}</span>
          </div>
          
          <div className="ml-auto flex space-x-2">
            {service.status === 'in-progress' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCompleteClick}
                disabled={isCompleting}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {isCompleting ? 'Finalizando...' : 'Finalizar'}
              </Button>
            )}
            
            {service.status === 'completed' && service.assembler && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50" 
                onClick={handleRateClick}
              >
                <Star className="h-4 w-4 mr-1 fill-yellow-500" />
                Avaliar
              </Button>
            )}
            
            {service.status === 'open' && (
              <>
                <div className="flex items-center">
                  <button className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full flex items-center hover:bg-primary/20 transition-colors">
                    <span className="mr-1 font-bold">{service.candidates}</span>
                    <span>{service.candidates === 1 ? 'candidatura' : 'candidaturas'}</span>
                    <ChevronRight className="h-4 w-4 text-primary ml-1" />
                  </button>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50" 
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O serviço será excluído permanentemente.
            </AlertDialogDescription>
            <div className="mt-4 bg-amber-50 p-2 rounded-md border border-amber-200 flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-amber-800">
                Apenas serviços em aberto podem ser excluídos. Serviços em andamento ou finalizados não podem ser removidos.
              </span>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir serviço'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StoreServiceCard;
