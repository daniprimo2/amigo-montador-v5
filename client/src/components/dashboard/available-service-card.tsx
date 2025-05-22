import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building, CalendarIcon, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceProps {
  id: number;
  title: string;
  location: string;
  distance: string;
  date: string;
  price: string;
  store: string;
  type: string;
  status?: string;
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
  const { toast } = useToast();
  
  const handleApply = async () => {
    if (!onApply) return;
    
    try {
      setIsApplying(true);
      console.log(`[AvailableServiceCard] Iniciando candidatura para serviço ID: ${service.id}`);
      
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await onApply(service.id);
      console.log(`[AvailableServiceCard] Resposta da candidatura:`, response);
      
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
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{service.title}</h4>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{service.location} ({service.distance})</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-primary">{service.price}</div>
          <div className="text-xs text-gray-500">{service.type}</div>
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <div className="flex justify-between">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-1 text-gray-400" />
            <span>{service.store}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
            <span>{
              // Extract and format just the start date from the combined "startDate - endDate" string
              service.date.includes('-') 
                ? (() => {
                    const startDateStr = service.date.split('-')[0].trim();
                    try {
                      // If it's already a formatted date like "DD/MM/YYYY", return it as is
                      if (startDateStr.includes('/')) {
                        return startDateStr;
                      }
                      // Otherwise, format the ISO date string
                      const startDate = new Date(startDateStr);
                      return startDate.toLocaleDateString('pt-BR');
                    } catch {
                      // Fallback to the original string if there's an error parsing the date
                      return startDateStr;
                    }
                  })()
                : service.date
            }</span>
          </div>
        </div>
      </div>
      <Button 
        onClick={handleApply}
        disabled={isApplying || service.status === 'in-progress' || hasApplied}
        className={`w-full py-2 px-4 font-medium rounded-full shadow-sm transition ${hasApplied ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-opacity-90'} text-white`}
      >
        {isApplying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : service.status === 'in-progress' ? 
          'Serviço em andamento' : 
          hasApplied ? 'Em andamento' : 'Candidatar-se'}
      </Button>
    </div>
  );
};

export default AvailableServiceCard;
