import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhatsAppSupport } from "@/components/ui/whatsapp-support";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import StoreDashboardPage from "@/pages/store-dashboard-page";
import AssemblerDashboardPage from "@/pages/assembler-dashboard-page";
import UserProfilePage from "@/pages/user-profile-page";
import ResetPasswordPage from "@/pages/reset-password-final";
import TestResetPage from "@/pages/test-reset";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { usePasswordResetDeepLink } from "./hooks/use-deep-links";

function Router() {
  const [location] = useLocation();
  
  // Ativar detecção de deep links para recuperação de senha
  usePasswordResetDeepLink();
  
  // Renderização direta para páginas específicas
  if (location === "/test-reset") {
    return <TestResetPage />;
  }
  
  // Redirecionamento: recuperação de senha apenas via app móvel
  if (location.startsWith("/reset-password")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🔗 Recuperação de Senha</h1>
          <p className="text-gray-600 mb-6">
            A recuperação de senha funciona exclusivamente através do aplicativo móvel AmigoMontador.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              📱 Abra este link no seu dispositivo móvel com o app AmigoMontador instalado.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/auth'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      <ProtectedRoute path="/lojista" component={StoreDashboardPage} />
      <ProtectedRoute path="/montador" component={AssemblerDashboardPage} />
      <Route path="/profile/:userId" component={UserProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
        <WhatsAppSupport />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
