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
import { Calendar, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HireAssemblerDialogProps {
  open: boolean;
  onClose: () => void;
  serviceId: number;
  assemblerId?: number;
}

export const HireAssemblerDialog: React.FC<HireAssemblerDialogProps> = ({
  open,
  onClose,
  serviceId,
  assemblerId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<"editing" | "loading" | "success" | "error">("editing");
  
  // Buscar detalhes do serviço atual
  const { data: service, isLoading } = useQuery({
    queryKey: [`/api/services/${serviceId}`],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar os detalhes do serviço");
      }
      return response.json();
    },
  });
  
  // Inicializar os campos com os valores atuais do serviço quando disponíveis
  useEffect(() => {
    if (service) {
      // Remover o "R$" e converter a vírgula para ponto para o input
      const priceValue = service.price.replace("R$", "").trim().replace(",", ".");
      setPrice(priceValue);
      
      // Se o serviço já tem uma data, converter para objeto Date
      if (service.date) {
        try {
          // Esperando formato como "DD/MM/YYYY"
          const parts = service.date.split("/");
          if (parts.length === 3) {
            const newDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(newDate.getTime())) {
              setDate(newDate);
            }
          }
        } catch (error) {
          console.error("Erro ao converter data:", error);
        }
      }
    }
  }, [service]);
  
  // Mutation para atualizar o serviço e iniciar processo de contratação
  const hireAssemblerMutation = useMutation({
    mutationFn: async () => {
      setStatus("loading");
      
      // Formatar o preço para o formato correto (com ponto como separador decimal)
      const formattedPrice = price.replace(",", ".");
      
      // Formatar a data para o formato esperado pelo backend (DD/MM/YYYY)
      const formattedDate = date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "";
      
      // Enviar a atualização do serviço
      const response = await apiRequest({
        method: "PATCH",
        url: `/api/services/${serviceId}`,
        data: {
          price: formattedPrice,
          date: formattedDate,
          status: "in-progress" // Alterar o status para "em andamento"
        },
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar o serviço");
      }
      
      return await response.json();
    },
    onSuccess: async (updatedService) => {
      setStatus("success");
      
      // Criar uma mensagem no chat para informar o montador sobre as alterações
      try {
        // Formatando o valor para exibição no chat
        const formattedPrice = formatDisplayPrice(price);
        // Formatando a data para exibição no chat
        const formattedDate = date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "";
        
        // Enviar mensagem automática no chat para informar o montador
        const chatMessageResponse = await fetch(`/api/services/${serviceId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: `[NOTIFICAÇÃO AUTOMÁTICA]\n\nVocê foi contratado para este serviço!\n\nValor atualizado: ${formattedPrice}\nData de início: ${formattedDate}\n\nPor favor, confirme a aceitação destas condições respondendo a esta mensagem.`
          }),
        });
        
        if (!chatMessageResponse.ok) {
          console.error("Erro ao enviar mensagem automática de contratação");
        } else {
          console.log("Mensagem automática de contratação enviada com sucesso");
        }
      } catch (error) {
        console.error("Erro ao enviar mensagem automática:", error);
      }
      
      // Atualizar os dados da aplicação após contratar o montador
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/services/with-applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/messages`] });
      
      // Mostrar mensagem de sucesso ao usuário
      toast({
        title: "Montador contratado com sucesso!",
        description: "O serviço foi atualizado e o montador foi notificado.",
      });
      
      // Fechar o diálogo após um pequeno atraso para mostrar a mensagem de sucesso
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error("Erro ao contratar montador:", error);
      setStatus("error");
      
      toast({
        title: "Erro ao contratar montador",
        description: "Ocorreu um problema ao tentar contratar o montador. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Função para confirmar a contratação
  const handleHireAssembler = () => {
    // Validar os dados antes de enviar
    if (!price.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o valor do serviço.",
        variant: "destructive",
      });
      return;
    }
    
    if (!date) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione a data de início do serviço.",
        variant: "destructive",
      });
      return;
    }
    
    // Iniciar a mutation para contratar o montador
    hireAssemblerMutation.mutate();
  };
  
  // Formatar o preço para exibição (com R$ e vírgula)
  const formatDisplayPrice = (value: string) => {
    if (!value) return "R$ 0,00";
    
    // Converter para número e formatar
    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue)) return "R$ 0,00";
    
    return `R$ ${numValue.toFixed(2).replace(".", ",")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "editing" && "Contratar Montador"}
            {status === "loading" && "Processando..."}
            {status === "success" && "Montador Contratado"}
            {status === "error" && "Erro na Contratação"}
          </DialogTitle>
          <DialogDescription>
            {status === "editing" && 
              "Confirme os detalhes do serviço para contratar o montador."
            }
            {status === "loading" && 
              "Processando sua solicitação..."
            }
            {status === "success" && 
              "O montador foi contratado com sucesso!"
            }
            {status === "error" && 
              "Houve um problema ao processar sua solicitação. Tente novamente."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 p-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {status === "editing" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="price">Valor do serviço</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        R$
                      </span>
                      <Input
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-8"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Valor atual: {formatDisplayPrice(service?.price || "0")}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Data de início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-gray-500">
                      Data atual: {service?.date || "Não definida"}
                    </p>
                  </div>
                </>
              )}

              {status === "loading" && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-center">
                    Atualizando os detalhes do serviço e notificando o montador...
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <div className="text-center space-y-2">
                    <p className="font-medium">
                      Montador contratado com sucesso!
                    </p>
                    <p className="text-sm text-gray-500">
                      O montador foi notificado e o serviço agora está em andamento.
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center py-8">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-center">
                    Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {status === "editing" && (
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleHireAssembler}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Contratar Montador
            </Button>
          </DialogFooter>
        )}

        {status === "error" && (
          <DialogFooter>
            <Button 
              onClick={() => setStatus("editing")}
              variant="outline"
            >
              Tentar Novamente
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};