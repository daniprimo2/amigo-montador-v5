import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RegisterOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const RegisterOption: React.FC<RegisterOptionProps> = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 border border-gray-300 rounded-lg flex items-center hover:bg-gray-50 transition"
    >
      <div className="w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-4">
        {icon}
      </div>
      <div className="text-left">
        <div className="font-medium text-gray-800">{title}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </button>
  );
};

interface RegisterFormProps {
  onSelectType: (type: 'lojista' | 'montador') => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSelectType }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Escolha o tipo de conta</h2>
      <p className="text-sm text-gray-500 mb-6">
        Selecione o tipo de perfil que deseja criar para continuar o cadastro.
      </p>

      <div className="space-y-4">
        <RegisterOption
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>}
          title="Lojista"
          description="Para lojas que buscam montadores"
          onClick={() => onSelectType('lojista')}
        />
        
        <RegisterOption
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
          title="Montador"
          description="Para profissionais de montagem"
          onClick={() => onSelectType('montador')}
        />
      </div>
    </div>
  );
};

export default RegisterForm;
