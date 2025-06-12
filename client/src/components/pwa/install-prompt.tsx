import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export function InstallPrompt() {
  const { isInstallable, installPWA, isInstalled } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show install prompt after 30 seconds if installable and not dismissed
    const timer = setTimeout(() => {
      if (isInstallable && !isInstalled && !dismissed) {
        setIsVisible(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    try {
      await installPWA();
      setIsVisible(false);
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (!isInstallable || isInstalled || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-blue-200 bg-blue-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900">
                Instalar Amigo Montador
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                Adicione o app à sua tela inicial para acesso rápido e notificações.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Agora não
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0 h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}