export interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  accountType: 'corrente' | 'poupança';
  accountNumber: string;
  agency: string;
  holderName: string;
  holderDocumentType: 'cpf' | 'cnpj';
  holderDocumentNumber: string;
  pixKey: string | null;
  pixKeyType: 'cpf_cnpj' | 'email' | 'telefone' | 'uuid' | null;
  createdAt: string;
}