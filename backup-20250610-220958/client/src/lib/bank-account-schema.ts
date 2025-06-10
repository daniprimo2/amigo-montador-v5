import { z } from 'zod';

// Função para validar CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleanCPF.charAt(10));
};

// Função para validar CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  return result === parseInt(digits.charAt(1));
};

// Função para validar telefone com DDD (aceita prefixo +55 opcional)
const validatePhone = (phone: string): boolean => {
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Remover prefixo +55 se presente
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    cleanPhone = cleanPhone.substring(2);
  }
  
  // Deve ter 10 ou 11 dígitos (DDD + número)
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false;
  
  // Verificar se o DDD é válido (11-99)
  const ddd = parseInt(cleanPhone.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  
  // Para números com 11 dígitos, o terceiro dígito deve ser 9 (celular)
  if (cleanPhone.length === 11) {
    const thirdDigit = parseInt(cleanPhone.charAt(2));
    if (thirdDigit !== 9) return false;
  }
  
  return true;
};

// Função para validar email (RFC 5322 simplificada)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Função para validar chave aleatória (UUID v4)
const validateRandomKey = (key: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
};

// Schema base para validação dos dados bancários conforme especificação
const baseBankAccountSchema = z.object({
  bankName: z.string()
    .min(1, 'Nome do banco é obrigatório')
    .max(100, 'Nome do banco deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s0-9\-\.]+$/, 'Nome do banco contém caracteres inválidos'),
  accountType: z.enum(['corrente', 'poupança'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  // Número da Conta: 5-12 dígitos + opcional DV
  accountNumber: z.string()
    .min(1, 'Número de conta inválido.')
    .regex(/^\d{5,12}(-\d{1})?$/, 'Número de conta inválido.'),
  // Agência: somente números, 4 dígitos
  agency: z.string()
    .min(1, 'Número de agência inválido (use 4 dígitos).')
    .regex(/^\d{4}$/, 'Número de agência inválido (use 4 dígitos).'),
  // Nome do Titular: ≥ 3 caracteres, apenas letras/acentos/espaços
  holderName: z.string()
    .min(3, 'Informe o nome completo do titular.')
    .regex(/^[a-zA-ZÀ-ÿ ]{3,}$/, 'Informe o nome completo do titular.')
    .transform((val) => val.replace(/\s+/g, ' ').trim()), // Normalizar espaços
  holderDocumentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  // Documento: CPF (11 dígitos) ou CNPJ (14 dígitos) válidos
  holderDocumentNumber: z.string()
    .min(1, 'CPF/CNPJ inválido.')
    .refine((val) => {
      const clean = val.replace(/\D/g, '');
      return clean.length === 11 || clean.length === 14;
    }, {
      message: 'CPF/CNPJ inválido.'
    }),
  // Chave PIX obrigatória
  pixKey: z.string()
    .min(1, 'Chave PIX inválida para o tipo selecionado.')
    .max(77, 'Chave PIX deve ter no máximo 77 caracteres'),
  // Tipo de Chave PIX
  pixKeyType: z.enum(['cpf_cnpj', 'email', 'telefone', 'uuid'], {
    required_error: 'Selecione o tipo de chave PIX.',
  }),
});

// Schema completo com validações conforme especificação
export const bankAccountSchema = baseBankAccountSchema.refine((data) => {
  // Validar documento do titular usando algoritmo de dígito verificador
  if (data.holderDocumentType === 'cpf') {
    return validateCPF(data.holderDocumentNumber);
  } else if (data.holderDocumentType === 'cnpj') {
    return validateCNPJ(data.holderDocumentNumber);
  }
  return false;
}, {
  message: "CPF/CNPJ inválido.",
  path: ["holderDocumentNumber"],
}).refine((data) => {
  // Validar chave PIX conforme tipo selecionado
  if (!data.pixKey || !data.pixKeyType) return false;
  
  switch (data.pixKeyType) {
    case 'cpf_cnpj':
      const cleanDoc = data.pixKey.replace(/\D/g, '');
      if (cleanDoc.length === 11) {
        return validateCPF(data.pixKey);
      } else if (cleanDoc.length === 14) {
        return validateCNPJ(data.pixKey);
      }
      return false;
    case 'email':
      return validateEmail(data.pixKey);
    case 'telefone':
      return validatePhone(data.pixKey);
    case 'uuid':
      return validateRandomKey(data.pixKey);
    default:
      return false;
  }
}, {
  message: "Chave PIX inválida para o tipo selecionado.",
  path: ["pixKey"],
});

// Função para retornar mensagem de erro específica baseada no tipo de chave PIX
export const getPixValidationMessage = (pixKeyType: string): string => {
  switch (pixKeyType) {
    case 'cpf_cnpj':
      return "CPF/CNPJ inválido. Digite apenas números (11 para CPF ou 14 para CNPJ)";
    case 'email':
      return "E-mail inválido. Digite um endereço de e-mail válido (exemplo@dominio.com)";
    case 'telefone':
      return "Telefone inválido. Digite com DDD: (XX) XXXXX-XXXX para celular ou (XX) XXXX-XXXX para fixo";
    case 'uuid':
      return "Chave aleatória inválida. Deve ser um UUID no formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
    default:
      return "Chave PIX inválida para o tipo selecionado";
  }
};

// Funções utilitárias para formatação com máscaras melhoradas
export const formatCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1.$2');
  if (clean.length <= 9) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  if (clean.length <= 11) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
  return clean.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj: string): string => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return clean.replace(/(\d{2})(\d+)/, '$1.$2');
  if (clean.length <= 8) return clean.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
  if (clean.length <= 12) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
  if (clean.length <= 14) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
  return clean.substring(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return `(${clean}`;
  if (clean.length <= 6) return clean.replace(/(\d{2})(\d+)/, '($1) $2');
  if (clean.length <= 10) return clean.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  return clean.substring(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

// Formatação para agência
export const formatAgency = (agency: string): string => {
  const clean = agency.replace(/\D/g, '');
  return clean.substring(0, 4);
};

// Formatação para número da conta
export const formatAccountNumber = (accountNumber: string): string => {
  const clean = accountNumber.replace(/[^\d-]/g, '');
  // Permitir números e um hífen opcional no final
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 2) {
      const mainPart = parts[0].substring(0, 12);
      const dvPart = parts[1].substring(0, 1);
      return `${mainPart}-${dvPart}`;
    }
  }
  return clean.substring(0, 12);
};

// Função para detectar automaticamente o tipo de chave PIX
export const detectPixKeyType = (key: string): string | null => {
  if (!key) return null;
  
  const cleanKey = key.replace(/\D/g, '');
  
  // CPF (11 dígitos) ou CNPJ (14 dígitos)
  if ((cleanKey.length === 11 && validateCPF(key)) || (cleanKey.length === 14 && validateCNPJ(key))) {
    return 'cpf_cnpj';
  }
  
  // Email
  if (key.includes('@') && validateEmail(key)) {
    return 'email';
  }
  
  // Telefone
  if ((cleanKey.length === 10 || cleanKey.length === 11) && validatePhone(key)) {
    return 'telefone';
  }
  
  // Chave aleatória (UUID)
  if (key.includes('-') && key.length === 36 && validateRandomKey(key)) {
    return 'uuid';
  }
  
  return null;
};

// Exportar funções de validação
export { validateCPF, validateCNPJ, validatePhone, validateEmail, validateRandomKey };

// Exportar o schema base para usar com .shape
export { baseBankAccountSchema };

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;