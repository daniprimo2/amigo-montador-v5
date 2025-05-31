import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RegisterOptionProps {
  image: string;
  title: string;
  description: string;
  onClick: () => void;
}

const RegisterOption: React.FC<RegisterOptionProps> = ({
  image,
  title,
  description,
  onClick,
}) => {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 border border-border rounded-lg flex items-center hover:bg-accent transition"
    >
      <div className="w-20 h-20 flex items-center justify-center mr-4">
        <img src={image} alt={title} className="w-full h-full object-contain" />
      </div>
      <div className="text-left">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
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
      <h2 className="text-xl font-semibold text-foreground mb-2">Escolha o tipo de conta</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Selecione o tipo de perfil que deseja criar para continuar o cadastro.
      </p>

      <div className="space-y-4">
        <RegisterOption
          image="/src/assets/store-owner.svg"
          title="Lojista"
          description="Para lojas que buscam montadores"
          onClick={() => onSelectType('lojista')}
        />
        
        <RegisterOption
          image="/src/assets/assembler.svg"
          title="Montador"
          description="Para profissionais de montagem"
          onClick={() => onSelectType('montador')}
        />
      </div>
    </div>
  );
};

export default RegisterForm;
