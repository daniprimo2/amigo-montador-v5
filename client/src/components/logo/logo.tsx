import React from 'react';
import logoImage from '@assets/Logo - Amigo Montador.jpg';

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
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-2">
        <img 
          src={logoImage} 
          alt="Amigo Montador Logo" 
          className={sizes[size]} 
        />
      </div>
      {withText && (
        <div className={`text-white ${textSizes[size]} flex items-center mt-1`}>
          <span className="font-light tracking-wide">amigo</span>
          <span className="font-bold ml-1 tracking-wide">montador</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
