import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, CreditCard, Key } from 'lucide-react';
import { BankAccountDialog } from './bank-account-dialog';

interface PixSetupStatus {
  isPixReady: boolean;
  hasBankAccount: boolean;
  hasPixKey: boolean;
  hasProfileDocuments: boolean;
  recommendations: string[];
}

interface PixSetupCheckProps {
  userId: number;
  userType: 'lojista' | 'montador';
}

export const PixSetupCheck: React.FC<PixSetupCheckProps> = ({ userId, userType }) => {
  const [showBankDialog, setShowBankDialog] = React.useState(false);

  const { data: pixStatus, isLoading } = useQuery({
    queryKey: ['/api/banking/pix-ready'],
    select: (data) => data as PixSetupStatus,
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configuração PIX
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Verificando configuração...</p>
        </CardContent>
      </Card>
    );
  }

  if (!pixStatus) {
    return null;
  }

  const getStatusIcon = (hasFeature: boolean) => {
    return hasFeature ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-yellow-500" />
    );
  };

  const getStatusBadge = (isReady: boolean) => {
    return (
      <Badge variant={isReady ? "default" : "secondary"} className={isReady ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
        {isReady ? "Configurado" : "Pendente"}
      </Badge>
    );
  };

  return (
    <>
      <Card className="w-full mobile-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              <CardTitle className="text-base sm:text-lg">Configuração PIX</CardTitle>
            </div>
            {getStatusBadge(pixStatus.isPixReady)}
          </div>
          <CardDescription className="text-sm">
            Status da configuração para pagamentos PIX
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(pixStatus.hasBankAccount)}
                <div>
                  <p className="font-medium">Conta Bancária</p>
                  <p className="text-sm text-gray-500">
                    {pixStatus.hasBankAccount 
                      ? "Conta bancária cadastrada" 
                      : "Nenhuma conta bancária cadastrada"
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(pixStatus.hasPixKey)}
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Chave PIX</p>
                    <p className="text-sm text-gray-500">
                      {pixStatus.hasPixKey 
                        ? "Chave PIX configurada" 
                        : "Chave PIX não configurada"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(pixStatus.hasProfileDocuments)}
                <div>
                  <p className="font-medium">Documentos</p>
                  <p className="text-sm text-gray-500">
                    {pixStatus.hasProfileDocuments 
                      ? "CPF/CNPJ configurado no perfil" 
                      : "CPF/CNPJ não configurado"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {pixStatus.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Recomendações:</h4>
              <ul className="space-y-1">
                {pixStatus.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => setShowBankDialog(true)}
              variant={pixStatus.hasBankAccount ? "outline" : "default"}
              className="flex-1"
            >
              {pixStatus.hasBankAccount ? "Gerenciar Contas" : "Cadastrar Conta Bancária"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <BankAccountDialog 
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
      />
    </>
  );
};