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
          {/* Top part (A shape in white with rounded corners) */}
          <path 
            d="M60 15C45 40 30 65 30 65L60 95L90 65C90 65 75 40 60 15Z" 
            fill="white" 
            style={{ 
              filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
            }}
          />
          
          {/* Bottom part (M shape in gray with rounded corners) */}
          <path 
            d="M30 75L20 85C20 85 30 105 40 105C50 105 60 95 60 95C60 95 70 105 80 105C90 105 100 85 100 85L90 75" 
            fill="#B0B0B0" 
            style={{ 
              filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
            }}
          />
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
