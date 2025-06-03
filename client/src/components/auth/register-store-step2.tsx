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
import InputMask from 'react-input-mask';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { baseBankAccountSchema } from '@/lib/bank-account-schema';
import { getBanksOrderedByName } from '@/lib/brazilian-banks';

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
  // Dados bancários
  bankName: baseBankAccountSchema.shape.bankName,
  accountType: baseBankAccountSchema.shape.accountType,
  accountNumber: baseBankAccountSchema.shape.accountNumber,
  agency: baseBankAccountSchema.shape.agency,
  holderName: baseBankAccountSchema.shape.holderName,
  holderDocumentType: baseBankAccountSchema.shape.holderDocumentType,
  holderDocumentNumber: baseBankAccountSchema.shape.holderDocumentNumber,
  pixKey: baseBankAccountSchema.shape.pixKey,
  pixKeyType: baseBankAccountSchema.shape.pixKeyType,
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
      pixKeyType: undefined,
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary bg-opacity-10">
                  Passo 2 de 2
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-muted">
              <div style={{width: '100%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-1">Dados da Loja</h2>
      <p className="text-sm text-muted-foreground mb-6">Preencha os dados da sua loja.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            name="storePhone"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Telefone da Loja</FormLabel>
                <FormControl>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maskChar={null}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        placeholder="(11) 99999-9999"
                        ref={field.ref}
                      />
                    )}
                  </InputMask>
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
                        // Permite apenas números, pontos, hífens e barras
                        const value = e.target.value.replace(/[^\d\.\-\/]/g, '');
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
              name="pixKeyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Chave PIX (opcional)</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatória">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('pixKeyType') && (
              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Digite sua chave ${form.watch('pixKeyType')}`} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
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
    </div>
  );
};

export default RegisterStoreStep2;
