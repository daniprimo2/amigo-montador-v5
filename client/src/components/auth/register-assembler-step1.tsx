import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import FileUpload from '../ui/file-upload';

const assemblerStep1Schema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Selecione um estado'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  profilePicture: z.any().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type AssemblerStep1Data = z.infer<typeof assemblerStep1Schema>;

interface RegisterAssemblerStep1Props {
  onNext: (data: AssemblerStep1Data) => void;
  defaultValues?: Partial<AssemblerStep1Data>;
}

export const RegisterAssemblerStep1: React.FC<RegisterAssemblerStep1Props> = ({ 
  onNext, 
  defaultValues = {} 
}) => {
  const [profileFiles, setProfileFiles] = useState<FileList | null>(null);

  const form = useForm<AssemblerStep1Data>({
    resolver: zodResolver(assemblerStep1Schema),
    defaultValues: {
      name: '',
      cpf: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      email: '',
      password: '',
      confirmPassword: '',
      ...defaultValues,
    },
  });

  const onSubmit = (data: AssemblerStep1Data) => {
    // Adicionar arquivo se presente
    const formData = {
      ...data,
      profilePicture: profileFiles,
    };
    onNext(formData);
  };

  const handleProfileChange = (files: FileList | null) => {
    setProfileFiles(files);
    form.setValue('profilePicture', files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary bg-opacity-10">
                  Passo 1 de 3
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div style={{width: '33%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Dados Pessoais</h2>
      <p className="text-sm text-gray-500 mb-6">Preencha seus dados pessoais para continuar.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Seu nome completo"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="000.000.000-00"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="(00) 00000-0000"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Rua, número, bairro"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="form-field">
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Sua cidade"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem className="form-field">
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <select 
                      {...field}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Selecione</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AM">AM</option>
                      <option value="AP">AP</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MG">MG</option>
                      <option value="MS">MS</option>
                      <option value="MT">MT</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="PR">PR</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="RS">RS</option>
                      <option value="SC">SC</option>
                      <option value="SE">SE</option>
                      <option value="SP">SP</option>
                      <option value="TO">TO</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="seu@email.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder="Crie uma senha"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Confirmar Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder="Confirme sua senha"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="form-field">
            <FormLabel>Foto de Perfil</FormLabel>
            <FileUpload 
              label="Foto de perfil"
              accept="image/*"
              onChange={handleProfileChange}
              helpText="PNG, JPG, GIF até 10MB"
            />
            {form.formState.errors.profilePicture && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.profilePicture.message?.toString()}
              </p>
            )}
          </div>
          
          <Button type="submit" className="auth-button">
            Próximo
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RegisterAssemblerStep1;
