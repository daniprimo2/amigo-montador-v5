import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '../ui/file-upload';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { MaskedInput } from '../ui/masked-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateCPF, validateCNPJ, formatCPF } from '@/lib/bank-account-schema';
import { getBanksOrderedByName } from '@/lib/brazilian-banks';
import { PDFViewer } from '@/components/ui/pdf-viewer';

// Função para validar CEP
const validateZipCode = (zipCode: string): boolean => {
  const cleanZipCode = zipCode.replace(/\D/g, '');
  return cleanZipCode.length === 8;
};

// Função para validar telefone brasileiro
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

const storeStep2Schema = z.object({
  storeName: z.string()
    .min(3, 'Nome da loja deve ter pelo menos 3 caracteres')
    .max(100, 'Nome da loja deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s0-9\-\.]+$/, 'Nome da loja contém caracteres inválidos'),
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
  storePhone: z.string()
    .min(1, 'Telefone da loja é obrigatório')
    .refine(validatePhone, 'Telefone deve ter 10 ou 11 dígitos'),
  materialTypes: z.array(z.string())
    .min(1, 'Selecione pelo menos um tipo de material')
    .max(3, 'Selecione no máximo 3 tipos de material'),
  logoFile: z.any().refine(val => {
    if (!val || !(val instanceof FileList) || val.length === 0) return false;
    const file = val[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }, {
    message: "Logo deve ser uma imagem (JPG, PNG, GIF, WEBP) de até 10MB"
  }),
  // Dados bancários - usando validações completas
  bankName: z.string()
    .min(1, 'Nome do banco é obrigatório')
    .max(100, 'Nome do banco deve ter no máximo 100 caracteres'),
  accountType: z.enum(['corrente', 'poupança'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  accountNumber: z.string()
    .min(1, 'Número da conta é obrigatório')
    .max(20, 'Número da conta deve ter no máximo 20 caracteres')
    .regex(/^[0-9\-]+$/, 'Número da conta deve conter apenas números e hífens'),
  agency: z.string()
    .min(1, 'Agência é obrigatória')
    .max(10, 'Agência deve ter no máximo 10 caracteres')
    .regex(/^[0-9\-]+$/, 'Agência deve conter apenas números e hífens'),
  holderName: z.string()
    .min(3, 'Nome do titular deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do titular deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome do titular deve conter apenas letras e espaços'),
  holderDocumentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  holderDocumentNumber: z.string()
    .min(1, 'Número do documento é obrigatório')
    .refine((val) => val.replace(/\D/g, '').length >= 11, {
      message: 'Número do documento deve ter pelo menos 11 dígitos'
    }),
  pixKey: z.string()
    .min(1, 'Chave PIX é obrigatória para receber pagamentos')
    .max(77, 'Chave PIX deve ter no máximo 77 caracteres'),
  pixKeyType: z.enum(['cpf'], {
    required_error: 'Tipo de chave PIX é obrigatório',
  }),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "Você deve concordar com os termos de serviço",
  }),
}).refine((data) => {
  // Validar documento do titular
  if (data.holderDocumentType === 'cpf') {
    return validateCPF(data.holderDocumentNumber);
  } else if (data.holderDocumentType === 'cnpj') {
    return validateCNPJ(data.holderDocumentNumber);
  }
  return false;
}, {
  message: "CPF ou CNPJ do titular inválido. Verifique os dígitos verificadores.",
  path: ["holderDocumentNumber"],
}).refine((data) => {
  // Validar chave PIX - deve ser CPF válido
  if (!data.pixKey || data.pixKeyType !== 'cpf') return false;
  return validateCPF(data.pixKey);
}, {
  message: "Chave PIX deve ser um CPF válido",
  path: ["pixKey"],
}).refine((data) => {
  // Validar se a conta bancária pertence ao mesmo titular da chave PIX
  if (data.holderDocumentType === 'cpf' && data.pixKeyType === 'cpf') {
    // Remover formatação para comparar os números
    const holderCPF = data.holderDocumentNumber.replace(/\D/g, '');
    const pixKeyCPF = data.pixKey.replace(/\D/g, '');
    return holderCPF === pixKeyCPF;
  }
  return true;
}, {
  message: "A chave PIX deve ser o mesmo CPF do titular da conta bancária",
  path: ["pixKey"],
});

export type StoreStep2Data = z.infer<typeof storeStep2Schema>;

interface RegisterStoreStep2Props {
  onBack: () => void;
  onComplete: (data: StoreStep2Data) => void;
  step1Data: any;
  defaultValues?: Partial<StoreStep2Data>;
}

export const RegisterStoreStep2: React.FC<RegisterStoreStep2Props> = ({ 
  onBack, 
  onComplete, 
  step1Data, 
  defaultValues = {} 
}) => {
  const { registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [logoFiles, setLogoFiles] = useState<FileList | null>(null);
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  const form = useForm<StoreStep2Data>({
    resolver: zodResolver(storeStep2Schema),
    defaultValues: {
      storeName: '',
      zipCode: '',
      address: '',
      addressNumber: '',
      neighborhood: '',
      city: '',
      state: '',
      storePhone: '',
      materialTypes: [],
      // Dados bancários
      bankName: '',
      accountType: 'corrente',
      accountNumber: '',
      agency: '',
      holderName: '',
      holderDocumentType: 'cpf',
      holderDocumentNumber: '',
      pixKey: '',
      pixKeyType: 'cpf',
      termsAgreed: false,
      ...defaultValues,
    },
  });

  const onSubmit = async (data: StoreStep2Data) => {
    try {
      // Simular upload de arquivo
      let logoUrl = '';
      if (logoFiles && logoFiles.length > 0) {
        // Em uma implementação real, aqui faria o upload do arquivo para o servidor
        logoUrl = URL.createObjectURL(logoFiles[0]);
      }

      // Combinar dados do passo 1 e 2
      const userData = {
        ...step1Data,
        ...data,
        zipCode: data.zipCode,
        neighborhood: data.neighborhood,
        logoUrl,
        // Dados bancários
        bankName: data.bankName,
        accountType: data.accountType,
        accountNumber: data.accountNumber,
        agency: data.agency,
        holderName: data.holderName,
        holderDocumentType: data.holderDocumentType,
        holderDocumentNumber: data.holderDocumentNumber,
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        userType: 'lojista',
        username: step1Data.email,
        email: step1Data.email, // Adicionando campo email requerido pelo backend
      };

      // Registrar no backend
      registerMutation.mutate(userData, {
        onSuccess: () => {
          toast({
            title: 'Cadastro realizado com sucesso',
            description: 'Seu cadastro foi concluído! Você será redirecionado para o dashboard.',
          });
          navigate('/lojista');
        },
      });
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: 'Ocorreu um erro ao realizar o cadastro. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleLogoChange = (files: FileList | null) => {
    setLogoFiles(files);
    form.setValue('logoFile', files);
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
    <div className="auth-container">
      <div className="text-center mb-8">
        <p className="text-sm text-gray-500 mb-4">
          PASSO 2 DE 2
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1 mb-6">
          <div className="bg-gray-800 h-1 rounded-full" style={{width: '100%'}}></div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dados da Loja
        </h1>
        <p className="text-gray-600">
          Preencha os dados da sua loja.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="storeName"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Nome da Loja</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nome da sua loja"
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
                    <MaskedInput
                      mask="99999-999"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        field.onBlur();
                        searchZipCode(e.target.value);
                      }}
                      placeholder="00000-000"
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
            name="storePhone"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Telefone da Loja</FormLabel>
                <FormControl>
                  <MaskedInput
                    mask="(99) 99999-9999"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="(11) 99999-9999"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="materialTypes"
            render={() => (
              <FormItem className="form-field">
                <FormLabel>Material</FormLabel>
                <div className="flex flex-col gap-2 p-3 border rounded-md">
                  <div className="flex items-center">
                    <Checkbox
                      id="plano-corte"
                      onCheckedChange={(checked) => {
                        const current = form.getValues('materialTypes') || [];
                        const updated = checked
                          ? [...current, 'plano-corte']
                          : current.filter((type: string) => type !== 'plano-corte');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="plano-corte" className="ml-2 font-medium text-sm">
                      Plano de corte
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="marcenaria"
                      onCheckedChange={(checked) => {
                        const current = form.getValues('materialTypes') || [];
                        const updated = checked
                          ? [...current, 'marcenaria']
                          : current.filter((type: string) => type !== 'marcenaria');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="marcenaria" className="ml-2 font-medium text-sm">
                      Marcenaria
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="fabrica"
                      onCheckedChange={(checked) => {
                        const current = form.getValues('materialTypes') || [];
                        const updated = checked
                          ? [...current, 'fabrica']
                          : current.filter((type: string) => type !== 'fabrica');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="fabrica" className="ml-2 font-medium text-sm">
                      Fábrica
                    </label>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="form-field">
            <FormLabel>Logotipo da Loja</FormLabel>
            <FileUpload 
              label="Logo da loja"
              accept="image/*"
              onChange={handleLogoChange}
              helpText="PNG, JPG, GIF até 10MB"
              required={true}
            />
            {form.formState.errors.logoFile && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.logoFile.message?.toString()}
              </p>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mt-8 mb-4">Informações Bancárias</h3>
          <p className="text-sm text-gray-500 mb-6">Preencha os dados da sua conta bancária para receber pagamentos.</p>
          
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Nome do Banco</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu banco..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-60">
                    {getBanksOrderedByName().map((bank) => (
                      <SelectItem key={bank.code} value={bank.name}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupança">Conta Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="agency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Exemplo: 1234" 
                      {...field}
                      onChange={(e) => {
                        // Permite apenas números e hífens
                        const value = e.target.value.replace(/[^\d\-]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Conta</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Exemplo: 12345-6" 
                      {...field}
                      onChange={(e) => {
                        // Permite apenas números e hífens
                        const value = e.target.value.replace(/[^\d\-]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="holderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Titular</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do titular" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="holderDocumentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Documento</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="holderDocumentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Documento</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={form.watch('holderDocumentType') === 'cpf' ? '123.456.789-00' : '12.345.678/0001-90'} 
                      {...field}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d]/g, '');
                        
                        // Formatação automática baseada no tipo
                        if (form.watch('holderDocumentType') === 'cpf') {
                          value = formatCPF(value);
                        } else if (form.watch('holderDocumentType') === 'cnpj') {
                          // For CNPJ, apply basic formatting
                          value = value.replace(/[^\d]/g, '');
                          if (value.length > 14) value = value.substring(0, 14);
                          value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
                        }
                        
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Aviso sobre restrição da chave PIX */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-1">Importante: Restrição da Chave PIX</h4>
                <p className="text-sm text-amber-700">
                  A chave PIX deve ser obrigatoriamente no formato CPF e deve ser o mesmo CPF informado como titular da conta bancária.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="pixKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave PIX (CPF)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123.456.789-00"
                      {...field}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Formatação automática para CPF
                        value = value.replace(/[^\d]/g, '');
                        value = formatCPF(value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Informe o mesmo CPF do titular da conta bancária
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="termsAgreed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Eu concordo com os <button 
                      type="button"
                      onClick={() => setIsPdfViewerOpen(true)}
                      className="text-[#0000FF] underline hover:text-blue-700 transition-colors"
                    >
                      Termos de Serviço e Política de Privacidade
                    </button>.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          
          <div className="flex gap-4 mt-8">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Voltar
            </Button>
            <Button 
              type="submit" 
              className="auth-button flex-1"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Cadastrando...' : 'Concluir Cadastro'}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* PDF Viewer for Terms and Privacy Policy */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl="/assets/termos-privacidade.pdf"
        title="Termos de Serviço e Política de Privacidade"
      />
    </div>
  );
};

export default RegisterStoreStep2;
