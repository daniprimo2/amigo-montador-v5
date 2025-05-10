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
        <svg className={sizes[size]} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top part (A shape) */}
          <path 
            d="M256 64C256 64 189 152 153 202.7C147 210.7 143 219.9 143 229.7C143 249.7 159 267 180 267H332C353 267 369 249.7 369 229.7C369 219.9 365 210.7 359 202.7C323 152 256 64 256 64Z" 
            fill="white" 
          />
          
          {/* Bottom part (M shape) */}
          <path 
            d="M128 296C112 296 99 309 99 325C99 334.2 102.8 342.7 109 348.9L128 368C164 404 197 440 256 440C315 440 348 404 384 368L403 348.9C409.2 342.7 413 334.2 413 325C413 309 400 296 384 296H128Z" 
            fill="#AEAEAE" 
          />
        </svg>
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
