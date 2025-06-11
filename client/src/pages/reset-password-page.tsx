import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle, XCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A confirmação de senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Extrair token da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      setIsValidating(false);
      setTokenMessage('Token de recuperação não encontrado na URL.');
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, []);

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`/api/password-reset/verify/${tokenToValidate}`);
      const data = await response.json();

      if (data.valid) {
        setIsValidToken(true);
        setTokenMessage('Token válido. Você pode redefinir sua senha.');
      } else {
        setIsValidToken(false);
        setTokenMessage(data.message || 'Token inválido ou expirado.');
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setIsValidToken(false);
      setTokenMessage('Erro ao validar token. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: "Erro",
        description: "Token não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/password-reset/reset', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        toast({
          title: "Sucesso",
          description: responseData.message,
        });

        // Redirecionar para a página de login após 2 segundos
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao redefinir senha.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo-amigomontador.jpg" 
              alt="AmigoMontador" 
              className="w-24 h-24 object-contain rounded-xl"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Redefinir Senha</h2>
          <p className="text-gray-600 text-sm">
            Digite sua nova senha abaixo
          </p>
        </div>

        {/* Validação do Token */}
        {isValidating ? (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Validando token...</p>
          </div>
        ) : !isValidToken ? (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{tokenMessage}</p>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <>
            {/* Status do Token */}
            <div className="flex items-center justify-center mb-6 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{tokenMessage}</p>
            </div>

            {/* Formulário */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Nova Senha */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-gray-700 text-sm font-medium">Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                          <PasswordInput
                            {...field}
                            className="tech-input pl-12"
                            placeholder="Digite sua nova senha"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Confirmar Senha */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-gray-700 text-sm font-medium">Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                          <PasswordInput
                            {...field}
                            className="tech-input pl-12"
                            placeholder="Confirme sua nova senha"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Botão de Envio */}
                <Button 
                  type="submit" 
                  className="tech-button w-full"
                  disabled={isResetting}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>{isResetting ? 'Redefinindo...' : 'Redefinir Senha'}</span>
                  </span>
                  {isResetting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="loading-spinner"></div>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            {/* Link para voltar */}
            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => navigate('/auth')}
                className="text-gray-600 text-sm bg-transparent border-none cursor-pointer hover:text-gray-800 transition-colors duration-200"
              >
                Voltar ao Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;