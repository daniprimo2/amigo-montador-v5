import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  // Cores padronizadas para ambos lojista e montador
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
      case 'accepted':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Em aberto';
      case 'in-progress':
      case 'accepted':
      case 'confirmed':
        return 'Em andamento';
      case 'completed':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Em aberto';
    }
  };

  const sizeClasses = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center ${sizeClasses} ${getStatusStyles(status)} rounded-full font-medium`}>
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;