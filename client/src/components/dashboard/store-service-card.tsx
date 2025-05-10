import React from 'react';
import { CalendarIcon, DollarSign, ChevronRight } from 'lucide-react';

interface ServiceProps {
  id: number;
  title: string;
  location: string;
  date: string;
  price: string;
  candidates: number;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
}

interface StoreServiceCardProps {
  service: ServiceProps;
  onClick?: (id: number) => void;
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
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) onClick(service.id);
  };

  return (
    <div className="p-4" onClick={handleClick}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{service.title}</h4>
          <p className="text-sm text-gray-500">{service.location}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center">
          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-600">{service.date}</span>
        </div>
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-600">{service.price}</span>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-primary font-medium">
            {service.candidates} {service.candidates === 1 ? 'candidato' : 'candidatos'}
          </span>
          <ChevronRight className="h-4 w-4 text-primary ml-1" />
        </div>
      </div>
    </div>
  );
};

export default StoreServiceCard;
