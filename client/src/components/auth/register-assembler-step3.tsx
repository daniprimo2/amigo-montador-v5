import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUpload from '../ui/file-upload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { baseBankAccountSchema } from '@/lib/bank-account-schema';

const assemblerStep3Schema = z.object({
  identityFront: z.any().optional(),
  identityBack: z.any().optional(),
  proofOfAddress: z.any().optional(),
  certificates: z.any().optional(),
  // Dados bancários (opcionais para cadastro)
  bankName: z.string().optional(),
  accountType: z.enum(['corrente', 'poupança']).optional(),
  accountNumber: z.string().optional(),
  agency: z.string().optional(),
  holderName: z.string().optional(),
  holderDocumentType: z.enum(['cpf', 'cnpj']).optional(),
  holderDocumentNumber: z.string().optional(),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatória', 'nenhuma']).optional(),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "Você deve concordar com os termos de serviço",
  }),
});

export type AssemblerStep3Data = z.infer<typeof assemblerStep3Schema>;

interface RegisterAssemblerStep3Props {
  onBack: () => void;
  onComplete: (data: AssemblerStep3Data) => void;
  step1Data: any;
  step2Data: any;
  defaultValues?: Partial<AssemblerStep3Data>;
}

export const RegisterAssemblerStep3: React.FC<RegisterAssemblerStep3Props> = ({ 
  onBack, 
  onComplete, 
  step1Data,
  step2Data,
  defaultValues = {} 
}) => {
  const { registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [idFrontFiles, setIdFrontFiles] = useState<FileList | null>(null);
  const [idBackFiles, setIdBackFiles] = useState<FileList | null>(null);
  const [addressFiles, setAddressFiles] = useState<FileList | null>(null);
  const [certFiles, setCertFiles] = useState<FileList | null>(null);

  const form = useForm<AssemblerStep3Data>({
    resolver: zodResolver(assemblerStep3Schema),
    defaultValues: {
      termsAgreed: false,
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

  const onSubmit = async (data: AssemblerStep3Data) => {
    try {
      console.log('=== INÍCIO DO SUBMIT ===');
      console.log('Dados do formulário:', data);
      console.log('Arquivos selecionados:', {
        idFront: idFrontFiles?.length,
        idBack: idBackFiles?.length,
        address: addressFiles?.length,
        certificates: certFiles?.length
      });

      // Verificar se os dados bancários foram preenchidos corretamente
      const hasBankData = data.bankName && data.accountNumber && data.agency && data.holderName && data.holderDocumentNumber;
      console.log('Dados bancários completos:', hasBankData);

      // Upload de documentos primeiro
      let documentUrls: Record<string, string> = {};
      
      if (idFrontFiles && idFrontFiles.length > 0 && idBackFiles && idBackFiles.length > 0 && addressFiles && addressFiles.length > 0) {
        console.log('Iniciando upload dos documentos...');
        const formData = new FormData();
        
        // Adicionar documentos obrigatórios
        formData.append('identityFront', idFrontFiles[0]);
        formData.append('identityBack', idBackFiles[0]);
        formData.append('proofOfAddress', addressFiles[0]);
        
        // Adicionar certificados se existirem
        if (certFiles && certFiles.length > 0) {
          for (let i = 0; i < certFiles.length; i++) {
            formData.append(`certificate_${i}`, certFiles[i]);
          }
        }

        // Fazer upload dos documentos
        const response = await fetch('/api/upload/documents', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro no upload:', errorText);
          throw new Error(`Erro ao fazer upload dos documentos: ${response.status}`);
        }

        const uploadResult = await response.json();
        documentUrls = uploadResult.documents;
        console.log('Upload concluído:', documentUrls);
      } else {
        toast({
          title: 'Documentos obrigatórios',
          description: 'Por favor, envie RG/CNH (frente e verso) e comprovante de residência.',
          variant: 'destructive',
        });
        return;
      }

      // Combinar dados de todos os passos
      const userData = {
        // Dados básicos do usuário
        username: step1Data.email,
        password: step1Data.password,
        name: step1Data.name,
        email: step1Data.email,
        phone: step1Data.phone,
        userType: 'montador' as const,
        
        // Dados específicos do montador
        address: step2Data.address,
        city: step2Data.city,
        state: step2Data.state,
        specialties: step2Data.specialties || [],
        technicalAssistance: step2Data.technicalAssistance || false,
        experience: step2Data.experience || '',
        radius: step2Data.radius || 20,
        
        // Documentos
        documents: documentUrls,
        termsAgreed: data.termsAgreed,
        
        // Dados bancários (apenas se estiverem preenchidos)
        bankName: data.bankName || undefined,
        accountType: data.accountType || undefined,
        accountNumber: data.accountNumber || undefined,
        agency: data.agency || undefined,
        holderName: data.holderName || undefined,
        holderDocumentType: data.holderDocumentType || undefined,
        holderDocumentNumber: data.holderDocumentNumber || undefined,
        pixKey: data.pixKey || undefined,
        pixKeyType: data.pixKeyType || undefined,
      };

      console.log('Dados do usuário para registro:', userData);

      // Registrar no backend
      registerMutation.mutate(userData, {
        onSuccess: () => {
          toast({
            title: 'Cadastro realizado com sucesso',
            description: 'Seu cadastro foi concluído! Você será redirecionado para o dashboard.',
          });
          navigate('/montador');
        },
        onError: (error: any) => {
          console.error('Erro detalhado no registro:', error);
          console.error('Tipo do erro:', typeof error);
          console.error('Stack do erro:', error?.stack);
          console.error('Response completo:', error?.response);
          console.error('Data do response:', error?.response?.data);
          
          let errorMessage = 'Erro desconhecido';
          
          // Tentar extrair a mensagem de erro de diferentes formas
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.response?.status) {
            errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Erro no servidor'}`;
          }
          
          toast({
            title: 'Erro ao cadastrar',
            description: `Erro: ${errorMessage}`,
            variant: 'destructive',
          });
        }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary bg-opacity-10">
                  Passo 3 de 3
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div style={{width: '100%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Documentação</h2>
      <p className="text-sm text-gray-500 mb-6">Faça upload dos documentos necessários para verificação.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-field">
            <FormLabel>RG/CNH (frente)</FormLabel>
            <FileUpload 
              label="RG/CNH (frente)"
              accept="image/*,application/pdf"
              onChange={(files) => {
                setIdFrontFiles(files);
                form.setValue('identityFront', files);
              }}
              helpText="PNG, JPG, PDF até 10MB"
              required={true}
            />
          </div>
          
          <div className="form-field">
            <FormLabel>RG/CNH (verso)</FormLabel>
            <FileUpload 
              label="RG/CNH (verso)"
              accept="image/*,application/pdf"
              onChange={(files) => {
                setIdBackFiles(files);
                form.setValue('identityBack', files);
              }}
              helpText="PNG, JPG, PDF até 10MB"
              required={true}
            />
          </div>
          
          <div className="form-field">
            <FormLabel>Comprovante de Residência</FormLabel>
            <FileUpload 
              label="Comprovante de Residência"
              accept="image/*,application/pdf"
              onChange={(files) => {
                setAddressFiles(files);
                form.setValue('proofOfAddress', files);
              }}
              helpText="PNG, JPG, PDF até 10MB"
              required={true}
            />
          </div>
          
          <div className="form-field">
            <FormLabel>Certificados Profissionais (opcional)</FormLabel>
            <FileUpload 
              label="Certificados Profissionais"
              accept="image/*,application/pdf"
              multiple
              onChange={(files) => {
                setCertFiles(files);
                form.setValue('certificates', files);
              }}
              helpText="PNG, JPG, PDF até 10MB (múltiplos arquivos)"
            />
          </div>
          
          <h3 className="text-lg font-semibold mt-8 mb-4">Informações Bancárias</h3>
          <p className="text-sm text-gray-500 mb-6">Preencha os dados da sua conta bancária para receber pagamentos.</p>
          
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem className="form-field">
                <FormLabel>Nome do Banco</FormLabel>
                <FormControl>
                  <Input placeholder="Exemplo: Banco do Brasil" {...field} />
                </FormControl>
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
                    <Input placeholder="Exemplo: 1234" {...field} />
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
                    <Input placeholder="Exemplo: 12345-6" {...field} />
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
            
            {form.watch('pixKeyType') && form.watch('pixKeyType') !== 'nenhuma' && (
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
                    Eu concordo com os <a href="#" className="text-primary">Termos de Serviço</a> e <a href="#" className="text-primary">Política de Privacidade</a>.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          
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

export default RegisterAssemblerStep3;
