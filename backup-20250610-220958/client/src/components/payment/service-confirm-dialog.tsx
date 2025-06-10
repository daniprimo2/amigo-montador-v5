import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

interface ServiceConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: number;
  serviceTitle: string;
  onConfirmed: () => void; // Callback when service is confirmed
}

export const ServiceConfirmDialog: React.FC<ServiceConfirmDialogProps> = ({
  open,
  onClose,
  serviceId,
  serviceTitle,
  onConfirmed,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");

  // Mutation para confirmar o serviço
  const confirmServiceMutation = useMutation({
    mutationFn: async () => {
      setStatus("loading");
      const response = await apiRequest({
        method: "PATCH",
        url: `/api/services/${serviceId}/confirm-assembler`,
      });
      
      if (!response.ok) {
        throw new Error("Falha ao confirmar serviço");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar os dados da aplicação após confirmar o serviço
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/active"] });
      setStatus("success");
      
      // Notificar usuário
      toast({
        title: "Serviço confirmado com sucesso!",
        description: "Você pode agora prosseguir para o pagamento.",
      });
      
      // Execute o callback para indicar que foi confirmado
      setTimeout(() => {
        onConfirmed();
        onClose();
      }, 1500);
    },
    onError: (error) => {
      console.error("Erro ao confirmar serviço:", error);
      setStatus("error");
      
      toast({
        title: "Erro ao confirmar serviço",
        description: "Ocorreu um problema ao tentar confirmar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para confirmar o serviço
  const handleConfirmService = () => {
    confirmServiceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "pending" && "Confirmar Serviço"}
            {status === "loading" && "Processando..."}
            {status === "success" && "Serviço Confirmado"}
            {status === "error" && "Erro na Confirmação"}
          </DialogTitle>
          <DialogDescription>
            {status === "pending" && 
              `Você está prestes a confirmar o serviço "${serviceTitle}". Após confirmar, você poderá prosseguir para o pagamento.`
            }
            {status === "loading" && 
              "Processando sua confirmação..."
            }
            {status === "success" && 
              "Confirmação realizada com sucesso!"
            }
            {status === "error" && 
              "Houve um problema ao processar sua confirmação. Tente novamente."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4">
          {status === "pending" && (
            <div className="w-full">
              <Button 
                className="w-full mb-2" 
                onClick={handleConfirmService}
              >
                Confirmar Serviço
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center">
                Processando confirmação...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-center mb-2">
                Serviço confirmado com sucesso!
              </p>
              <p className="text-sm text-gray-500 text-center mb-4">
                Você será redirecionado para finalizar o pagamento.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="w-full">
              <Button 
                className="w-full mb-2" 
                onClick={handleConfirmService}
              >
                Tentar Novamente
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};