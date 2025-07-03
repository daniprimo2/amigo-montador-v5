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
import { Calendar, DollarSign, Loader2, CheckCircle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { RatingStars } from "@/components/rating/rating-stars";

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
  
  // Buscar dados do montador para exibir avaliação
  const { data: assemblerData } = useQuery({
    queryKey: [`/api/assemblers/${assemblerId}`],
    queryFn: async () => {
      if (!assemblerId) return null;
      
      const response = await fetch(`/api/assemblers/${assemblerId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do montador");
      }
      return response.json();
    },
    enabled: !!assemblerId,
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
      
      // Enviar a solicitação de contratação (que inclui aceitação da candidatura)
      const response = await apiRequest({
        method: "POST",
        url: `/api/services/${serviceId}/hire`,
        data: {
          assemblerId: assemblerId,
          price: formattedPrice,
          date: formattedDate
        },
      });
      
      if (!response.ok) {
        throw new Error("Falha ao contratar o montador");
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
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader className="pb-6 border-b border-gray-100">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            {status === "editing" && (
              <>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                Contratar Montador
              </>
            )}
            {status === "loading" && (
              <>
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                </div>
                Processando...
              </>
            )}
            {status === "success" && (
              <>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                Montador Contratado
              </>
            )}
            {status === "error" && (
              <>
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                Erro na Contratação
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {status === "editing" && 
              "Confirme os detalhes do serviço para contratar o montador selecionado."
            }
            {status === "loading" && 
              "Aguarde enquanto processamos sua solicitação..."
            }
            {status === "success" && 
              "O montador foi contratado com sucesso e já foi notificado!"
            }
            {status === "error" && 
              "Houve um problema ao processar sua solicitação. Tente novamente."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-6 pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {status === "editing" && (
                <>
                  {/* Informações do montador com avaliação */}
                  {assemblerData && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(assemblerData.user?.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{assemblerData.user?.name || 'Montador'}</h3>
                            <p className="text-sm text-gray-600">Montador Profissional</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 border border-yellow-200">
                          <RatingStars
                            rating={assemblerData.rating || 0}
                            size="sm"
                          />
                          <span className="text-sm font-semibold text-yellow-700">
                            {assemblerData.rating ? assemblerData.rating.toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-medium">Especialidades:</span>
                          <span>{assemblerData.specialties?.join(', ') || 'Não informadas'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Região:</span>
                          <span>{assemblerData.city} - {assemblerData.state}</span>
                        </div>
                      </div>
                    </div>
                  )}
                
                  <div className="space-y-3">
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                      Valor do serviço
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-semibold">
                        R$
                      </span>
                      <Input
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-10 h-11 border-gray-200 hover:border-green-300 focus:border-green-500 focus:ring-green-500 transition-colors"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700 font-medium">
                        💰 Valor atual: {formatDisplayPrice(service?.price || "0")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                      Data de início do serviço
                    </Label>
                    
                    {/* Display selected date */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Data selecionada
                          </p>
                          <p className="text-base font-semibold text-blue-900">
                            {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Nenhuma data selecionada"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Calendar Component - Always visible */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                      <div className="flex justify-center">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          locale={ptBR}
                          disabled={(date) => date < new Date()}
                          className="rounded-lg mx-auto"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4 w-full",
                            caption: "flex justify-center pt-1 relative items-center mb-4",
                            caption_label: "text-lg font-semibold text-gray-800",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-8 w-8 bg-gray-100 hover:bg-gray-200 rounded-full p-0 opacity-70 hover:opacity-100 transition-all duration-200",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex w-full",
                            head_cell: "text-gray-500 rounded-md w-10 font-medium text-sm flex-1 text-center py-2",
                            row: "flex w-full mt-1",
                            cell: "text-center text-sm p-0 relative flex-1 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-10 w-10 p-0 font-medium aria-selected:opacity-100 hover:bg-blue-100 hover:text-blue-900 rounded-lg transition-all duration-200 mx-auto",
                            day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white shadow-md",
                            day_today: "bg-gray-100 text-gray-900 font-bold border-2 border-blue-300",
                            day_outside: "text-gray-300 opacity-50",
                            day_disabled: "text-gray-300 opacity-30 cursor-not-allowed",
                            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                          }}
                        />
                      </div>
                    </div>
                    
                    {service?.date && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-700 font-medium">
                          📅 Data atual do serviço: {format(new Date(service.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
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
          <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleHireAssembler}
              disabled={isLoading}
              className="h-11 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Contratar Montador
                </>
              )}
            </Button>
          </DialogFooter>
        )}

        {status === "error" && (
          <DialogFooter className="pt-6 border-t border-gray-100">
            <Button 
              onClick={() => setStatus("editing")}
              variant="outline"
              className="h-11 px-6 border-red-300 text-red-700 hover:bg-red-50 transition-colors"
            >
              Tentar Novamente
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};