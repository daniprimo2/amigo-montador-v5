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
      <div className="text-white mb-2">
        <svg className={sizes[size]} viewBox="0 0 120 120" fill="none">
          <path d="M60 20L30 60H90L60 20Z" fill="white"/>
          <path d="M30 70L45 90H15L30 70Z" fill="#9CA3AF"/>
          <path d="M90 70L105 90H75L90 70Z" fill="#9CA3AF"/>
          <path d="M60 90L75 70H45L60 90Z" fill="#9CA3AF"/>
        </svg>
      </div>
      {withText && (
        <div className={`text-white ${textSizes[size]} flex items-center`}>
          <span className="font-light">amigo</span>
          <span className="font-bold ml-1">montador<sup>®</sup></span>
        </div>
      )}
    </div>
  );
};

export default Logo;
