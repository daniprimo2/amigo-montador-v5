import React, { useState } from 'react';
import { CalendarIcon, DollarSign, ChevronRight, CheckSquare, Trash2, AlertTriangle, PencilIcon, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import EditServiceDialog from './edit-service-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
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
  description?: string;
  location: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  price: string;
  candidates: number;
  materialType?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled' | 'hired' | 'awaiting_evaluation';
  projectFiles?: Array<{ name: string; path: string; }>;
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
  onChatClick?: (id: number) => void;
}

export const StoreServiceCard: React.FC<StoreServiceCardProps> = ({ 
  service, 
  onClick,
  onComplete,
  onRateClick,
  onChatClick
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Função para formatar o preço corretamente
  const formatPrice = (price: string): string => {
    // Se já está formatado como moeda, retorna como está
    if (price.includes('R$')) {
      return price;
    }
    
    // O preço vem do banco no formato americano (ponto como decimal)
    // Converte diretamente para número sem processar vírgulas
    const numericPrice = parseFloat(price);
    
    // Se o valor for inválido, retorna o valor original
    if (isNaN(numericPrice)) {
      return `R$ ${price}`;
    }
    
    // Formata como moeda brasileira garantindo que valores pequenos como 0,01 sejam exibidos corretamente
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericPrice);
  };
  
  const handleClick = () => {
    if (onClick) onClick(service.id);
  };
  
  const handleCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onComplete) {
      try {
        setIsCompleting(true);
        
        const response = await apiRequest({
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
        
        // Após completar o serviço com sucesso, vamos abrir diretamente o diálogo de avaliação
        // Isso garante que não há dependência de eventos do WebSocket
        if (service.assembler && onRateClick) {
          // Pequeno timeout para garantir que o estado da aplicação foi atualizado
          setTimeout(() => {
            // Chama diretamente a função de avaliação que foi passada como prop
            onRateClick(service);
            
            // Também dispara o evento para garantir compatibilidade com ambas implementações
            const event = new CustomEvent('open-rating-dialog', {
              detail: {
                serviceId: service.id,
                serviceData: {
                  id: service.id, 
                  title: service.title,
                  assemblerData: service.assembler ? {
                    id: service.assembler.id,
                    userId: service.assembler.userId,
                    name: service.assembler.name
                  } : null
                }
              }
            });
            window.dispatchEvent(event);
            
            // Log para depuração
            }, 500);
        } else {
          }
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

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChatClick) {
      onChatClick(service.id);
    }
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
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
      <div className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors" onClick={handleClick}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm sm:text-base truncate">{service.title}</h4>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{service.location}</p>
            {service.assembler && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Montador:</span> {service.assembler.name}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={service.status} />
          </div>
        </div>
        
        {/* Descrição do serviço */}
        {service.description && service.description.trim() && (
          <div className="mb-2">
            <p className="text-sm text-gray-600">{service.description}</p>
          </div>
        )}

        {/* Material */}
        {service.materialType && service.materialType.trim() && (
          <div className="mb-2">
            <span className="text-sm text-gray-600">Material: </span>
            <span className="text-sm text-gray-800 font-medium">{service.materialType}</span>
          </div>
        )}

        {/* Datas de início e fim, e preço */}
        <div className="space-y-2 mb-3">
          {/* Datas de início e fim */}
          {service.startDate && service.endDate ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 text-green-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium text-green-600">Início:</span>{' '}
                  {service.startDate.split('T')[0].split('-').reverse().join('/')}
                </span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 text-blue-500 mr-1 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium text-blue-600">Fim:</span>{' '}
                  {service.endDate.split('T')[0].split('-').reverse().join('/')}
                </span>
              </div>
            </div>
          ) : service.date ? (
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600 truncate">
                {service.date}
              </span>
            </div>
          ) : (
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 text-red-400 mr-1 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-red-600">
                Data não informada
              </span>
            </div>
          )}
          
          {/* Preço */}
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-600 font-medium">{formatPrice(service.price)}</span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {/* O botão "Montagem Concluída" foi movido para a interface de chat */}

            {service.status === 'open' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                  onClick={handleEditClick}
                  title="Editar serviço"
                >
                  <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50" 
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  title="Excluir serviço"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </>
            )}
            
            {(service.status === 'in-progress' || service.status === 'hired') && onChatClick && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                onClick={handleChatClick}
                title="Ver conversa com candidatos"
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Ver Conversa</span>
              </Button>
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
      
      {/* Diálogo de edição de serviço */}
      {editDialogOpen && (
        <EditServiceDialog
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          service={{
            id: service.id,
            title: service.title,
            description: service.description,
            location: service.location,
            date: service.date,
            price: service.price,
            materialType: service.materialType,
            cep: service.cep,
            address: service.address,
            addressNumber: service.addressNumber,
            status: service.status === 'hired' ? 'in-progress' : service.status,
            startDate: service.startDate,
            endDate: service.endDate,
            projectFiles: service.projectFiles
          }}
        />
      )}
    </>
  );
};

export default StoreServiceCard;
