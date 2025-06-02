import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X, Star } from "lucide-react";
import { RatingDialog } from "@/components/rating/rating-dialog";

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
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [assemblerInfo, setAssemblerInfo] = useState<{userId: number, name: string} | null>(null);
  const [serviceTitle, setServiceTitle] = useState<string>("");
  
  // Buscar informações do serviço para obter os dados do montador
  const { data: serviceData } = useQuery({
    queryKey: [`/api/services/${serviceId}`],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar os detalhes do serviço");
      }
      return response.json();
    },
    enabled: !!serviceId,
  });
  
  // Quando os dados do serviço estiverem disponíveis, buscar detalhes do montador
  useEffect(() => {
    if (serviceData) {
      if (serviceData.assembler) {
        setAssemblerInfo({
          userId: serviceData.assembler.userId,
          name: serviceData.assembler.name
        });
      }
      setServiceTitle(serviceData.title || "Serviço");
    }
  }, [serviceData]);

  // Simulação de pagamento - na implementação real, isso seria verificado pelo backend
  const simulatePayment = () => {
    console.log("[PaymentDialog] Simulando pagamento para serviço:", serviceId);
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
    onSuccess: (data) => {
      console.log("[PaymentDialog] Serviço finalizado com sucesso:", data);
      
      // Atualizar os dados da aplicação após finalizar o serviço
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/pending-evaluations"] });
      
      toast({
        title: "Serviço finalizado com sucesso!",
        description: "O pagamento foi confirmado e o serviço foi marcado como concluído.",
      });
      
      // Abrir a tela de avaliação automaticamente após um pequeno delay
      setTimeout(() => {
        console.log("[PaymentDialog] Abrindo tela de avaliação obrigatória");
        setShowRatingDialog(true);
      }, 1000);
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
  
  // Função para lidar com o fechamento da avaliação
  const handleRatingComplete = () => {
    setShowRatingDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showRatingDialog} onOpenChange={(value) => {
        if (!value && paymentStatus === "success" && !completeServiceMutation.isPending) {
          // Se o usuário tentar fechar o diálogo de pagamento após o pagamento bem-sucedido,
          // mostrar a tela de avaliação em vez de fechar completamente
          setShowRatingDialog(true);
        } else if (!value) {
          onClose();
        }
      }}>
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm mb-4 w-full">
                  <span className="font-semibold">⚠️ Próximo passo:</span> Após finalizar o serviço, você será convidado a avaliar o montador.
                </div>
                <Button 
                  className="w-full"
                  onClick={handleConfirmPayment}
                  disabled={completeServiceMutation.isPending}
                >
                  {completeServiceMutation.isPending ? "Finalizando..." : "Finalizar Serviço"}
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
      
      {/* Diálogo de Avaliação que aparece após finalizar o serviço */}
      {assemblerInfo && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          serviceId={serviceId}
          toUserId={assemblerInfo.userId}
          toUserName={assemblerInfo.name}
          serviceName={serviceTitle}
          onSuccess={handleRatingComplete}
        />
      )}
    </>
  );
};