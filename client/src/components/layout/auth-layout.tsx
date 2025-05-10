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
    <div className="flex flex-col h-screen">
      <div className="gradient-bg w-full h-40 flex items-center justify-center">
        {showBackButton && onBack && (
          <button 
            className="absolute left-6 text-white"
            onClick={onBack}
          >
            <ArrowLeft />
          </button>
        )}
        <Logo size="md" />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
