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
import { ArrowLeft } from 'lucide-react';
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
          console.log('Usuário logado:', user);
          const redirectPath = user.userType === 'lojista' ? '/lojista' : '/montador';
          console.log('Redirecionando para:', redirectPath);
          
          // Usar setTimeout para garantir que o redirecionamento aconteça após o estado ser atualizado
          setTimeout(() => {
            navigate(redirectPath);
          }, 100);
        },
      },
    );
  };

  const handlePasswordReset = () => {
    if (!resetEmail) {
      toast({
        title: "Atenção",
        description: "Por favor, informe seu email para redefinir a senha.",
        variant: "destructive",
      });
      return;
    }

    // Simulando o envio do email de redefinição
    toast({
      title: "Email enviado",
      description: "Instruções para redefinição de senha foram enviadas para seu email.",
    });

    setIsResetDialogOpen(false);
    setResetEmail("");
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <button 
          type="button"
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">Voltar</span>
        </button>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Bem vindo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Preencha as informações abaixo para acessar sua conta.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    className="round-input"
                    placeholder="Email"
                    type="email"
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
              <FormItem>
                <FormControl>
                  <PasswordInput
                    {...field}
                    className="round-input"
                    placeholder="Senha"
                    showCounter
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-center">
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <button type="button" className="text-indigo-600 text-sm bg-transparent border-none cursor-pointer hover:underline">
                  Esqueci minha senha
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Recuperação de senha</DialogTitle>
                  <DialogDescription>
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
                      className="col-span-4" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handlePasswordReset}>Enviar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Button 
            type="submit" 
            className="auth-button"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LoginForm;
