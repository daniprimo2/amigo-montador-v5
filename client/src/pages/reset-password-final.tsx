import { useEffect, useState } from 'react';

function ResetPasswordFinal() {
  const [token, setToken] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      setIsValidating(false);
      setMessage('Token de recuperação não encontrado na URL.');
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
        setMessage('Token válido. Você pode redefinir sua senha.');
      } else {
        setIsValidToken(false);
        setMessage(data.message || 'Token inválido ou expirado.');
      }
    } catch (error) {
      setIsValidToken(false);
      setMessage('Erro ao validar token. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/password-reset/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.ok) {
        alert('Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => window.location.href = '/auth', 2000);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Erro ao redefinir senha.');
      }
    } catch (error) {
      alert('Erro de conexão. Tente novamente.');
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
          <p className="text-gray-600 text-sm">Digite sua nova senha abaixo</p>
        </div>
        
        {isValidating ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Validando token...</p>
          </div>
        ) : !isValidToken ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 text-red-500 mx-auto mb-4">❌</div>
            <p className="text-red-600 mb-4">{message}</p>
            <button 
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-6 p-3 bg-green-50 rounded-lg">
              <span className="w-5 h-5 text-green-600 mr-2">✅</span>
              <p className="text-green-700 text-sm">{message}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Digite sua nova senha"
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Confirme sua nova senha"
                  minLength={6}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md disabled:opacity-50"
                disabled={isResetting}
              >
                {isResetting ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </form>

            <div className="text-center mt-6">
              <button 
                onClick={() => window.location.href = '/auth'}
                className="text-gray-600 text-sm hover:text-gray-800"
              >
                Voltar ao Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordFinal;