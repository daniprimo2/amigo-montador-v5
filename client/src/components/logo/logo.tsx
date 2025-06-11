import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  withText = false,
  className = ''
}) => {
  const logoSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img 
        src="/logo-amigomontador.jpg" 
        alt="AmigoMontador" 
        className={`${logoSizes[size]} object-contain mb-2`}
      />
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
