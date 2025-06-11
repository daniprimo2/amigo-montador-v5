import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  withText = true,
  className = ''
}) => {
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${textSizes[size]} text-white font-bold mb-2`}>
        🔧
      </div>
      {withText && (
        <div className={`text-white ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'} flex items-center`}>
          <span className="font-light tracking-wide">Amigo</span>
          <span className="font-bold ml-1 tracking-wide">Montador</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
