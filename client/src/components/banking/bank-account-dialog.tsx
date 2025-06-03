import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getBanksOrderedByName } from '@/lib/brazilian-banks';

// Schema para validação dos dados bancários
const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Nome do banco é obrigatório'),
  accountType: z.enum(['corrente', 'poupança'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  accountNumber: z.string()
    .min(1, 'Número da conta é obrigatório')
    .regex(/^[\d\-]+$/, 'Número da conta deve conter apenas números e hífens'),
  agency: z.string()
    .min(1, 'Agência é obrigatória')
    .regex(/^[\d\-]+$/, 'Agência deve conter apenas números e hífens'),
  holderName: z.string().min(1, 'Nome do titular é obrigatório'),
  holderDocumentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  holderDocumentNumber: z.string()
    .min(1, 'Número do documento é obrigatório')
    .regex(/^[\d\.\-\/]+$/, 'Documento deve conter apenas números, pontos, hífens e barras'),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatória']).optional(),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  accountType: string;
  accountNumber: string;
  agency: string;
  holderName: string;
  holderDocumentType: string;
  holderDocumentNumber: string;
  pixKey?: string;
  pixKeyType?: string;
  createdAt: string;
}

interface BankAccountDialogProps {
  userId: number;
  userType: 'lojista' | 'montador';
}

export const BankAccountDialog: React.FC<BankAccountDialogProps> = ({ userId, userType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar as contas bancárias do usuário
  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ['/api/bank-accounts'],
    select: (data) => data as BankAccount[],
  });

  // Form para adicionar/editar conta bancária
  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankName: '',
      accountType: 'corrente',
      accountNumber: '',
      agency: '',
      holderName: '',
      holderDocumentType: 'cpf',
      holderDocumentNumber: '',
      pixKey: '',
      pixKeyType: undefined,
    },
  });

  // Mutation para criar conta bancária
  const createBankAccountMutation = useMutation({
    mutationFn: (data: BankAccountFormValues) => {
      return apiRequest({
        url: '/api/bank-accounts',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Conta bancária adicionada',
        description: 'Sua conta bancária foi adicionada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      form.reset();
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar conta bancária',
        description: error.message || 'Ocorreu um erro ao adicionar a conta bancária.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar conta bancária
  const updateBankAccountMutation = useMutation({
    mutationFn: (data: BankAccountFormValues & { id: number }) => {
      const { id, ...formData } = data;
      return apiRequest({
        url: `/api/bank-accounts/${id}`,
        method: 'PATCH',
        data: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Conta bancária atualizada',
        description: 'Sua conta bancária foi atualizada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      form.reset();
      setIsEditing(false);
      setSelectedAccountId(null);
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar conta bancária',
        description: error.message || 'Ocorreu um erro ao atualizar a conta bancária.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para excluir conta bancária
  const deleteBankAccountMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest({
        url: `/api/bank-accounts/${id}`,
        method: 'DELETE',
        data: undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Conta bancária excluída',
        description: 'Sua conta bancária foi excluída com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir conta bancária',
        description: error.message || 'Ocorreu um erro ao excluir a conta bancária.',
        variant: 'destructive',
      });
    },
  });

  // Função para editar uma conta bancária
  const handleEditAccount = (account: BankAccount) => {
    setIsEditing(true);
    setSelectedAccountId(account.id);
    form.reset({
      bankName: account.bankName,
      accountType: account.accountType as 'corrente' | 'poupança',
      accountNumber: account.accountNumber,
      agency: account.agency,
      holderName: account.holderName,
      holderDocumentType: account.holderDocumentType as 'cpf' | 'cnpj',
      holderDocumentNumber: account.holderDocumentNumber,
      pixKey: account.pixKey || '',
      pixKeyType: account.pixKeyType ? account.pixKeyType as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatória' : undefined,
    });
    setIsOpen(true);
  };

  // Função para excluir uma conta bancária
  const handleDeleteAccount = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta bancária?')) {
      deleteBankAccountMutation.mutate(id);
    }
  };

  // Função para limpar o formulário quando o modal é fechado
  const handleDialogClose = () => {
    if (!isOpen) {
      form.reset();
      setIsEditing(false);
      setSelectedAccountId(null);
    }
  };

  // Efeito para monitorar o estado do diálogo
  useEffect(() => {
    handleDialogClose();
  }, [isOpen]);

  // Função para enviar o formulário
  const onSubmit = (data: BankAccountFormValues) => {
    if (isEditing && selectedAccountId) {
      updateBankAccountMutation.mutate({ ...data, id: selectedAccountId });
    } else {
      createBankAccountMutation.mutate(data);
    }
  };

  // Função para adicionar nova conta
  const handleAddNewAccount = () => {
    form.reset({
      bankName: '',
      accountType: 'corrente',
      accountNumber: '',
      agency: '',
      holderName: '',
      holderDocumentType: 'cpf',
      holderDocumentNumber: '',
      pixKey: '',
      pixKeyType: undefined,
    });
    setIsEditing(false);
    setSelectedAccountId(null);
    setIsOpen(true);
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Informações Bancárias</h3>
      
      {isLoading ? (
        <p>Carregando informações bancárias...</p>
      ) : (
        <>
          {bankAccounts && bankAccounts.length > 0 ? (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div 
                  key={account.id}
                  className="border p-4 rounded-md bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{account.bankName}</h4>
                      <p className="text-sm text-gray-500">
                        Agência: {account.agency} | Conta: {account.accountNumber} ({account.accountType})
                      </p>
                      <p className="text-sm text-gray-500">
                        Titular: {account.holderName} ({account.holderDocumentType.toUpperCase()}: {account.holderDocumentNumber})
                      </p>
                      {account.pixKey && (
                        <p className="text-sm text-gray-500">
                          Chave PIX ({account.pixKeyType}): {account.pixKey}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Você não possui contas bancárias cadastradas.</p>
          )}
          
          <Button 
            variant="default" 
            className="mt-4"
            onClick={handleAddNewAccount}
          >
            Adicionar Conta Bancária
          </Button>
        </>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Conta Bancária' : 'Adicionar Conta Bancária'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize os dados da sua conta bancária.' : 'Preencha os dados da sua conta bancária para receber pagamentos.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Banco</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu banco..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {getBanksOrderedByName().map((bank) => (
                          <SelectItem key={bank.code} value={bank.name}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conta</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupança">Conta Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agência</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Exemplo: 1234" 
                          {...field}
                          onChange={(e) => {
                            // Permite apenas números e hífens
                            const value = e.target.value.replace(/[^\d\-]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Conta</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Exemplo: 12345-6" 
                          {...field}
                          onChange={(e) => {
                            // Permite apenas números e hífens
                            const value = e.target.value.replace(/[^\d\-]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="holderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Titular</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo do titular" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="holderDocumentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="holderDocumentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Documento</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={form.watch('holderDocumentType') === 'cpf' ? '123.456.789-00' : '12.345.678/0001-90'} 
                          {...field}
                          onChange={(e) => {
                            // Permite apenas números, pontos, hífens e barras
                            const value = e.target.value.replace(/[^\d\.\-\/]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pixKeyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Chave PIX (opcional)</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nenhuma">Nenhuma</SelectItem>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatória">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch('pixKeyType') && form.watch('pixKeyType') !== 'nenhuma' && (
                  <FormField
                    control={form.control}
                    name="pixKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite sua chave PIX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createBankAccountMutation.isPending || updateBankAccountMutation.isPending}
                >
                  {createBankAccountMutation.isPending || updateBankAccountMutation.isPending
                    ? 'Salvando...'
                    : isEditing
                      ? 'Atualizar'
                      : 'Adicionar'
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};