import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getBanksOrderedByName } from '@/lib/brazilian-banks';
import { bankAccountSchema, validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone, detectPixKeyType, BankAccountFormValues } from '@/lib/bank-account-schema';

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
}

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount;
  onSuccess?: () => void;
}

export function BankAccountDialog({ open, onOpenChange, account, onSuccess }: BankAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pixKeyAutoDetect, setPixKeyAutoDetect] = useState(false);

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
      pixKeyType: 'cpf_cnpj',
    },
  });

  // Resetar form quando account mudar
  useEffect(() => {
    if (account) {
      form.reset({
        bankName: account.bankName,
        accountType: account.accountType as 'corrente' | 'poupança',
        accountNumber: account.accountNumber,
        agency: account.agency,
        holderName: account.holderName,
        holderDocumentType: account.holderDocumentType as 'cpf' | 'cnpj',
        holderDocumentNumber: account.holderDocumentNumber,
        pixKey: account.pixKey || '',
        pixKeyType: (account.pixKeyType as 'cpf_cnpj' | 'email' | 'telefone' | 'uuid') || 'cpf_cnpj',
      });
    } else {
      form.reset({
        bankName: '',
        accountType: 'corrente',
        accountNumber: '',
        agency: '',
        holderName: '',
        holderDocumentType: 'cpf',
        holderDocumentNumber: '',
        pixKey: '',
        pixKeyType: 'cpf_cnpj',
      });
    }
  }, [account, form]);

  // Auto-detectar tipo de chave PIX
  const handlePixKeyChange = (value: string) => {
    if (value && pixKeyAutoDetect) {
      const detectedType = detectPixKeyType(value);
      if (detectedType) {
        form.setValue('pixKeyType', detectedType as 'cpf_cnpj' | 'email' | 'telefone' | 'uuid');
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: BankAccountFormValues) => apiRequest({
      method: 'POST',
      url: '/api/bank-accounts',
      data
    }),
    onSuccess: () => {
      toast({
        title: "Conta bancária adicionada",
        description: "Sua conta bancária foi adicionada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar conta",
        description: error.message || "Ocorreu um erro ao adicionar a conta bancária.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BankAccountFormValues) => apiRequest({
      method: 'PUT',
      url: `/api/bank-accounts/${account?.id}`,
      data
    }),
    onSuccess: () => {
      toast({
        title: "Conta bancária atualizada",
        description: "Sua conta bancária foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bank-accounts'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message || "Ocorreu um erro ao atualizar a conta bancária.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountFormValues) => {
    if (account) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const banks = getBanksOrderedByName();

  const handleDocumentNumberChange = (value: string, documentType: 'cpf' | 'cnpj') => {
    if (documentType === 'cpf') {
      return formatCPF(value);
    } else {
      return formatCNPJ(value);
    }
  };

  const handlePhoneFormat = (value: string) => {
    return formatPhone(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Conta Bancária' : 'Adicionar Conta Bancária'}
          </DialogTitle>
          <DialogDescription>
            {account ? 'Atualize suas informações bancárias' : 'Adicione uma nova conta bancária para receber pagamentos'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Banco */}
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {banks.map((bank) => (
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

            {/* Tipo de Conta */}
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
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

            <div className="grid grid-cols-2 gap-4">
              {/* Agência */}
              <FormField
                control={form.control}
                name="agency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agência *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="0000"
                        maxLength={4}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Número da Conta */}
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Conta *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000-0"
                        onChange={(e) => {
                          // Permitir números e hífen
                          const value = e.target.value.replace(/[^\d-]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nome do Titular */}
            <FormField
              control={form.control}
              name="holderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Titular *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nome completo do titular"
                      onChange={(e) => {
                        // Permitir apenas letras, acentos e espaços
                        const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Documento */}
              <FormField
                control={form.control}
                name="holderDocumentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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

              {/* Número do Documento */}
              <FormField
                control={form.control}
                name="holderDocumentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Documento *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={form.watch('holderDocumentType') === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                        onChange={(e) => {
                          const documentType = form.watch('holderDocumentType');
                          const formatted = handleDocumentNumberChange(e.target.value, documentType);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Chave PIX */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Chave PIX *</h4>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pixKeyAutoDetect}
                    onChange={(e) => setPixKeyAutoDetect(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto-detectar tipo</span>
                </label>
              </div>

              <FormField
                control={form.control}
                name="pixKeyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Chave PIX *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpf_cnpj">CPF/CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="uuid">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Chave PIX *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getPixKeyPlaceholder(form.watch('pixKeyType'))}
                        onChange={(e) => {
                          const value = e.target.value;
                          const pixKeyType = form.watch('pixKeyType');
                          
                          let formattedValue = value;
                          
                          // Formatar conforme o tipo
                          if (pixKeyType === 'cpf_cnpj') {
                            const clean = value.replace(/\D/g, '');
                            if (clean.length <= 11) {
                              formattedValue = formatCPF(value);
                            } else {
                              formattedValue = formatCNPJ(value);
                            }
                          } else if (pixKeyType === 'telefone') {
                            formattedValue = handlePhoneFormat(value);
                          }
                          
                          field.onChange(formattedValue);
                          handlePixKeyChange(formattedValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (account ? 'Atualizar' : 'Adicionar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getPixKeyPlaceholder(pixKeyType: string): string {
  switch (pixKeyType) {
    case 'cpf_cnpj':
      return '000.000.000-00 ou 00.000.000/0000-00';
    case 'email':
      return 'exemplo@dominio.com';
    case 'telefone':
      return '(11) 99999-9999';
    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';
    default:
      return 'Digite sua chave PIX';
  }
}