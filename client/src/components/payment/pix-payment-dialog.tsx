import React, { useState } from 'react';
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

interface PixPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: number;
  amount: string;
  serviceTitle: string;
}

interface PixPaymentData {
  pixCode: string;
  qrCode: string;
  reference: string;
  amount: number;
  expiresAt: string;
}

export function PixPaymentDialog({ 
  isOpen, 
  onClose, 
  serviceId, 
  amount, 
  serviceTitle 
}: PixPaymentDialogProps) {
  const [step, setStep] = useState<'generate' | 'payment' | 'proof'>('generate');
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [paymentProof, setPaymentProof] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate PIX token
  const generateTokenMutation = useMutation({
    mutationFn: () => apiRequest('/api/payment/pix/token', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      if (data.success) {
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

  // Create PIX payment
  const createPixMutation = useMutation({
    mutationFn: (token: string) => apiRequest('/api/payment/pix/create', {
      method: 'POST',
      body: {
        serviceId,
        amount,
        description: `Pagamento do serviço: ${serviceTitle}`,
        token
      }
    }),
    onSuccess: (data) => {
      if (data.success) {
        setPixData(data);
        setStep('payment');
        toast({
          title: "PIX Gerado",
          description: "Código PIX criado com sucesso! Escaneie o QR Code ou copie o código.",
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
    mutationFn: () => apiRequest('/api/payment/pix/confirm', {
      method: 'POST',
      body: {
        serviceId,
        paymentProof,
        paymentReference: pixData?.reference
      }
    }),
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
                  R$ {amount}
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

            <Button 
              onClick={() => setStep('proof')}
              className="w-full"
            >
              Já Fiz o Pagamento
            </Button>
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
  );
}