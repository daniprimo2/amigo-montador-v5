import { z } from 'zod';

// Schema para validação dos dados bancários
export const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Nome do banco é obrigatório'),
  accountType: z.enum(['corrente', 'poupança'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  accountNumber: z.string().min(1, 'Número da conta é obrigatório'),
  agency: z.string().min(1, 'Agência é obrigatória'),
  holderName: z.string().min(1, 'Nome do titular é obrigatório'),
  holderDocumentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  holderDocumentNumber: z.string().min(1, 'Número do documento é obrigatório'),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatória', 'nenhuma']).optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;