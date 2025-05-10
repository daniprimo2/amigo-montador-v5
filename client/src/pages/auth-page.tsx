import React, { useState } from 'react';
import { useLocation } from 'wouter';
import AuthLayout from '@/components/layout/auth-layout';
import LoginForm from '@/components/auth/login-form';
import RegisterForm from '@/components/auth/register-form';
import RegisterStoreStep1 from '@/components/auth/register-store-step1';
import RegisterStoreStep2 from '@/components/auth/register-store-step2';
import RegisterAssemblerStep1 from '@/components/auth/register-assembler-step1';
import RegisterAssemblerStep2 from '@/components/auth/register-assembler-step2';
import RegisterAssemblerStep3 from '@/components/auth/register-assembler-step3';
import { useAuth } from '@/hooks/use-auth';

type UserType = 'lojista' | 'montador' | null;
type AuthView = 'login' | 'register' | 'register-store' | 'register-store-step2' | 'register-assembler' | 'register-assembler-step2' | 'register-assembler-step3';

export default function AuthPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [userType, setUserType] = useState<UserType>(null);
  const [showBackButton, setShowBackButton] = useState(false);
  
  // Dados de registro para guardar entre passos
  const [storeStep1Data, setStoreStep1Data] = useState({});
  const [assemblerStep1Data, setAssemblerStep1Data] = useState({});
  const [assemblerStep2Data, setAssemblerStep2Data] = useState({});

  // Redirecionar se o usuário já estiver logado
  React.useEffect(() => {
    if (user) {
      const redirectPath = user.userType === 'lojista' ? '/lojista' : '/montador';
      navigate(redirectPath);
    }
  }, [user, navigate]);

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setCurrentView(tab);
    setShowBackButton(false);
  };

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setCurrentView(type === 'lojista' ? 'register-store' : 'register-assembler');
    setShowBackButton(true);
  };

  const handleBack = () => {
    if (currentView === 'register') {
      setCurrentView('login');
      setActiveTab('login');
      setShowBackButton(false);
    } else if (currentView === 'register-store' || currentView === 'register-assembler') {
      setCurrentView('register');
      setShowBackButton(true); // Keep showing back button for return to login
    }
  };

  // Handlers para as etapas do registro de lojista
  const handleStoreStep1 = (data: any) => {
    setStoreStep1Data(data);
    setCurrentView('register-store-step2' as AuthView);
  };

  const handleStoreStep2 = (data: any) => {
    // Processado pelo componente
  };

  // Handlers para as etapas do registro de montador
  const handleAssemblerStep1 = (data: any) => {
    setAssemblerStep1Data(data);
    setCurrentView('register-assembler-step2' as AuthView);
  };

  const handleAssemblerStep2 = (data: any) => {
    setAssemblerStep2Data(data);
    setCurrentView('register-assembler-step3' as AuthView);
  };

  const handleAssemblerStep3 = (data: any) => {
    // Processado pelo componente
  };

  const handleAssemblerBack = () => {
    if (currentView === 'register-assembler-step3') {
      setCurrentView('register-assembler-step2' as AuthView);
    } else if (currentView === 'register-assembler-step2') {
      setCurrentView('register-assembler' as AuthView);
    }
  };

  return (
    <AuthLayout showBackButton={showBackButton} onBack={handleBack}>
      {currentView === 'login' || currentView === 'register' ? (
        <>
          <div className="auth-tabs">
            <button
              className={activeTab === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => handleTabChange('login')}
            >
              Entrar
            </button>
            <button
              className={activeTab === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => handleTabChange('register')}
            >
              Criar Conta
            </button>
          </div>

          {currentView === 'login' ? (
            <LoginForm />
          ) : (
            <RegisterForm onSelectType={handleUserTypeSelect} />
          )}
        </>
      ) : currentView === 'register-store' ? (
        <RegisterStoreStep1 
          onNext={handleStoreStep1} 
        />
      ) : currentView === 'register-store-step2' ? (
        <RegisterStoreStep2 
          onBack={() => setCurrentView('register-store' as AuthView)} 
          onComplete={handleStoreStep2}
          step1Data={storeStep1Data}
        />
      ) : currentView === 'register-assembler' ? (
        <RegisterAssemblerStep1 
          onNext={handleAssemblerStep1} 
        />
      ) : currentView === 'register-assembler-step2' ? (
        <RegisterAssemblerStep2 
          onNext={handleAssemblerStep2}
          onBack={() => setCurrentView('register-assembler' as AuthView)} 
        />
      ) : currentView === 'register-assembler-step3' ? (
        <RegisterAssemblerStep3 
          onBack={handleAssemblerBack}
          onComplete={handleAssemblerStep3}
          step1Data={assemblerStep1Data}
          step2Data={assemblerStep2Data}
        />
      ) : null}
    </AuthLayout>
  );
}
