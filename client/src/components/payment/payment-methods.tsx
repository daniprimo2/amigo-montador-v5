import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Smartphone, QrCode, Building, CheckCircle, Clock } from "lucide-react";
import { cn, formatToBrazilianPrice } from "@/lib/utils";

interface PaymentMethodsProps {
  amount: number;
  serviceId: number;
  onPaymentSuccess: (paymentData: any) => void;
  onCancel: () => void;
}

export function PaymentMethods({ amount, serviceId, onPaymentSuccess, onCancel }: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("pix");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardData, setCardData] = useState({
    number: "",
    holder: "",
    expiry: "",
    cvv: ""
  });

  const paymentMethods = [
    {
      id: "pix",
      name: "PIX",
      description: "Pagamento instantâneo",
      icon: QrCode,
      processing: "Imediato",
      fee: 0,
      available: true
    },
    {
      id: "credit_card",
      name: "Cartão de Crédito",
      description: "Visa, Mastercard, Elo",
      icon: CreditCard,
      processing: "1-2 dias úteis",
      fee: 3.99,
      available: true
    },
    {
      id: "bank_transfer",
      name: "Transferência Bancária",
      description: "TED/DOC",
      icon: Building,
      processing: "1-3 dias úteis",
      fee: 0,
      available: true
    },
    {
      id: "digital_wallet",
      name: "Carteira Digital",
      description: "PayPal, PagSeguro",
      icon: Smartphone,
      processing: "Imediato",
      fee: 2.49,
      available: false
    }
  ];

  const calculateTotal = () => {
    const method = paymentMethods.find(m => m.id === selectedMethod);
    const fee = method ? (amount * method.fee / 100) : 0;
    return amount + fee;
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      let paymentData: any = {
        method: selectedMethod,
        amount: calculateTotal(),
        serviceId,
        timestamp: new Date().toISOString()
      };

      switch (selectedMethod) {
        case "pix":
          paymentData = {
            ...paymentData,
            pixKey: "contato@amigomontador.com",
            qrCode: `data:image/svg+xml,${encodeURIComponent(generatePixQR())}`
          };
          break;

        case "credit_card":
          paymentData = {
            ...paymentData,
            card: {
              lastFour: cardData.number.slice(-4),
              holder: cardData.holder,
              brand: detectCardBrand(cardData.number)
            }
          };
          break;

        case "bank_transfer":
          paymentData = {
            ...paymentData,
            bankInfo: {
              bank: "Banco do Brasil",
              agency: "1234-5",
              account: "12345-6",
              holder: "Amigo Montador LTDA"
            }
          };
          break;
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      onPaymentSuccess(paymentData);
    } catch (error) {
      console.error("Erro no pagamento:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePixQR = () => {
    return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <g fill="black">
        ${Array.from({ length: 25 }, (_, row) =>
          Array.from({ length: 25 }, (_, col) => {
            const shouldFill = (row + col) % 3 === 0 || (row * col) % 7 === 0;
            return shouldFill ? `<rect x="${col * 8}" y="${row * 8}" width="8" height="8"/>` : '';
          }).join('')
        ).join('')}
      </g>
    </svg>`;
  };

  const detectCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'American Express';
    return 'Desconhecido';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Escolha a forma de pagamento</h3>
        <p className="text-sm text-muted-foreground">
          Valor do serviço: <span className="font-medium">{formatToBrazilianPrice(amount)}</span>
        </p>
      </div>

      <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const total = selectedMethod === method.id ? calculateTotal() : amount;
            const fee = selectedMethod === method.id ? total - amount : 0;

            return (
              <div key={method.id} className="relative">
                <RadioGroupItem
                  value={method.id}
                  id={method.id}
                  className="peer sr-only"
                  disabled={!method.available}
                />
                <Label
                  htmlFor={method.id}
                  className={`flex items-center space-x-4 rounded-lg border-2 p-4 cursor-pointer transition-all
                    ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}
                    peer-checked:border-primary peer-checked:bg-primary/5
                  `}
                >
                  <Icon className="h-6 w-6" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{method.name}</span>
                      {!method.available && <Badge variant="secondary">Em breve</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {method.processing}
                      </span>
                      {method.fee > 0 && (
                        <span className="text-xs text-orange-600">
                          Taxa: {method.fee}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatToBrazilianPrice(total)}</div>
                    {fee > 0 && (
                      <div className="text-xs text-muted-foreground">
                        +{formatToBrazilianPrice(fee)} taxa
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      {/* Formulário específico para cartão de crédito */}
      {selectedMethod === "credit_card" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Cartão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Número do Cartão</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={cardData.number}
                onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
                maxLength={19}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-holder">Nome no Cartão</Label>
              <Input
                id="card-holder"
                placeholder="João Silva"
                value={cardData.holder}
                onChange={(e) => setCardData(prev => ({ ...prev, holder: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-expiry">Validade</Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/AA"
                  value={cardData.expiry}
                  onChange={(e) => setCardData(prev => ({ ...prev, expiry: e.target.value }))}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                  maxLength={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIX QR Code */}
      {selectedMethod === "pix" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              PIX - Pagamento Instantâneo
            </CardTitle>
            <CardDescription>
              Escaneie o código QR com seu banco ou use a chave PIX
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <div 
                className="w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-50"
                dangerouslySetInnerHTML={{ __html: generatePixQR() }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Chave PIX:</p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                contato@amigomontador.com
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              Valor: <span className="font-medium">{formatToBrazilianPrice(calculateTotal())}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={handlePayment} 
          disabled={isProcessing || !paymentMethods.find(m => m.id === selectedMethod)?.available}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
}