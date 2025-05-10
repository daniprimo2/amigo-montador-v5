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
            d="M60 20C72 40 84 60 90 70C60 70 30 70 30 70C36 60 48 40 60 20Z" 
            fill="white" 
            style={{ 
              filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }}
          />
          
          {/* Bottom part (M shape in gray with rounded corners) */}
          <path 
            d="M28 80C32 84 36 88 40 95C46 90 53 85 60 80C67 85 74 90 80 95C84 88 88 84 92 80L28 80Z" 
            fill="#AEAEAE" 
            style={{ 
              filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
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
