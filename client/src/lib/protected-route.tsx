import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import * as React from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [forceUpdate, setForceUpdate] = React.useState(0);

  // Efeito para escutar eventos de login e registro
  React.useEffect(() => {
    const handleLoginSuccess = () => {
      console.log('ProtectedRoute: detectou evento auth:login-success');
      setForceUpdate(prev => prev + 1);
    };

    const handleRegisterSuccess = () => {
      console.log('ProtectedRoute: detectou evento auth:register-success');
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('auth:login-success', handleLoginSuccess);
    window.addEventListener('auth:register-success', handleRegisterSuccess);

    return () => {
      window.removeEventListener('auth:login-success', handleLoginSuccess);
      window.removeEventListener('auth:register-success', handleRegisterSuccess);
    };
  }, []);

  // Log para depuração
  React.useEffect(() => {
    console.log('ProtectedRoute para', path, ': user =', user, 'isLoading =', isLoading, 'forceUpdate =', forceUpdate);
  }, [path, user, isLoading, forceUpdate]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: redirecionando para /auth porque user =', user);
    
    // Se estamos em uma rota protegida e não temos usuário, redirecionar para /auth
    if (window.location.pathname.includes('/lojista') || window.location.pathname.includes('/montador')) {
      window.location.href = '/auth';
      return null;
    }
    
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  console.log('ProtectedRoute: renderizando componente para', path);
  return <Route path={path} component={Component} />;
}
