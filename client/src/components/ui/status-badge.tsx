import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em aberto' },
    'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em andamento' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Finalizado' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
    accepted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em andamento' },
    confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em andamento' }
  };

  const { bg, text, label } = statusMap[status] || statusMap.open;
  const sizeClasses = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

  return (
    <span className={`${sizeClasses} ${bg} ${text} rounded-full font-medium`}>
      {label}
    </span>
  );
};

export default StatusBadge;