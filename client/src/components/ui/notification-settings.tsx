import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Switch } from "./switch";
import { Label } from "./label";
import { Badge } from "./badge";
import { AlertCircle, Bell, BellOff, Smartphone, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    testNotification,
    error
  } = usePushNotifications();
  
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: "Notificações desativadas",
          description: "Você não receberá mais notificações push.",
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá notificações sobre novos serviços e mensagens.",
        });
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    const success = await testNotification();
    
    if (success) {
      toast({
        title: "Notificação enviada",
        description: "Verifique se a notificação apareceu.",
      });
    } else {
      toast({
        title: "Erro ao testar",
        description: "Não foi possível enviar a notificação de teste.",
        variant: "destructive"
      });
    }
    setTesting(false);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Para receber notificações, use um navegador moderno como Chrome, Firefox ou Safari
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
          {isSubscribed && (
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receba notificações instantâneas sobre novos serviços, mensagens e atualizações importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Ativar notificações push
            </Label>
            <p className="text-sm text-muted-foreground">
              Receba alertas mesmo quando o app não estiver aberto
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading}
          />
        </div>

        {/* Configurações específicas */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm text-muted-foreground">TIPOS DE NOTIFICAÇÃO</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Novos serviços</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando aparecem serviços na sua região
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Mensagens</Label>
                  <p className="text-xs text-muted-foreground">
                    Novas mensagens de clientes ou montadores
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Status do serviço</Label>
                  <p className="text-xs text-muted-foreground">
                    Atualizações sobre seus serviços
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Pagamentos</Label>
                  <p className="text-xs text-muted-foreground">
                    Confirmações de pagamento recebido
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        )}

        {/* Teste de notificação */}
        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleTestNotification}
              disabled={testing}
              variant="outline"
              className="w-full"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {testing ? "Enviando..." : "Testar notificação"}
            </Button>
          </div>
        )}

        {/* Exibir erro se houver */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• As notificações funcionam mesmo com o app fechado</p>
          <p>• Você pode desativar a qualquer momento</p>
          <p>• Respeitamos sua privacidade - apenas notificações relevantes</p>
        </div>
      </CardContent>
    </Card>
  );
}