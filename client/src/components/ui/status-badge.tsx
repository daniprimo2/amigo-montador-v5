import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  // Cores padronizadas para ambos lojista e montador - paleta mais atrativa
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm';
      case 'in-progress':
      case 'accepted':
      case 'confirmed':
      case 'hired':
        return 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 shadow-sm';
      case 'completed':
        return 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 shadow-sm';
      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Em aberto';
      case 'in-progress':
      case 'accepted':
      case 'confirmed':
      case 'hired':
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

  // Ícones para cada status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return '🔵';
      case 'in-progress':
      case 'accepted':
      case 'confirmed':
      case 'hired':
        return '🟠';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '🔵';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} ${getStatusStyles(status)} rounded-full font-medium transition-all duration-200 hover:shadow-md`}>
      <span className="text-xs">{getStatusIcon(status)}</span>
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;