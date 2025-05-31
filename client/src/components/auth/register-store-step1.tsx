import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import FileUpload from '../ui/file-upload';
import InputMask from 'react-input-mask';

// Função para validar CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Evita CPFs com todos os dígitos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleanCPF.charAt(10));
};

// Função para validar CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // Evita CNPJs com todos os dígitos iguais
  
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
};

// Função para validar telefone brasileiro
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

const storeStep1Schema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  documentType: z.enum(['cpf', 'cnpj'], {
    required_error: "Selecione o tipo de documento"
  }),
  documentNumber: z.string()
    .min(1, 'Documento obrigatório'),
  phone: z.string()
    .min(1, 'Telefone é obrigatório')
    .refine(validatePhone, 'Telefone deve ter 10 ou 11 dígitos'),
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .max(50, 'A senha deve ter no máximo 50 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  profilePicture: z.any().refine((files) => {
    return files && files.length > 0;
  }, {
    message: "Foto de perfil é obrigatória"
  }).refine((files) => {
    if (!files || files.length === 0) return false;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }, {
    message: "Foto deve ser uma imagem (JPG, PNG, GIF, WEBP) de até 5MB"
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.documentType === 'cpf') {
    return validateCPF(data.documentNumber);
  } else if (data.documentType === 'cnpj') {
    return validateCNPJ(data.documentNumber);
  }
  return false;
}, {
  message: "Documento inválido",
  path: ["documentNumber"],
});

export type StoreStep1Data = z.infer<typeof storeStep1Schema>;

interface RegisterStoreStep1Props {
  onNext: (data: StoreStep1Data) => void;
  defaultValues?: Partial<StoreStep1Data>;
}

export const RegisterStoreStep1: React.FC<RegisterStoreStep1Props> = ({ 
  onNext, 
  defaultValues = {} 
}) => {
  const [profileFiles, setProfileFiles] = useState<FileList | null>(null);

  const form = useForm<StoreStep1Data>({
    resolver: zodResolver(storeStep1Schema),
    defaultValues: {
      name: '',
      documentType: 'cpf',
      documentNumber: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      ...defaultValues,
    },
  });

  const documentType = form.watch('documentType');

  const handleProfileChange = (files: FileList | null) => {
    setProfileFiles(files);
    form.setValue('profilePicture', files);
  };

  const onSubmit = (data: StoreStep1Data) => {
    const formData = {
      ...data,
      profilePicture: profileFiles,
    };
    onNext(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-opacity-10 text-[#282c34]">
                  Passo 1 de 2
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-muted">
              <div style={{width: '50%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#282c34]"></div>
            </div>
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-1">Dados Pessoais</h2>
      <p className="text-sm text-muted-foreground mb-6">Preencha seus dados pessoais para continuar.</p>
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
            name="documentType"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Tipo de Documento</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-row space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="cpf" />
                      </FormControl>
                      <FormLabel className="font-normal">CPF</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="cnpj" />
                      </FormControl>
                      <FormLabel className="font-normal">CNPJ</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="documentNumber"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</FormLabel>
                <FormControl>
                  <InputMask
                    mask={documentType === 'cpf' ? '999.999.999-99' : '99.999.999/9999-99'}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
                  <InputMask
                    mask="(99) 99999-9999"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="(00) 00000-0000"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
            <FormLabel>Foto de Perfil *</FormLabel>
            <FileUpload 
              label="Foto de perfil (obrigatória)"
              accept="image/*"
              onChange={handleProfileChange}
              helpText="PNG, JPG, GIF, WEBP até 5MB"
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

export default RegisterStoreStep1;
