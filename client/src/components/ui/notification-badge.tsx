import React from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  type?: 'bell' | 'message';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  type = 'bell',
  size = 'md',
  className,
  showPulse = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const badgeSizeClasses = {
    sm: 'min-w-3 h-3 text-xs',
    md: 'min-w-4 h-4 text-xs',
    lg: 'min-w-5 h-5 text-sm'
  };

  const Icon = type === 'bell' ? Bell : MessageSquare;

  return (
    <div className={cn("relative inline-block", className)}>
      <Icon 
        className={cn(
          sizeClasses[size],
          showPulse && count > 0 ? 'animate-pulse-once' : '',
          "transition-all duration-200"
        )} 
      />
      {count > 0 && (
        <span 
          className={cn(
            "absolute -top-1 -right-1 bg-red-500 text-white font-medium rounded-full",
            "flex items-center justify-center px-1",
            "border-2 border-white shadow-sm",
            "animate-in zoom-in-50 duration-200",
            badgeSizeClasses[size]
          )}
          style={{
            minWidth: size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px'
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
};

export default NotificationBadge;