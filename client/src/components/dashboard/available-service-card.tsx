import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building, CalendarIcon, MapPin, Loader2, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ServiceDetailsDialog } from './service-details-dialog';

export interface ServiceProps {
  id: number;
  title: string;
  location: string;
  address?: string;
  addressNumber?: string;
  cep?: string;
  distance: string;
  date: string; // Campo legacy mantido para compatibilidade
  startDate: string | null; // Data de início do serviço
  endDate: string | null; // Data de término previsto do serviço
  price: string;
  store: string;
  type: string;
  status?: string;
  description?: string;
  projectFiles?: Array<{
    name: string;
    path: string;
  }>;
}

interface AvailableServiceCardProps {
  service: ServiceProps;
  onApply?: (id: number) => void;
  activeServices?: any[]; // Array of services the montador has already applied to
}

export const AvailableServiceCard: React.FC<AvailableServiceCardProps> = ({ 
  service, 
  onApply,
  activeServices = []
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const { toast } = useToast();

  // Função para formatar o preço corretamente
  const formatPrice = (price: string): string => {
    // Se já está formatado como moeda, retorna como está
    if (price.includes('R$')) {
      return price;
    }
    
    // Converte string para número - o valor já vem correto da API
    const numericPrice = parseFloat(price);
    
    // Se o valor for inválido, retorna o valor original
    if (isNaN(numericPrice)) {
      return price;
    }
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericPrice);
  };
  
  const handleViewServiceDetails = () => {
    setIsServiceDetailsOpen(true);
  };
  
  const handleCloseServiceDetails = () => {
    setIsServiceDetailsOpen(false);
  };
  
  const handleApply = async () => {
    if (!onApply) return;
    
    try {
      setIsApplying(true);
      console.log(`[AvailableServiceCard] Iniciando candidatura para serviço ID: ${service.id}`);
      
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await onApply(service.id);
      console.log(`[AvailableServiceCard] Resposta da candidatura:`, response);
      
      // Fechar o diálogo de detalhes após o envio bem-sucedido
      setIsServiceDetailsOpen(false);
      
      toast({
        title: "Candidatura enviada",
        description: "Sua candidatura foi enviada com sucesso! Em breve o lojista entrará em contato.",
        duration: 5000
      });
    } catch (error) {
      console.error("[AvailableServiceCard] Erro ao candidatar-se:", error);
      
      let errorMessage = "Falha ao enviar candidatura. Tente novamente.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      console.error("[AvailableServiceCard] Detalhes do erro:", errorMessage);
      
      toast({
        title: "Erro ao enviar candidatura",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Check if this service is already in the active services (user already applied)
  const hasApplied = activeServices.some(activeService => activeService.id === service.id);

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm sm:text-base truncate">{service.title}</h4>
          <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-1">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{service.location} ({service.distance})</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-medium text-primary text-sm sm:text-base">{formatPrice(service.price)}</div>
          <div className="text-xs text-gray-500">{service.type}</div>
        </div>
      </div>
      
      {/* Informações da loja e data em layout responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="flex items-center text-xs sm:text-sm text-gray-600">
          <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400 flex-shrink-0" />
          <span className="truncate">{service.store}</span>
        </div>
        <div className="flex items-center text-xs sm:text-sm text-gray-600">
          <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {service.date}
          </span>
        </div>
      </div>
      {/* Botão para visualizar arquivos PDF */}
      {service.projectFiles && service.projectFiles.length > 0 && (
        <div className="mb-3">
          <Button
            variant="outline"
            onClick={() => setIsFilesDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-sm"
          >
            <FileText className="h-4 w-4" />
            Ver arquivos do projeto ({service.projectFiles.length})
          </Button>
        </div>
      )}
      
      <Button 
        onClick={handleViewServiceDetails}
        disabled={service.status === 'in-progress' || hasApplied}
        className={`w-full py-2 px-4 font-medium rounded-full shadow-sm transition ${hasApplied ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary hover:bg-opacity-90'} text-white`}
      >
        {service.status === 'in-progress' ? 
          'Serviço em andamento' : 
          hasApplied ? 'Em andamento' : 'Ver detalhes do serviço'}
      </Button>
      
      {/* Diálogo para detalhes do serviço e candidatura */}
      <ServiceDetailsDialog 
        isOpen={isServiceDetailsOpen}
        onClose={handleCloseServiceDetails}
        service={service}
        onApply={handleApply}
        isApplying={isApplying}
      />
      
      {/* Diálogo para visualizar arquivos PDF */}
      <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arquivos do Projeto</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {service.projectFiles && service.projectFiles.length > 0 ? (
              <div className="space-y-3">
                {service.projectFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={file.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="Visualizar PDF"
                      >
                        <FileText className="h-4 w-4 text-gray-600" />
                      </a>
                      <a 
                        href={file.path} 
                        download
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">Nenhum arquivo disponível para este serviço.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailableServiceCard;
