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

// Função para validar telefone com DDD
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  
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

// Função para validar email
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Função para validar chave aleatória (UUID v4)
const validateRandomKey = (key: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
};

// Schema base para validação dos dados bancários (sem refinements para poder usar .shape)
const baseBankAccountSchema = z.object({
  bankName: z.string()
    .min(1, 'Nome do banco é obrigatório')
    .max(100, 'Nome do banco deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s0-9\-\.]+$/, 'Nome do banco contém caracteres inválidos'),
  accountType: z.enum(['corrente', 'poupança'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  accountNumber: z.string()
    .min(1, 'Número da conta é obrigatório')
    .max(20, 'Número da conta deve ter no máximo 20 caracteres')
    .regex(/^[0-9\-]+$/, 'Número da conta deve conter apenas números e hífens'),
  agency: z.string()
    .min(1, 'Agência é obrigatória')
    .max(10, 'Agência deve ter no máximo 10 caracteres')
    .regex(/^[0-9\-]+$/, 'Agência deve conter apenas números e hífens'),
  holderName: z.string()
    .min(3, 'Nome do titular deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do titular deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome do titular deve conter apenas letras e espaços'),
  holderDocumentType: z.enum(['cpf', 'cnpj'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  holderDocumentNumber: z.string()
    .min(1, 'Número do documento é obrigatório')
    .refine((val) => val.replace(/\D/g, '').length >= 11, {
      message: 'Número do documento deve ter pelo menos 11 dígitos'
    }),
  pixKey: z.string()
    .min(1, 'Chave PIX é obrigatória para receber pagamentos')
    .max(77, 'Chave PIX deve ter no máximo 77 caracteres'),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatória'], {
    required_error: 'Tipo de chave PIX é obrigatório',
  }),
});

// Schema completo com validações complexas
export const bankAccountSchema = baseBankAccountSchema.refine((data) => {
  // Validar documento do titular
  if (data.holderDocumentType === 'cpf') {
    return validateCPF(data.holderDocumentNumber);
  } else if (data.holderDocumentType === 'cnpj') {
    return validateCNPJ(data.holderDocumentNumber);
  }
  return false;
}, {
  message: "CPF ou CNPJ do titular inválido. Verifique os dígitos verificadores.",
  path: ["holderDocumentNumber"],
}).refine((data) => {
  // Validar chave PIX - obrigatória e deve ser compatível com o tipo
  if (!data.pixKey || !data.pixKeyType) return false;
  
  switch (data.pixKeyType) {
    case 'cpf':
      return validateCPF(data.pixKey);
    case 'cnpj':
      return validateCNPJ(data.pixKey);
    case 'email':
      return validateEmail(data.pixKey);
    case 'telefone':
      return validatePhone(data.pixKey);
    case 'aleatória':
      return validateRandomKey(data.pixKey);
    default:
      return false;
  }
}, {
  message: "Chave PIX inválida para o tipo selecionado",
  path: ["pixKey"],
}).refine((data) => {
  // Validação adicional: garantir formatação correta baseada no tipo
  if (!data.pixKey || !data.pixKeyType) return false;
  
  switch (data.pixKeyType) {
    case 'cpf':
      return data.pixKey.replace(/\D/g, '').length === 11 && validateCPF(data.pixKey);
    case 'cnpj':
      return data.pixKey.replace(/\D/g, '').length === 14 && validateCNPJ(data.pixKey);
    case 'email':
      return data.pixKey.includes('@') && data.pixKey.includes('.') && validateEmail(data.pixKey);
    case 'telefone':
      const cleanPhone = data.pixKey.replace(/\D/g, '');
      return (cleanPhone.length === 10 || cleanPhone.length === 11) && validatePhone(data.pixKey);
    case 'aleatória':
      return data.pixKey.includes('-') && data.pixKey.length === 36 && validateRandomKey(data.pixKey);
    default:
      return true;
  }
}, {
  message: "Formato da chave PIX incorreto para o tipo selecionado",
  path: ["pixKey"],
});

// Função para retornar mensagem de erro específica baseada no tipo de chave PIX
export const getPixValidationMessage = (pixKeyType: string): string => {
  switch (pixKeyType) {
    case 'cpf':
      return "CPF inválido. Digite apenas números (11 dígitos) ou no formato XXX.XXX.XXX-XX";
    case 'cnpj':
      return "CNPJ inválido. Digite apenas números (14 dígitos) ou no formato XX.XXX.XXX/XXXX-XX";
    case 'email':
      return "E-mail inválido. Digite um endereço de e-mail válido (exemplo@dominio.com)";
    case 'telefone':
      return "Telefone inválido. Digite com DDD: (XX) XXXXX-XXXX para celular ou (XX) XXXX-XXXX para fixo";
    case 'aleatória':
      return "Chave aleatória inválida. Deve ser um UUID no formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
    default:
      return "Chave PIX inválida para o tipo selecionado";
  }
};

// Funções utilitárias para formatação
export const formatCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length <= 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
};

export const formatCNPJ = (cnpj: string): string => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length <= 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
};

export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

// Função para detectar automaticamente o tipo de chave PIX
export const detectPixKeyType = (key: string): string | null => {
  if (!key) return null;
  
  const cleanKey = key.replace(/\D/g, '');
  
  // CPF (11 dígitos)
  if (cleanKey.length === 11 && validateCPF(key)) {
    return 'cpf';
  }
  
  // CNPJ (14 dígitos)
  if (cleanKey.length === 14 && validateCNPJ(key)) {
    return 'cnpj';
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
    return 'aleatória';
  }
  
  return null;
};

// Exportar funções de validação
export { validateCPF, validateCNPJ, validatePhone, validateEmail, validateRandomKey };

// Exportar o schema base para usar com .shape
export { baseBankAccountSchema };

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;