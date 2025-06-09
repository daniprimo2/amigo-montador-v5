import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BankAccountDialog } from "./bank-account-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, CreditCard, Building2, Smartphone } from "lucide-react";
import type { BankAccount } from "@shared/schema";

interface BankAccountSectionProps {
  userId: number;
}

const getPixKeyIcon = (pixKeyType: string | null) => {
  switch (pixKeyType) {
    case 'cpf_cnpj':
      return <CreditCard className="h-4 w-4" />;
    case 'email':
      return <span className="text-xs">@</span>;
    case 'telefone':
      return <Smartphone className="h-4 w-4" />;
    case 'uuid':
      return <span className="text-xs">#</span>;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const formatPixKeyType = (pixKeyType: string | null) => {
  switch (pixKeyType) {
    case 'cpf_cnpj':
      return 'CPF/CNPJ';
    case 'email':
      return 'Email';
    case 'telefone':
      return 'Telefone';
    case 'uuid':
      return 'Chave Aleatória';
    default:
      return 'Não informado';
  }
};

const maskAccountNumber = (accountNumber: string) => {
  if (accountNumber.length <= 4) return accountNumber;
  return accountNumber.slice(0, -4).replace(/./g, '*') + accountNumber.slice(-4);
};

const maskDocumentNumber = (documentNumber: string, documentType: string) => {
  const clean = documentNumber.replace(/\D/g, '');
  if (documentType === 'cpf' && clean.length === 11) {
    return `***.***.***-${clean.slice(-2)}`;
  } else if (documentType === 'cnpj' && clean.length === 14) {
    return `**.***.***/****-${clean.slice(-2)}`;
  }
  return documentNumber;
};

const maskPixKey = (pixKey: string | null, pixKeyType: string | null) => {
  if (!pixKey) return 'Não informado';
  
  switch (pixKeyType) {
    case 'cpf_cnpj':
      const clean = pixKey.replace(/\D/g, '');
      if (clean.length === 11) {
        return `***.***.***-${clean.slice(-2)}`;
      } else if (clean.length === 14) {
        return `**.***.***/****-${clean.slice(-2)}`;
      }
      return pixKey;
    case 'email':
      const [user, domain] = pixKey.split('@');
      if (user && domain) {
        const maskedUser = user.length > 2 ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1] : user;
        return `${maskedUser}@${domain}`;
      }
      return pixKey;
    case 'telefone':
      const cleanPhone = pixKey.replace(/\D/g, '');
      if (cleanPhone.length >= 8) {
        return `(**) ****-${cleanPhone.slice(-4)}`;
      }
      return pixKey;
    default:
      return pixKey.length > 8 ? pixKey.slice(0, 4) + '***' + pixKey.slice(-4) : pixKey;
  }
};

export function BankAccountSection({ userId }: BankAccountSectionProps) {
  const [selectedAccount, setSelectedAccount] = useState<any>();
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading, error } = useQuery({
    queryKey: ['/api/bank-accounts', Math.random()], // Force fresh request
    queryFn: () => apiRequest({ 
      method: 'GET', 
      url: '/api/bank-accounts',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  console.log('BankAccountSection - bankAccounts data:', bankAccounts);



  const deleteMutation = useMutation({
    mutationFn: (accountId: number) => apiRequest({
      method: 'DELETE',
      url: `/api/bank-accounts/${accountId}`,
    }),
    onSuccess: () => {
      toast({
        title: "Conta bancária removida",
        description: "A conta bancária foi removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      setAccountToDelete(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover conta",
        description: error.message || "Ocorreu um erro ao remover a conta bancária.",
        variant: "destructive",
      });
    },
  });

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    setShowBankDialog(true);
  };

  const handleAddAccount = () => {
    setSelectedAccount(undefined);
    setShowBankDialog(true);
  };

  const handleDeleteAccount = (account: BankAccount) => {
    setAccountToDelete(account);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Informações Bancárias</h3>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Informações Bancárias</h3>
        <Button onClick={handleAddAccount} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conta
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Gerencie suas contas bancárias para receber pagamentos pelos serviços prestados.
      </p>

      {bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0 ? (
        <div className="space-y-3">
          {bankAccounts.map((account: any) => (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {account.bankName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {account.accountType === 'corrente' ? 'Conta Corrente' : 'Poupança'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Agência</p>
                    <p className="font-medium">{account.agency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Conta</p>
                    <p className="font-medium">{maskAccountNumber(account.accountNumber)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Titular</p>
                    <p className="font-medium">{account.holderName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">
                      {account.holderDocumentType?.toUpperCase()}
                    </p>
                    <p className="font-medium">
                      {maskDocumentNumber(account.holderDocumentNumber, account.holderDocumentType)}
                    </p>
                  </div>
                  {account.pixKey && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        {getPixKeyIcon(account.pixKeyType)}
                        <p className="text-muted-foreground">
                          Chave PIX ({formatPixKeyType(account.pixKeyType)})
                        </p>
                      </div>
                      <p className="font-medium">{maskPixKey(account.pixKey, account.pixKeyType)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhuma conta bancária cadastrada</h4>
            <p className="text-muted-foreground text-center mb-4">
              Adicione suas informações bancárias para receber pagamentos pelos serviços prestados.
            </p>
            <Button onClick={handleAddAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      )}

      <BankAccountDialog
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        account={selectedAccount}
        onSuccess={() => {
          setSelectedAccount(undefined);
          queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
        }}
      />

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a conta bancária do {accountToDelete?.bankName}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}