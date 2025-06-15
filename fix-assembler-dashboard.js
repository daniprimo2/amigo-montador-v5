#!/usr/bin/env node

import fs from 'fs';

console.log('Corrigindo assembler-dashboard.tsx...');

// Ler o arquivo atual
const content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Remover linhas corrompidas e corrigir sintaxe
const fixedContent = content
  // Remover linhas com sintaxe quebrada
  .replace(/\s*,"\s*completedServicesFromRaw\.length\);?\s*/g, '')
  .replace(/\s*,"\s*completedServicesFromActive\.length\);?\s*/g, '')
  .replace(/\s*\}\)\)\);\s*/g, '')
  .replace(/\s*\)\);\s*$/gm, '')
  .replace(/\s*=>\s*\(\{\s*id:\s*s\.id,\s*title:\s*s\.title,\s*status:\s*s\.status\s*\}\)\)\);\s*/g, '')
  .replace(/\s*=>\s*\(\{\s*id:\s*s\.id,\s*title:\s*s\.title,\s*status:\s*s\.status\s*\}\)\)\s*\|\|\s*\[\];\s*/g, '')
  // Remover declarações duplicadas de pendingServices
  .replace(/const\s+pendingServices\s*=\s*rawServices\?\.\filter.*?\}\)\)\);\s*/s, '')
  // Remover comentários de debug corrompidos
  .replace(/\/\/\s*Debug.*?\n/g, '')
  // Corrigir função principal
  .replace(/export const AssemblerDashboard[^{]*\{/, 'export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {')
  // Garantir return statement correto
  .replace(/(\s+)(\w+Dashboard.*?)$/, '$1return $2');

// Salvar arquivo corrigido
fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', fixedContent);

console.log('Arquivo corrigido com sucesso!');