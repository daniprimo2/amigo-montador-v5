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

const storeStep2Schema = z.object({
  storeName: z.string().min(3, 'Nome da loja deve ter pelo menos 3 caracteres'),
  zipCode: z.string().min(8, 'CEP inválido'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  addressNumber: z.string().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(2, 'Bairro deve ter pelo menos 2 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Selecione um estado'),
  storePhone: z.string().min(10, 'Telefone da loja inválido'),
  materialTypes: z.array(z.string()).min(1, 'Selecione pelo menos um tipo de material'),
  logoFile: z.any().refine(val => val != null && (val instanceof FileList && val.length > 0), {
    message: "Upload obrigatório do logotipo da loja"
  }),
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
        userType: 'lojista',
        username: step1Data.email,
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
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div style={{width: '100%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Dados da Loja</h2>
      <p className="text-sm text-gray-500 mb-6">Preencha os dados da sua loja.</p>
      
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
            name="materialTypes"
            render={() => (
              <FormItem className="form-field">
                <FormLabel>Tipo de Material</FormLabel>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox
                      id="marcenaria"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().materialTypes || [];
                        const updated = checked
                          ? [...current, 'marcenaria']
                          : current.filter(type => type !== 'marcenaria');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="marcenaria" className="ml-2 block text-sm text-gray-700">
                      Marcenaria
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="plano-corte"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().materialTypes || [];
                        const updated = checked
                          ? [...current, 'plano-corte']
                          : current.filter(type => type !== 'plano-corte');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="plano-corte" className="ml-2 block text-sm text-gray-700">
                      Plano de corte
                    </label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="fabrica"
                      onCheckedChange={(checked) => {
                        const current = form.getValues().materialTypes || [];
                        const updated = checked
                          ? [...current, 'fabrica']
                          : current.filter(type => type !== 'fabrica');
                        form.setValue('materialTypes', updated, { shouldValidate: true });
                      }}
                    />
                    <label htmlFor="fabrica" className="ml-2 block text-sm text-gray-700">
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
          
          <div className="flex gap-4">
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
