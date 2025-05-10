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
}

interface AvailableServiceCardProps {
  service: ServiceProps;
  onApply?: (id: number) => void;
}

export const AvailableServiceCard: React.FC<AvailableServiceCardProps> = ({ 
  service, 
  onApply 
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();
  
  const handleApply = async () => {
    if (!onApply) return;
    
    try {
      setIsApplying(true);
      console.log(`Enviando candidatura para serviço ID: ${service.id}`);
      await onApply(service.id);
      
      toast({
        title: "Candidatura enviada",
        description: "Sua candidatura foi enviada com sucesso! Em breve o lojista entrará em contato.",
        duration: 5000
      });
    } catch (error) {
      console.error("Erro ao candidatar-se:", error);
      toast({
        title: "Erro ao enviar candidatura",
        description: error instanceof Error ? error.message : "Falha ao enviar candidatura. Tente novamente.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsApplying(false);
    }
  };

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
            <span>{service.date}</span>
          </div>
        </div>
      </div>
      <Button 
        onClick={handleApply}
        disabled={isApplying}
        className="w-full py-2 px-4 bg-primary text-white font-medium rounded-full shadow-sm hover:bg-opacity-90 transition"
      >
        {isApplying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : 'Candidatar-se'}
      </Button>
    </div>
  );
};

export default AvailableServiceCard;
