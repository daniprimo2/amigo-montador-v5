import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface DeepLinkHandler {
  onResetPassword?: (token: string) => void;
}

export function useDeepLinks(handlers: DeepLinkHandler = {}) {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Função para processar deep links
    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const params = new URLSearchParams(urlObj.search);

        // Tratar diferentes tipos de deep links
        if (path === '/reset-password') {
          const token = params.get('token');
          if (token) {
            if (handlers.onResetPassword) {
              handlers.onResetPassword(token);
            } else {
              // Navegar para a página de redefinição de senha
              navigate(`/reset-password?token=${token}`);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao processar deep link:', error);
      }
    };

    // Verificar se foi aberto via deep link na inicialização
    const checkInitialUrl = () => {
      // Para ambiente web, verificar parâmetros da URL atual
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.href;
        if (currentUrl.includes('reset-password')) {
          handleDeepLink(currentUrl);
        }
      }
    };

    checkInitialUrl();

    // Cleanup não é necessário para este caso de uso
    return () => {};
  }, [handlers, navigate]);
}

// Hook específico para recuperação de senha
export function usePasswordResetDeepLink() {
  const [, navigate] = useLocation();

  useDeepLinks({
    onResetPassword: (token: string) => {
      // Navegar para a página de redefinição com o token
      navigate(`/reset-password?token=${token}`);
    }
  });
}