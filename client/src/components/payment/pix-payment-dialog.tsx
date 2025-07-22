import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Check, AlertCircle, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { RatingDialog } from '@/components/rating/rating-dialog';
import { MandatoryRatingDialog } from '@/components/rating/mandatory-rating-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';


interface PixPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  amount: string;
  serviceTitle: string;
  assemblerInfo?: {
    id: number;
    name: string;
    userId: number;
  };
}

interface PixPaymentData {
  pixCode: string;
  qrCode: string;
  reference: string;
  amount: number;
  expiresAt: string;
  paymentId: string;
}

export function PixPaymentDialog({
  isOpen,
  onClose,
  serviceId,
  amount,
  serviceTitle,
  assemblerInfo
}: PixPaymentDialogProps) {
  const [step, setStep] = useState<'generate' | 'payment' | 'proof' | 'rating'>('generate');
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [paymentProof, setPaymentProof] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [currentToken, setCurrentToken] = useState<string>('');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showMandatoryRating, setShowMandatoryRating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [pixCode, setPixCode] = useState('');
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // The amount should be displayed exactly as stored in the service
  const actualAmount = amount;
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate PIX token
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/token'
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setCurrentToken(data.token);
        createPixPayment();
      } else {
        toast({
          title: "Erro",
          description: "Falha ao gerar token de autenticação PIX",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o sistema de pagamentos",
        variant: "destructive"
      });
    }
  });

  // Check PIX payment status
  const checkPaymentStatusMutation = useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string; }) => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/simulate-confirm',//'/api/payment/pix/status',
        data: { serviceId: paymentId }
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log(data)
      if (data.success && data.isCompleted) {
        setPaymentCompleted(true);
        setIsCheckingPayment(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Automatically send payment proof to chat
        // sendAutomaticPaymentProof(data.paymentData);

        toast({
          title: "Pagamento Confirmado!",
          description: "Seu pagamento PIX foi confirmado automaticamente. Agora você deve avaliar o montador.",
        });

        // Show mandatory rating dialog immediately after payment confirmation
        setTimeout(() => {
          onClose();
          setShowMandatoryRating(true);
        }, 2000);
      }
    },
    onError: (error) => {
      console.error("Erro ao verificar status do pagamento:", error);
    }
  });

  const validStatusPix = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/statuspix',
        data: {
          serviceId
        }
      });

      return await response.json();
    },
    onSuccess: (data: any) => {

      console.log(data);

      if (data.status) {

          
        const isPixExpired = (expiresAt: string) => {
          const expiration = new Date(expiresAt).getTime();
          const now = Date.now(); // também retorna em UTC
          return now >= expiration;
        };
 
        // setPixData(data);
        // setStep("payment");
        // setIsCheckingPayment(true);

        // // Start automatic payment status checking
        // startPaymentStatusPolling(data.paymentId);

        if (data.statuspayment) {
          setStep("proof");
        } else {

          console.log(isPixExpired(data.pix_expiration_date))

          if (isPixExpired(data.pix_expiration_date)) {
            setStep("generate"); // Expirado ou erro

          } else {
            setPixData(data);
            setStep("payment");
            setIsCheckingPayment(true);

            // Start automatic payment status checking
            startPaymentStatusPolling(data.paymentId);
          }

        }

      } else {
        setStep("generate");
      }


    },
    onError: () => {
      setStep("generate");
    }
  });

  // Create PIX payment
  const createPixMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/create',
        data: {
          serviceId,
          amount,
          description: `Pagamento do serviço: ${serviceTitle}`,
          assemblerInfo: assemblerInfo,
          paymentDate: selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : null
        }
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setPixData(data);
        setStep('payment');
        setIsCheckingPayment(true);

        // Start automatic payment status checking
        startPaymentStatusPolling(data.paymentId);

        toast({
          title: "PIX Gerado",
          description: "Código PIX criado com sucesso! Verificaremos automaticamente quando o pagamento for confirmado.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao gerar pagamento PIX",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar pagamento PIX",
        variant: "destructive"
      });
    }
  });


  // Submit payment proof
  const submitProofMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payment/pix/simulate-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          paymentProof,
          paymentReference: pixData?.reference
        })
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Comprovante Enviado",
          description: "Comprovante de pagamento enviado com sucesso!",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/messages', serviceId] });
        onClose();
      } else {
        toast({
          title: "Erro",
          description: "Falha ao enviar comprovante",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao processar comprovante de pagamento",
        variant: "destructive"
      });
    }
  });

  // Start automatic payment status polling
  const startPaymentStatusPolling = (paymentId: string) => {
    if (!paymentId) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!paymentCompleted && paymentId) {
        console.log(paymentId)
        checkPaymentStatusMutation.mutate({ paymentId });
      }
    }, 5000); // Check every 5 seconds
  };

  // Simulate payment confirmation for testing
  const simulatePaymentConfirmation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/simulate-confirm',
        data: { serviceId }
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setPaymentCompleted(true);
        setIsCheckingPayment(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        toast({
          title: "Pagamento Simulado",
          description: "Pagamento confirmado automaticamente! Comprovante enviado no chat.",
        });

        // Refresh messages to show the automatic payment proof
        queryClient.invalidateQueries({ queryKey: ['/api/messages', serviceId] });
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });

        // Show mandatory rating dialog immediately after payment confirmation
        setTimeout(() => {
          onClose();
          setShowMandatoryRating(true);
        }, 2000);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao simular confirmação de pagamento",
        variant: "destructive"
      });
    }
  });

  // Send automatic payment proof to chat
  const sendAutomaticPaymentProof = async (paymentData: any) => {
    try {
      // Create a visual payment proof by calling the backend to generate the image
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/simulate-confirm',
        data: {
          serviceId,
          paymentProof: `Pagamento confirmado automaticamente via PIX - Valor: R$ ${amount} - Referência: ${pixData?.reference}`,
          paymentReference: pixData?.reference,
          isAutomatic: true
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Comprovante Enviado",
            description: "Comprovante de pagamento automático enviado no chat!",
          });
          queryClient.invalidateQueries({ queryKey: ['/api/messages', serviceId] });
        }
      }
    } catch (error) {
      console.error("Erro ao enviar comprovante automático:", error);
      toast({
        title: "Aviso",
        description: "Pagamento confirmado, mas houve um problema ao enviar o comprovante no chat.",
        variant: "default"
      });
    }
  };

  // Stop polling when payment is completed
  useEffect(() => {

    if (paymentCompleted && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    validStatusPix.mutate();
  }, [paymentCompleted]);



  const createPixPayment = () => {
    createPixMutation.mutate();
  };

  // const handleGeneratePixPayment = () => {
  //   generateTokenMutation.mutate();
  // };

  const handleCopyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }
  };

  const handleSubmitProof = () => {
    if (!paymentProof.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, forneça o comprovante de pagamento",
        variant: "destructive"
      });
      return;
    }
    submitProofMutation.mutate();
  };

  const formatExpirationTime = (expiresAt: string) => {
    const expirationDate = new Date(expiresAt);
    return expirationDate.toLocaleString('pt-BR');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto px-4 py-6 sm:px-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
              Pagamento PIX
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Pagamento para o serviço: {serviceTitle}
            </DialogDescription>
          </DialogHeader>

          {step === 'generate' && (
            <div className="space-y-4">
              <Card className="mobile-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    Valor do Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                    R$ {actualAmount}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    Valor do serviço a ser pago
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm sm:text-base font-medium text-gray-700">
                  Data do pagamento
                </Label>

                {/* Display selected date */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 sm:p-4 mobile-card">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-blue-800">
                        Data selecionada
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-blue-900 truncate">
                        {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendar Component */}
                <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg mobile-card">
                  <div className="flex justify-center w-full">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ptBR}
                      disabled={(date) => date < new Date()}
                      className="rounded-lg w-full max-w-sm mx-auto"
                      classNames={{
                        months: "flex flex-col space-y-4 w-full",
                        month: "space-y-3 w-full",
                        caption: "flex justify-center pt-1 relative items-center mb-3 sm:mb-4",
                        caption_label: "text-base sm:text-lg font-semibold text-gray-800",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 sm:h-8 sm:w-8 bg-gray-100 hover:bg-gray-200 rounded-full p-0 opacity-70 hover:opacity-100 transition-all duration-200 touch-target",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex w-full",
                        head_cell: "text-gray-500 rounded-md font-medium text-xs sm:text-sm flex-1 text-center py-2 min-w-0",
                        row: "flex w-full mt-1",
                        cell: "text-center text-xs sm:text-sm p-0 relative flex-1 min-w-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-8 w-8 sm:h-10 sm:w-10 p-0 font-medium aria-selected:opacity-100 hover:bg-blue-100 hover:text-blue-900 rounded-lg transition-all duration-200 mx-auto touch-target",
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
              </div>

              <Button
                onClick={createPixPayment}
                disabled={generateTokenMutation.isPending || createPixMutation.isPending || !selectedDate}
                className="w-full touch-target h-12 sm:h-11 text-sm sm:text-base font-medium"
              >
                {generateTokenMutation.isPending || createPixMutation.isPending
                  ? "Gerando PIX..."
                  : "Gerar Pagamento PIX"
                }
              </Button>

              {!selectedDate && (
                <p className="text-xs sm:text-sm text-amber-600 text-center px-2">
                  Selecione uma data para continuar
                </p>
              )}
            </div>
          )}

          {step === 'payment' && pixData && (
            <div className="space-y-4">
              <Card className="mobile-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                    PIX Gerado
                  </CardTitle>
                  <CardDescription className="text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <span>Valor: R$ {pixData.amount}</span>
                      {selectedDate && (
                        <span className="text-blue-600 mt-1 sm:mt-0">
                          Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="text-center">
                    <div className="bg-white p-3 sm:p-4 rounded-lg border inline-block mobile-card">
                      <img
                        src={pixData.qrCode}
                        alt="QR Code PIX"
                        className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-2">
                      Escaneie o QR Code com seu app bancário
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">
                      Ou copie o código PIX:
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={pixData.pixCode}
                        readOnly
                        className="font-mono text-xs sm:text-sm min-h-[44px]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPixCode}
                        className="min-h-[44px] min-w-[44px] touch-target"
                      >
                        {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mobile-card">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">
                        Expira em: {formatExpirationTime(pixData.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="w-full justify-center py-2 text-xs sm:text-sm">
                    Referência: {pixData.reference}
                  </Badge>
                </CardContent>
              </Card>

              {/* Temporary development warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mobile-card">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ Modo de Desenvolvimento</p>
                    <p className="text-xs leading-relaxed">
                      A API de contratação do Montador via meio de pagamento PIX ainda está em desenvolvimento.
                      O botão "Teste Gerar Comprovante" é uma solução temporária para simular a confirmação
                      de pagamento e permitir que o fluxo do site continue normalmente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <Button
                  onClick={() => setStep('proof')}
                  className="flex-1 touch-target h-12 sm:h-11 text-sm sm:text-base order-2 sm:order-1"
                  variant="outline"
                >
                  Já Fiz o Pagamento
                </Button>
                <Button
                  onClick={() => simulatePaymentConfirmation.mutate()}
                  disabled={simulatePaymentConfirmation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white touch-target h-12 sm:h-11 text-sm sm:text-base order-1 sm:order-2"
                  variant="default"
                >
                  {simulatePaymentConfirmation.isPending ? 'Simulando...' : '🧪 Teste Gerar Comprovante'}
                </Button>
              </div>
            </div>
          )}

          {step === 'proof' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comprovante de Pagamento</CardTitle>
                  <CardDescription>
                    Envie o comprovante para confirmar o pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Comprovante de Pagamento:
                    </label>
                    <Textarea
                      placeholder="Cole aqui o código/ID da transação, ou descreva os dados do comprovante (ex: ID da transação, horário, valor, etc.)"
                      value={paymentProof}
                      onChange={(e) => setPaymentProof(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Dica:</strong> Inclua informações como ID da transação,
                      horário do pagamento ou outros dados que comprovem o pagamento realizado.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('payment')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmitProof}
                  disabled={submitProofMutation.isPending || !paymentProof.trim()}
                  className="flex-1"
                >
                  {submitProofMutation.isPending ? "Enviando..." : "Enviar Comprovante"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mandatory Rating Dialog - Shows immediately after payment confirmation */}
      {assemblerInfo && (
        <MandatoryRatingDialog
          isOpen={showMandatoryRating}
          onClose={() => setShowMandatoryRating(false)}
          serviceId={serviceId}
          serviceTitle={serviceTitle}
          otherUserName={assemblerInfo.name}
          otherUserType="montador"
          currentUserType="lojista"
        />
      )}
    </>
  );
}