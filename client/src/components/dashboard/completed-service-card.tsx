import React from 'react';
import { Button } from '@/components/ui/button';
import { Building, CalendarIcon, CheckSquare, DollarSign, MapPin, MessageSquare } from 'lucide-react';

interface ServiceProps {
  id: number;
  title: string;
  location: string;
  date: string;
  price: string;
  store: string | { name: string; id?: number; logoUrl?: string; userId?: number; user?: any };
  type: string;

  completedAt?: string; // Nova propriedade para data de finalização
}

interface CompletedServiceCardProps {
  service: ServiceProps;
  onChatClick?: (serviceId: number) => void; // Nova propriedade para acesso ao chat
}

export const CompletedServiceCard: React.FC<CompletedServiceCardProps> = ({ 
  service, 
  onChatClick
}) => {
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



  const handleChatClick = () => {
    if (onChatClick) onChatClick(service.id);
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
          <div className="font-medium text-primary">{formatPrice(service.price)}</div>
          <div className="text-xs text-gray-500">{service.type}</div>
        </div>
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <div className="flex justify-between">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-1 text-gray-400" />
            <span>{typeof service.store === 'string' ? service.store : service.store?.name || 'Loja não especificada'}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
            <span>{service.date}</span>
          </div>
        </div>
      </div>
      
      {/* Data de finalização */}
      {service.completedAt && (
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <CheckSquare className="h-4 w-4 mr-1 text-green-500" />
          <span>Finalizado em: {service.completedAt}</span>
        </div>
      )}
      
      <div className="flex space-x-2 mb-3">
        {/* Botão para chat */}
        <Button 
          onClick={handleChatClick}
          size="sm" 
          variant="outline"
          className="flex items-center justify-center"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Ver Conversa
        </Button>
      </div>
      
      {/* Avaliações são gerenciadas pelo sistema obrigatório após pagamento */}
    </div>
  );
};

export default CompletedServiceCard;