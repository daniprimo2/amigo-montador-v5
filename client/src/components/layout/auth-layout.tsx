import React, { ReactNode } from 'react';
import Logo from '../logo/logo';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children,
  showBackButton = false,
  onBack
}) => {
  return (
    <div className="min-h-screen tech-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 tech-grid opacity-10"></div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {showBackButton && onBack && (
          <button 
            className="absolute top-8 left-6 z-20 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            onClick={onBack}
          >
            <ArrowLeft size={24} />
          </button>
        )}
        
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="auth-card w-full max-w-md">
            <div className="auth-card-inner">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
