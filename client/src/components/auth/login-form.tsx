import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  username: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [resetEmail, setResetEmail] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(
      { username: data.username, password: data.password },
      {
        onSuccess: (user) => {
          toast({
            title: 'Login realizado com sucesso',
            description: 'Você será redirecionado para o dashboard.',
          });
          
          // Redirecionar com base no tipo de usuário
          const redirectPath = user.userType === 'lojista' ? '/lojista' : '/montador';
          // Usar redirecionamento direto do navegador para garantir a navegação
          window.location.href = redirectPath;
        },
      },
    );
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "Atenção",
        description: "Por favor, informe seu email para redefinir a senha.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.developmentMode && data.appLink) {
          // Modo desenvolvimento - abrir apenas deep link do aplicativo
          window.location.href = data.appLink;
          
          toast({
            title: "Redirecionando para o app",
            description: "Abrindo link de recuperação no aplicativo AmigoMontador.",
          });
        } else {
          toast({
            title: "Email enviado",
            description: "Verifique seu email e clique no link para abrir no aplicativo AmigoMontador.",
          });
        }
        
        setIsResetDialogOpen(false);
        setResetEmail("");
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao enviar email de recuperação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <div className="flex flex-col items-center space-y-2">
            <img 
              src="/logo-amigomontador.jpg" 
              alt="AmigoMontador" 
              className="w-32 h-32 object-contain rounded-2xl"
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo</h2>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-gray-700 text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <Input
                      {...field}
                      className="tech-input pl-12"
                      placeholder="seu@email.com"
                      type="email"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-gray-700 text-sm font-medium">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <PasswordInput
                      {...field}
                      className="tech-input pl-12"
                      placeholder="Digite sua senha"
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-500 text-xs" />
              </FormItem>
            )}
          />

          {/* Forgot Password */}
          <div className="text-center">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <button type="button" className="text-gray-600 text-sm bg-transparent border-none cursor-pointer hover:text-gray-800 transition-colors duration-200">
                  Esqueci minha senha
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-gray-50 border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-gray-800">Recuperação de senha</DialogTitle>
                  <DialogDescription className="text-gray-700">
                    Digite seu endereço de email para receber instruções de redefinição de senha.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Input 
                      id="reset-email" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Seu email"
                      className="col-span-4 bg-gray-100 border-gray-400 text-gray-800" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                    className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
                  >
                    {isResetting ? 'Enviando...' : 'Enviar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="tech-button group w-full"
            disabled={loginMutation.isPending}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>{loginMutation.isPending ? 'Conectando...' : 'Entrar'}</span>
              {!loginMutation.isPending && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              )}
            </span>
            {loginMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="loading-spinner"></div>
              </div>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LoginForm;
