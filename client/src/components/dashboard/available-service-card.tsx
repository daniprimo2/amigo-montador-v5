import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, CalendarIcon, DollarSign, MapPin } from 'lucide-react';

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
  const handleApply = () => {
    if (onApply) onApply(service.id);
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
        className="w-full py-2 px-4 bg-primary text-white font-medium rounded-full shadow-sm hover:bg-opacity-90 transition"
      >
        Candidatar-se
      </Button>
    </div>
  );
};

export default AvailableServiceCard;
