#!/usr/bin/env node

import fs from 'fs';

console.log('Corrigindo erros de sintaxe finais...');

// Corrigir assembler-dashboard.tsx
let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Corrigir problemas de sintaxe específicos
content = content
  // Corrigir linha 686 - remover vírgula órfã
  .replace(/\s*,\s*\n\s*\}\s*=\s*useMutation/, '\n  } = useMutation')
  // Corrigir linha 735 - remover vírgula órfã  
  .replace(/\s*,\s*\n\s*const\s+/, '\n  const ')
  // Corrigir linhas 357-359 - remover vírgulas órfãs
  .replace(/\s*,\s*\n\s*\/\/\s*Debug/g, '\n    // Debug')
  .replace(/\s*,\s*\n\s*\]/g, '\n  ]')
  // Garantir que a função retorna JSX
  .replace(/export const AssemblerDashboard[^{]*{/, 'export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {');

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

// Corrigir server/auth.ts - adicionar birthDate ao assembler
let authContent = fs.readFileSync('server/auth.ts', 'utf8');
authContent = authContent.replace(
  /const bankAccountData: InsertBankAccount = {[\s\S]*?};/,
  `const bankAccountData: InsertBankAccount = {
            userId: user.id,
            bankCode: '001',
            accountType: 'corrente',
            accountNumber: '000000',
            agency: '0000',
            holderName: user.name || 'Nome do Titular',
            holderDocument: '00000000000'
          };`
).replace(
  /const assemblerData = {[\s\S]*?};/,
  `const assemblerData = {
            userId: user.id,
            birthDate: new Date().toISOString().split('T')[0], // Data padrão
            address: formData.address || '',
            addressNumber: formData.addressNumber || '',
            neighborhood: formData.neighborhood || '',
            cep: formData.cep || '',
            city: formData.city || '',
            state: formData.state || '',
            specialties: formData.specialties || [],
            technicalAssistance: formData.technicalAssistance === 'yes',
            experience: formData.experience || '',
            workRadius: parseInt(formData.workRadius) || 0,
            rating: 0,
            documents: formData.documents || [],
            rgFrontUrl: formData.rgFrontUrl || '',
            rgBackUrl: formData.rgBackUrl || '',
            proofOfAddressUrl: formData.proofOfAddressUrl || '',
            professionalDescription: formData.professionalDescription || '',
            certificatesUrls: formData.certificatesUrls || []
          };`
);

fs.writeFileSync('server/auth.ts', authContent);

console.log('Erros de sintaxe corrigidos!');