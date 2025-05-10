import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X } from "lucide-react";

// URL de um QR code fictício para simulação
const MOCK_QR_CODE_URL = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://amigomontador.com.br/pagamento/123456";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: number;
  amount: string;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  serviceId,
  amount,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");

  // Simulação de pagamento - na implementação real, isso seria verificado pelo backend
  const simulatePayment = () => {
    setPaymentStatus("success");
  };

  // Mutation para finalizar o serviço
  const completeServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: "PATCH",
        url: `/api/services/${serviceId}/complete`,
      });
      
      if (!response.ok) {
        throw new Error("Falha ao finalizar serviço");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Atualizar os dados da aplicação após finalizar o serviço
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/active"] });
      toast({
        title: "Serviço finalizado com sucesso!",
        description: "O pagamento foi confirmado e o serviço foi marcado como concluído.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao finalizar serviço:", error);
      toast({
        title: "Erro ao finalizar serviço",
        description: "Ocorreu um problema ao tentar finalizar o serviço. Tente novamente.",
        variant: "destructive",
      });
      setPaymentStatus("error");
    },
  });

  // Função para confirmar o pagamento e finalizar o serviço
  const handleConfirmPayment = () => {
    completeServiceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paymentStatus === "pending" && "Pagamento via QR Code"}
            {paymentStatus === "success" && "Pagamento Confirmado"}
            {paymentStatus === "error" && "Erro no Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {paymentStatus === "pending" && 
              `Escaneie o QR code abaixo para realizar o pagamento de ${amount}.`
            }
            {paymentStatus === "success" && 
              "Seu pagamento foi processado com sucesso!"
            }
            {paymentStatus === "error" && 
              "Houve um problema ao processar seu pagamento. Tente novamente."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4">
          {paymentStatus === "pending" && (
            <>
              <div className="border p-2 rounded-lg mb-4">
                <img src={MOCK_QR_CODE_URL} alt="QR Code de Pagamento" width={200} height={200} />
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Após escanear o código, confirme o pagamento no aplicativo do seu banco.
              </p>
              <div className="mt-4 w-full">
                <Button 
                  className="w-full mb-2" 
                  onClick={simulatePayment}
                >
                  Simular Pagamento
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}

          {paymentStatus === "success" && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-center mb-6">
                O pagamento de {amount} foi confirmado com sucesso!
              </p>
              <Button 
                className="w-full"
                onClick={handleConfirmPayment}
              >
                Finalizar Serviço
              </Button>
            </div>
          )}

          {paymentStatus === "error" && (
            <div className="flex flex-col items-center">
              <X className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-center mb-6">
                Ocorreu um erro ao processar o pagamento. Tente novamente.
              </p>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => setPaymentStatus("pending")}
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};