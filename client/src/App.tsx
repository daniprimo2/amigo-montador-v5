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
  
  // Redirecionar para a página de recuperação de senha
  if (location.startsWith("/reset-password")) {
    return <ResetPasswordPage />;
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
