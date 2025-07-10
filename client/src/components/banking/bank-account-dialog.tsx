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
import { bankAccountSchema, validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone, formatAgency, formatAccountNumber, detectPixKeyType, BankAccountFormValues } from '@/lib/bank-account-schema';

interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  bankCode: string;
  accountType: string;
  accountNumber: string;
  agency: string;
  holderName: string;
  holderDocumentType: string;
  holderDocumentNumber: string;
  pixKey?: string | null;
  pixKeyType?: string | null;
  id_recebedor?: string;
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
      bankCode: '',
      accountType: 'corrente',
      accountNumber: '',
      agency: '',
      holderName: '',
      holderDocumentType: 'cpf',
      holderDocumentNumber: '',
      pixKey: '',
      pixKeyType: 'cpf',
      id_recebedor: '',
    },
  });

  // Resetar form quando account mudar
  useEffect(() => {
    if (account) {
      form.reset({
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountType: account.accountType as 'corrente' | 'poupança',
        accountNumber: account.accountNumber,
        agency: account.agency,
        holderName: account.holderName,
        holderDocumentType: account.holderDocumentType as 'cpf' | 'cnpj',
        holderDocumentNumber: account.holderDocumentNumber,
        pixKey: account.pixKey ?? '',
        pixKeyType: 'cpf',
        id_recebedor: account.id_recebedor ?? '',
      });
    } else {
      form.reset({
        bankName: '',
        bankCode: '',
        accountType: 'corrente',
        accountNumber: '',
        agency: '',
        holderName: '',
        holderDocumentType: 'cpf',
        holderDocumentNumber: '',
        pixKey: '',
        pixKeyType: 'cpf',
        id_recebedor: ''
      });
    }
  }, [account, form]);

  // Auto-formatação da chave PIX (CPF)
  const handlePixKeyChange = (value: string) => {
    // Formatar automaticamente como CPF
    const cleanValue = value.replace(/[^\d]/g, '');
    const formattedValue = formatCPF(cleanValue);
    return formattedValue;
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

  const getPixKeyMaxLength = (pixKeyType: string): number => {
    switch (pixKeyType) {
      case 'cpf_cnpj':
        return 18; // CNPJ formatado: 00.000.000/0000-00
      case 'email':
        return 77; // Máximo permitido para email PIX
      case 'telefone':
        return 15; // (00) 00000-0000
      case 'uuid':
        return 36; // 00000000-0000-0000-0000-000000000000
      default:
        return 77;
    }
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
                  <Select
                    onValueChange={(value) => {
                      const bank = JSON.parse(value);
                      form.setValue('bankCode', bank.code);
                      form.setValue('bankName', bank.name);
                    }}
                    value={JSON.stringify({ code: form.watch('bankCode'), name: form.watch('bankName') })}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem
                          key={bank.code}
                          value={JSON.stringify({ code: bank.code, name: bank.name })}>
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
                          const formatted = formatAgency(e.target.value);
                          field.onChange(formatted);
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
                        placeholder="12345-6"
                        maxLength={14}
                        onChange={(e) => {
                          const formatted = formatAccountNumber(e.target.value);
                          field.onChange(formatted);
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
                        maxLength={form.watch('holderDocumentType') === 'cpf' ? 14 : 18}
                        onChange={(e) => {
                          const documentType = form.watch('holderDocumentType');
                          const formatted = documentType === 'cpf'
                            ? formatCPF(e.target.value)
                            : formatCNPJ(e.target.value);
                          field.onChange(formatted);
                        }}
                        onBlur={() => {
                          // Validar em tempo real
                          const value = field.value;
                          const documentType = form.watch('holderDocumentType');
                          if (value) {
                            const isValid = documentType === 'cpf'
                              ? validateCPF(value)
                              : validateCNPJ(value);
                            if (!isValid) {
                              form.setError('holderDocumentNumber', {
                                type: 'manual',
                                message: 'CPF/CNPJ inválido.'
                              });
                            } else {
                              form.clearErrors('holderDocumentNumber');
                            }
                          }
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
              {/* Aviso sobre restrição da chave PIX */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-1">Importante: Restrição da Chave PIX</h4>
                    <p className="text-sm text-amber-700">
                      A chave PIX deve ser obrigatoriamente no formato CPF e deve ser o mesmo CPF informado como titular da conta bancária.
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX (CPF) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        onChange={(e) => {
                          const value = e.target.value;
                          const clean = value.replace(/\D/g, '');
                          const formattedValue = formatCPF(clean);
                          field.onChange(formattedValue);
                        }}
                        onBlur={() => {
                          const value = field.value;
                          if (value) {
                            const isValid = validateCPF(value);

                            if (!isValid) {
                              form.setError('pixKey', {
                                type: 'manual',
                                message: 'Chave PIX deve ser um CPF válido.'
                              });
                            } else {
                              form.clearErrors('pixKey');
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Informe o mesmo CPF do titular da conta bancária
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_recebedor"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
    case 'cpf':
      return '000.000.000-00';
    default:
      return '000.000.000-00';
  }
}

function getPixKeyMaxLength(pixKeyType: string): number {
  switch (pixKeyType) {
    case 'cpf':
      return 14; // CPF formatado: 000.000.000-00
    default:
      return 14;
  }
}