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
import { bankAccountSchema, validateCPF, validateCNPJ, detectPixKeyType, formatCPF, formatCNPJ, formatPhone } from '@/lib/bank-account-schema';
import { getBanksOrderedByName } from '@/lib/brazilian-banks';

const assemblerStep3Schema = z.object({
  identityFront: z.any().refine((files) => files && files.length > 0, {
    message: "RG/CNH (frente) é obrigatório",
  }),
  identityBack: z.any().refine((files) => files && files.length > 0, {
    message: "RG/CNH (verso) é obrigatório",
  }),
  proofOfAddress: z.any().refine((files) => files && files.length > 0, {
    message: "Comprovante de residência é obrigatório",
  }),
  certificates: z.any().optional(),
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
      pixKeyType: 'cpf',
      ...defaultValues,
    },
  });

  const onSubmit = async (data: AssemblerStep3Data) => {
    try {
      console.log('=== INÍCIO DO SUBMIT ===');
      console.log('Dados do formulário:', data);
      console.log('step1Data recebido:', step1Data);
      console.log('step2Data recebido:', step2Data);
      console.log('Cidade do step1Data:', step1Data?.city);
      console.log('Arquivos selecionados:', {
        idFront: idFrontFiles?.length,
        idBack: idBackFiles?.length,
        address: addressFiles?.length,
        certificates: certFiles?.length
      });

      // Verificar se a foto de perfil foi fornecida no step1
      if (!step1Data.profilePicture || step1Data.profilePicture.length === 0) {
        toast({
          title: 'Erro na validação',
          description: 'Foto de perfil é obrigatória',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se todos os documentos obrigatórios foram enviados
      if (!idFrontFiles || idFrontFiles.length === 0) {
        toast({
          title: 'Erro na validação',
          description: 'RG/CNH (frente) é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      if (!idBackFiles || idBackFiles.length === 0) {
        toast({
          title: 'Erro na validação',
          description: 'RG/CNH (verso) é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      if (!addressFiles || addressFiles.length === 0) {
        toast({
          title: 'Erro na validação',
          description: 'Comprovante de residência é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se os dados bancários foram preenchidos corretamente
      const hasBankData = data.bankName && data.accountNumber && data.agency && data.holderName && data.holderDocumentNumber;
      console.log('Dados bancários completos:', hasBankData);

      // Upload dos documentos obrigatórios
      console.log('Iniciando upload dos documentos...');
      let documentUrls: Record<string, string | string[]> = {};

      try {

        // Upload RG/CNH frente
        const rgFrontFormData = new FormData();
        rgFrontFormData.append('file', idFrontFiles[0]);
        const rgFrontResponse = await fetch('/api/upload', {
          method: 'POST',
          body: rgFrontFormData,
        });
        
        if (rgFrontResponse.ok) {
          const rgFrontResult = await rgFrontResponse.json();
          documentUrls.rgFrontUrl = rgFrontResult.url;
        } else {
          throw new Error('Falha no upload do RG/CNH (frente)');
        }

        // Upload RG/CNH verso
        const rgBackFormData = new FormData();
        rgBackFormData.append('file', idBackFiles[0]);
        const rgBackResponse = await fetch('/api/upload', {
          method: 'POST',
          body: rgBackFormData,
        });
        
        if (rgBackResponse.ok) {
          const rgBackResult = await rgBackResponse.json();
          documentUrls.rgBackUrl = rgBackResult.url;
        } else {
          throw new Error('Falha no upload do RG/CNH (verso)');
        }

        // Upload comprovante de residência
        const addressFormData = new FormData();
        addressFormData.append('file', addressFiles[0]);
        const addressResponse = await fetch('/api/upload', {
          method: 'POST',
          body: addressFormData,
        });
        
        if (addressResponse.ok) {
          const addressResult = await addressResponse.json();
          documentUrls.proofOfAddressUrl = addressResult.url;
        } else {
          throw new Error('Falha no upload do comprovante de residência');
        }

        // Upload certificados (opcional)
        if (certFiles && certFiles.length > 0) {
          const certificateUrls: string[] = [];
          for (let i = 0; i < certFiles.length; i++) {
            const certFormData = new FormData();
            certFormData.append('file', certFiles[i]);
            const certResponse = await fetch('/api/upload', {
              method: 'POST',
              body: certFormData,
            });
            
            if (certResponse.ok) {
              const certResult = await certResponse.json();
              certificateUrls.push(certResult.url);
            }
          }
          if (certificateUrls.length > 0) {
            documentUrls.certificatesUrls = certificateUrls;
          }
        }

        console.log('Upload dos documentos concluído:', documentUrls);
      } catch (uploadError) {
        console.error('Erro no upload dos documentos:', uploadError);
        toast({
          title: 'Erro no upload',
          description: 'Falha ao fazer upload dos documentos. Verifique os arquivos e tente novamente.',
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
        
        // Dados de documento do step1 (CPF/CNPJ para PIX)
        documentType: step1Data.documentType,
        documentNumber: step1Data.documentNumber,
        
        // Dados específicos do montador (endereço vem do step1)
        address: step1Data?.address || '',
        addressNumber: step1Data?.addressNumber || '',
        neighborhood: step1Data?.neighborhood || '',
        cep: step1Data?.zipCode || '',
        city: step1Data?.city || '',
        state: step1Data?.state || '',
        specialties: step2Data?.specialties || [],
        technicalAssistance: step2Data?.technicalAssistance || false,
        experience: step2Data?.experience || '',
        radius: step2Data?.radius || 20,
        
        // Documentos
        documents: documentUrls,
        termsAgreed: data.termsAgreed,
        
        // URLs dos documentos obrigatórios
        rgFrontUrl: documentUrls.rgFrontUrl as string,
        rgBackUrl: documentUrls.rgBackUrl as string,
        proofOfAddressUrl: documentUrls.proofOfAddressUrl as string,
        certificatesUrls: documentUrls.certificatesUrls as string[] | undefined,
        
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

      // Fazer registro usando FormData para incluir a foto de perfil
      try {
        console.log('Fazendo requisição de registro...');
        const formData = new FormData();
        
        // Adicionar a foto de perfil
        formData.append('profilePicture', step1Data.profilePicture[0]);
        
        // Adicionar todos os outros dados como JSON
        Object.entries(userData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value.toString());
            }
          }
        });
        
        const response = await fetch('/api/register', {
          method: 'POST',
          body: formData,
        });

        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', response.headers);

        if (response.ok) {
          const result = await response.json();
          console.log('Registro bem-sucedido:', result);
          
          toast({
            title: 'Cadastro realizado com sucesso',
            description: 'Seu cadastro foi concluído! Você será redirecionado para o dashboard.',
          });
          navigate('/montador');
        } else {
          const errorData = await response.text();
          console.error('Erro na resposta:', errorData);
          
          let errorMessage = `Erro ${response.status}: ${response.statusText}`;
          
          try {
            const parsedError = JSON.parse(errorData);
            if (parsedError.message) {
              errorMessage = parsedError.message;
            }
          } catch (e) {
            // Se não conseguir fazer parse do JSON, usa o texto bruto
            if (errorData) {
              errorMessage = errorData;
            }
          }

          toast({
            title: 'Erro ao cadastrar',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (fetchError) {
        console.error('Erro na requisição:', fetchError);
        toast({
          title: 'Erro ao cadastrar',
          description: 'Erro de conexão. Tente novamente.',
          variant: 'destructive',
        });
      }
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
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-black bg-gray-100">
                  Passo 3 de 3
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-muted">
              <div style={{width: '100%'}} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-black"></div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-1">Documentação</h2>
      <p className="text-sm text-muted-foreground mb-6">Faça upload dos documentos necessários para verificação.</p>
      
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
                          value = formatCNPJ(value);
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
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pixKeyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Chave PIX</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Limpar a chave PIX quando o tipo mudar
                      form.setValue('pixKey', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            
            <FormField
              control={form.control}
              name="pixKey"
              render={({ field }) => {
                const pixKeyType = form.watch('pixKeyType');
                
                const getPlaceholder = () => {
                  switch (pixKeyType) {
                    case 'cpf': return '123.456.789-00';
                    case 'cnpj': return '12.345.678/0001-90';
                    case 'email': return 'exemplo@email.com';
                    case 'telefone': return '(11) 99999-9999';
                    case 'aleatória': return '12345678-1234-1234-1234-123456789012';
                    default: return 'Selecione o tipo de chave primeiro';
                  }
                };
                
                return (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={getPlaceholder()}
                        disabled={!pixKeyType}
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value;
                          
                          // Formatação automática baseada no tipo
                          switch (pixKeyType) {
                            case 'cpf':
                              value = value.replace(/[^\d]/g, '');
                              value = formatCPF(value);
                              break;
                            case 'cnpj':
                              value = value.replace(/[^\d]/g, '');
                              value = formatCNPJ(value);
                              break;
                            case 'telefone':
                              value = value.replace(/[^\d]/g, '');
                              value = formatPhone(value);
                              break;
                            case 'email':
                              // Apenas remover espaços para email
                              value = value.replace(/\s/g, '');
                              break;
                            case 'aleatória':
                              // Permitir apenas caracteres válidos para UUID
                              value = value.replace(/[^0-9a-fA-F\-]/g, '');
                              break;
                          }
                          
                          field.onChange(value);
                          
                          // Detecção automática de tipo se não estiver definido
                          if (!pixKeyType && value) {
                            const detectedType = detectPixKeyType(value);
                            if (detectedType && ['cpf', 'cnpj', 'email', 'telefone', 'aleatória'].includes(detectedType)) {
                              form.setValue('pixKeyType', detectedType as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatória');
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
