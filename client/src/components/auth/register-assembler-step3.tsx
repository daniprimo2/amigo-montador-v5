import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import FileUpload from '../ui/file-upload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

const assemblerStep3Schema = z.object({
  identityFront: z.any().optional(),
  identityBack: z.any().optional(),
  proofOfAddress: z.any().optional(),
  certificates: z.any().optional(),
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
      ...defaultValues,
    },
  });

  const onSubmit = async (data: AssemblerStep3Data) => {
    try {
      // Simular upload de arquivos
      let documentUrls: Record<string, string> = {};
      
      if (idFrontFiles && idFrontFiles.length > 0) {
        documentUrls.identityFront = URL.createObjectURL(idFrontFiles[0]);
      }
      
      if (idBackFiles && idBackFiles.length > 0) {
        documentUrls.identityBack = URL.createObjectURL(idBackFiles[0]);
      }
      
      if (addressFiles && addressFiles.length > 0) {
        documentUrls.proofOfAddress = URL.createObjectURL(addressFiles[0]);
      }
      
      if (certFiles && certFiles.length > 0) {
        documentUrls.certificates = Array.from(certFiles).map(file => URL.createObjectURL(file));
      }

      // Combinar dados de todos os passos
      const userData = {
        ...step1Data,
        ...step2Data,
        documents: documentUrls,
        termsAgreed: data.termsAgreed,
        userType: 'montador',
        username: step1Data.email,
      };

      // Registrar no backend
      registerMutation.mutate(userData, {
        onSuccess: () => {
          toast({
            title: 'Cadastro realizado com sucesso',
            description: 'Seu cadastro foi concluído! Você será redirecionado para o dashboard.',
          });
          navigate('/montador');
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
          
          <FormField
            control={form.control}
            name="termsAgreed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
