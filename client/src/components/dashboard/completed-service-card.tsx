import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, CalendarIcon, DollarSign, MapPin, Star } from 'lucide-react';

interface ServiceProps {
  id: number;
  title: string;
  location: string;
  date: string;
  price: string;
  store: string;
  type: string;
  rated?: boolean;
}

interface CompletedServiceCardProps {
  service: ServiceProps;
  onRateClick?: (service: ServiceProps) => void;
}

export const CompletedServiceCard: React.FC<CompletedServiceCardProps> = ({ 
  service, 
  onRateClick 
}) => {
  const handleRateClick = () => {
    if (onRateClick) onRateClick(service);
  };

  return (
    <div className="p-4 border-b last:border-0">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{service.title}</h4>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{service.location}</span>
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
      
      {!service.rated && (
        <div className="flex flex-col space-y-2">
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm mb-2">
            <span className="font-semibold">⚠️ Avaliação Pendente:</span> É necessário avaliar este serviço.
          </div>
          <Button 
            onClick={handleRateClick}
            size="sm" 
            variant="default" 
            className="w-full flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Star className="h-4 w-4 mr-1 fill-white" />
            Avaliar Agora
          </Button>
        </div>
      )}
      
      {service.rated && (
        <div className="text-sm text-green-600 font-medium flex items-center">
          <Star className="h-4 w-4 mr-1 fill-green-500" />
          Avaliado com Sucesso
        </div>
      )}
    </div>
  );
};

export default CompletedServiceCard;