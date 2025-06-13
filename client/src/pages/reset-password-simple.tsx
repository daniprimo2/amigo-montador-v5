import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const ResetPasswordSimple = () => {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Erro",
        description: "Token não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
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
          newPassword,
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

        setTimeout(() => {
          window.location.href = '/auth';
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

        {isValidating ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Validando token...</p>
          </div>
        ) : !isValidToken ? (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{tokenMessage}</p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-6 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{tokenMessage}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-12 pr-12"
                    placeholder="Digite sua nova senha"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 pr-12"
                    placeholder="Confirme sua nova senha"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => window.location.href = '/auth'}
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

export default ResetPasswordSimple;