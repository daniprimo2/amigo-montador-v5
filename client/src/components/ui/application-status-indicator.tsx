import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ApplicationStatusIndicatorProps {
  status: 'pending' | 'accepted' | 'rejected' | 'not_applied' | 'awaiting_chat';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    text: 'Candidatura enviada. Aguardando resposta do lojista.',
    description: 'Sua candidatura está sendo analisada pelo lojista'
  },
  awaiting_chat: {
    icon: AlertCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    text: 'Aguardando retorno no chat',
    description: 'Serviço aguardando resposta do lojista. Aguarde o retorno no chat.'
  },
  accepted: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    text: 'Aceita',
    description: 'Sua candidatura foi aceita pelo lojista'
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    text: 'Rejeitada',
    description: 'Sua candidatura foi rejeitada pelo lojista'
  },
  not_applied: {
    icon: Send,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    text: 'Candidatar-se',
    description: 'Clique para se candidatar a este serviço'
  }
};

const sizeConfig = {
  sm: {
    iconSize: 'h-3 w-3',
    textSize: 'text-xs',
    padding: 'px-2 py-1',
    gap: 'gap-1'
  },
  md: {
    iconSize: 'h-4 w-4',
    textSize: 'text-sm',
    padding: 'px-3 py-2',
    gap: 'gap-2'
  },
  lg: {
    iconSize: 'h-5 w-5',
    textSize: 'text-base',
    padding: 'px-4 py-3',
    gap: 'gap-3'
  }
};

export const ApplicationStatusIndicator: React.FC<ApplicationStatusIndicatorProps> = ({
  status,
  size = 'md',
  showText = true,
  className
}) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border transition-all duration-200',
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        sizeStyles.gap,
        className
      )}
      title={config.description}
    >
      <Icon className={cn(sizeStyles.iconSize, config.color)} />
      {showText && (
        <span className={cn('font-medium', config.color, sizeStyles.textSize)}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default ApplicationStatusIndicator;