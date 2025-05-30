import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import FileUpload from '../ui/file-upload';
import InputMask from 'react-input-mask';
import { useToast } from '@/hooks/use-toast';

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

// Função para validar telefone brasileiro
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

// Função para validar CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // Evita CNPJs com todos os dígitos iguais
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(cleanCNPJ.charAt(13));
};

// Função para validar CEP
const validateZipCode = (zipCode: string): boolean => {
  const cleanZipCode = zipCode.replace(/\D/g, '');
  return cleanZipCode.length === 8;
};

const assemblerStep1Schema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  cpf: z.string()
    .min(1, 'CPF é obrigatório')
    .refine(validateCPF, 'CPF inválido'),
  documentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  documentNumber: z.string()
    .min(1, 'Número do documento é obrigatório')
    .refine((value, ctx) => {
      const documentType = ctx.parent.documentType;
      if (documentType === 'cpf') {
        return validateCPF(value);
      } else if (documentType === 'cnpj') {
        return validateCNPJ(value);
      }
      return true;
    }, 'Documento inválido'),
  phone: z.string()
    .min(1, 'Telefone é obrigatório')
    .refine(validatePhone, 'Telefone deve ter 10 ou 11 dígitos'),
  zipCode: z.string()
    .min(1, 'CEP é obrigatório')
    .refine(validateZipCode, 'CEP deve ter 8 dígitos'),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(255, 'Endereço deve ter no máximo 255 caracteres'),
  addressNumber: z.string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  neighborhood: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  state: z.string()
    .min(2, 'Selecione um estado')
    .regex(/^[A-Z]{2}$/, 'Estado deve ter 2 caracteres maiúsculos'),
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
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const { toast } = useToast();

  const form = useForm<AssemblerStep1Data>({
    resolver: zodResolver(assemblerStep1Schema),
    defaultValues: {
      name: '',
      cpf: '',
      documentType: 'cpf' as const,
      documentNumber: '',
      phone: '',
      zipCode: '',
      address: '',
      addressNumber: '',
      neighborhood: '',
      city: '',
      state: '',
      email: '',
      password: '',
      confirmPassword: '',
      ...defaultValues,
    },
  });

  const onSubmit = (data: AssemblerStep1Data) => {
    // Adicionar arquivo se presente e montar o endereço completo
    const formData = {
      ...data,
      fullAddress: `${data.address}, ${data.addressNumber} - ${data.neighborhood}`,
      profilePicture: profileFiles,
    };
    onNext(formData);
  };

  const handleProfileChange = (files: FileList | null) => {
    setProfileFiles(files);
    form.setValue('profilePicture', files);
  };
  
  const searchZipCode = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 8) {
      return;
    }
    
    // Remove caracteres não numéricos do CEP
    const cleanZipCode = zipCode.replace(/\D/g, '');
    
    if (cleanZipCode.length !== 8) {
      return;
    }
    
    try {
      setIsSearchingZipCode(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue('address', data.logradouro);
        form.setValue('neighborhood', data.bairro);
        form.setValue('city', data.localidade);
        form.setValue('state', data.uf);
        
        // Notificar o usuário que o endereço foi preenchido
        toast({
          title: "Endereço encontrado",
          description: "Os campos de endereço foram preenchidos automaticamente.",
        });
      } else {
        // Notificar o usuário que o CEP não foi encontrado
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado ou preencha o endereço manualmente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Preencha o endereço manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingZipCode(false);
    }
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
                  <InputMask
                    mask="999.999.999-99"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="000.000.000-00"
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
            name="zipCode"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>CEP</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <InputMask
                      mask="99999-999"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={(e) => {
                        field.onBlur();
                        searchZipCode(e.target.value);
                      }}
                      placeholder="00000-000"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => searchZipCode(field.value)}
                    disabled={isSearchingZipCode || !field.value || field.value.replace(/\D/g, '').length < 8}
                    className="w-auto min-w-24"
                  >
                    {isSearchingZipCode ? "Buscando..." : "Buscar CEP"}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="form-field col-span-2">
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Rua, Avenida, etc."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="addressNumber"
              render={({ field }) => (
                <FormItem className="form-field col-span-1">
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Seu bairro"
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

export default RegisterAssemblerStep1;
