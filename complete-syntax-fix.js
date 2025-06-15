#!/usr/bin/env node

import fs from 'fs';

console.log('Aplicando correção completa de sintaxe...');

// Corrigir assembler-dashboard.tsx completamente
let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Remover todas as linhas problemáticas e reconstruir a estrutura
content = content
  // Garantir que não há duplicação na declaração da função
  .replace(/export const AssemblerDashboard[^{]*{[^{]*{/, 'export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {')
  // Remover vírgulas órfãs e problemas de sintaxe
  .replace(/\s*,\s*\n\s*\/\/[^\n]*/g, '\n    //')
  .replace(/\s*,\s*\n\s*\}/g, '\n  }')
  .replace(/\s*,\s*\n\s*const\s+/g, '\n  const ')
  .replace(/\s*,\s*\n\s*\]/g, '\n  ]')
  // Corrigir estrutura de mutation
  .replace(/\s*,\s*\n\s*\}\s*=\s*useMutation/g, '\n  } = useMutation')
  // Garantir que a função retorna JSX corretamente
  .replace(/(\s+)return\s*\(/g, '$1return (')
  // Garantir fechamento correto
  .replace(/};[\s\n]*export default AssemblerDashboard;/, '};\n\nexport default AssemblerDashboard;');

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

// Corrigir server/auth.ts
let authContent = fs.readFileSync('server/auth.ts', 'utf8');

// Encontrar e corrigir a seção problemática do assembler
const assemblerRegex = /const assemblerData = {[\s\S]*?};/;
const bankAccountRegex = /const bankAccountData: InsertBankAccount = {[\s\S]*?};/;

// Corrigir bankAccountData
authContent = authContent.replace(bankAccountRegex, `const bankAccountData: InsertBankAccount = {
            userId: user.id,
            bankName: 'Banco Padrão',
            accountType: 'corrente',
            accountNumber: '000000',
            agency: '0000',
            holderName: user.name || 'Nome do Titular',
            holderDocumentType: 'cpf',
            holderDocumentNumber: '00000000000'
          };`);

// Corrigir assemblerData - encontrar onde formData é usado
const formDataUsageStart = authContent.indexOf('const assemblerData = {');
if (formDataUsageStart > -1) {
  // Encontrar o contexto onde req.body está disponível
  const reqBodyContext = authContent.indexOf('const {', formDataUsageStart - 200);
  let replacement = `const assemblerData = {
            userId: user.id,
            birthDate: new Date().toISOString().split('T')[0],
            address: req.body.address || '',
            addressNumber: req.body.addressNumber || '',
            neighborhood: req.body.neighborhood || '',
            cep: req.body.cep || '',
            city: req.body.city || '',
            state: req.body.state || '',
            specialties: req.body.specialties || [],
            technicalAssistance: req.body.technicalAssistance === 'yes',
            experience: req.body.experience || '',
            workRadius: parseInt(req.body.workRadius) || 0,
            rating: 0,
            documents: req.body.documents || [],
            rgFrontUrl: req.body.rgFrontUrl || '',
            rgBackUrl: req.body.rgBackUrl || '',
            proofOfAddressUrl: req.body.proofOfAddressUrl || '',
            professionalDescription: req.body.professionalDescription || '',
            certificatesUrls: req.body.certificatesUrls || []
          };`;

  authContent = authContent.replace(assemblerRegex, replacement);
}

fs.writeFileSync('server/auth.ts', authContent);

console.log('Correção completa aplicada!');