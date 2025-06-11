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
import { QrCode, Copy, Check, AlertCircle, CreditCard, DollarSign } from 'lucide-react';
import { RatingDialog } from '@/components/rating/rating-dialog';

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
        createPixPayment(data.token);
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
    mutationFn: async ({ paymentId, token }: { paymentId: string; token: string }) => {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/status',
        data: { paymentId, token }
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success && data.isCompleted) {
        setPaymentCompleted(true);
        setIsCheckingPayment(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Automatically send payment proof to chat
        sendAutomaticPaymentProof(data.paymentData);
        
        toast({
          title: "Pagamento Confirmado!",
          description: "Seu pagamento PIX foi confirmado automaticamente. Agora você deve avaliar o montador.",
        });
        
        // Show rating dialog immediately after payment confirmation
        if (assemblerInfo) {
          setShowRatingDialog(true);
        }
      }
    },
    onError: (error) => {
      console.error("Erro ao verificar status do pagamento:", error);
    }
  });

  // Create PIX payment
  const createPixMutation = useMutation({
    mutationFn: async (token: string) => {
      console.log("[Frontend PIX] Enviando para backend:", { serviceId, amount, tipo: typeof amount });
      const response = await apiRequest({
        method: 'POST',
        url: '/api/payment/pix/create',
        data: {
          serviceId,
          amount,
          description: `Pagamento do serviço: ${serviceTitle}`,
          token
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
        startPaymentStatusPolling(data.paymentId, currentToken);
        
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
      const response = await fetch('/api/payment/pix/confirm', {
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
  const startPaymentStatusPolling = (paymentId: string, token: string) => {
    if (!paymentId || !token) {
      console.log("PIX: ID do pagamento ou token não disponível para verificação");
      return;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!paymentCompleted && paymentId && token) {
        checkPaymentStatusMutation.mutate({ paymentId, token });
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
        
        // Close dialog after success
        setTimeout(() => {
          onClose();
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
        url: '/api/payment/pix/confirm',
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

  // Clean up interval on unmount or dialog close
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Stop polling when payment is completed
  useEffect(() => {
    if (paymentCompleted && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [paymentCompleted]);

  const createPixPayment = (token: string) => {
    createPixMutation.mutate(token);
  };

  const handleGeneratePixPayment = () => {
    generateTokenMutation.mutate();
  };

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Pagamento para o serviço: {serviceTitle}
          </DialogDescription>
        </DialogHeader>

        {step === 'generate' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Valor do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {actualAmount}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Clique abaixo para gerar o código PIX
                </p>
              </CardContent>
            </Card>

            <Button 
              onClick={handleGeneratePixPayment}
              disabled={generateTokenMutation.isPending || createPixMutation.isPending}
              className="w-full"
            >
              {generateTokenMutation.isPending || createPixMutation.isPending 
                ? "Gerando PIX..." 
                : "Gerar Pagamento PIX"
              }
            </Button>
          </div>
        )}

        {step === 'payment' && pixData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  PIX Gerado
                </CardTitle>
                <CardDescription>
                  Valor: R$ {pixData.amount}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <img 
                      src={pixData.qrCode} 
                      alt="QR Code PIX" 
                      className="w-32 h-32"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Escaneie o QR Code com seu app bancário
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Ou copie o código PIX:
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      value={pixData.pixCode}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPixCode}
                    >
                      {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Expira em: {formatExpirationTime(pixData.expiresAt)}
                    </span>
                  </div>
                </div>

                <Badge variant="secondary" className="w-full justify-center">
                  Referência: {pixData.reference}
                </Badge>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={() => setStep('proof')}
                className="flex-1"
                variant="outline"
              >
                Já Fiz o Pagamento
              </Button>
              <Button 
                onClick={() => simulatePaymentConfirmation.mutate()}
                disabled={simulatePaymentConfirmation.isPending}
                className="flex-1"
                variant="default"
              >
                {simulatePaymentConfirmation.isPending ? 'Simulando...' : 'Simular Pagamento'}
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
    
    {/* Rating Dialog - Shows immediately after payment confirmation */}
    {assemblerInfo && (
      <RatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        serviceId={serviceId}
        toUserId={assemblerInfo.userId}
        toUserName={assemblerInfo.name}
        serviceName={serviceTitle}
        onSuccess={() => {
          setShowRatingDialog(false);
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          queryClient.invalidateQueries({ queryKey: ['/api/services/pending-evaluations'] });
          onClose(); // Close the PIX dialog after rating is complete
          toast({
            title: "Serviço Finalizado!",
            description: "Pagamento confirmado e avaliação realizada com sucesso.",
          });
        }}
      />
    )}
    </>
  );
}