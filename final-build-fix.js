#!/usr/bin/env node

import fs from 'fs';

console.log('Aplicando correção final para build...');

let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Remover todas as declarações duplicadas de queries e variáveis
content = content
  // Remover duplicatas de useWebSocket
  .replace(/const { connected, lastMessage } = useWebSocket\(\);[\s\S]*?\/\/ Hook para gerenciar avaliações obrigatórias/g, '// Hook para gerenciar avaliações obrigatórias')
  
  // Remover queries duplicadas
  .replace(/\/\/ Fetch available services with real distance calculation - force fresh data[\s\S]*?select: \(data: ServiceData\[\]\) => data,[\s\S]*?\}\);/g, '')
  
  // Remover outras queries duplicadas
  .replace(/\/\/ Fetch available services[\s\S]*?select: \(data: ServiceData\[\]\) => data,[\s\S]*?\}\);/g, '')
  .replace(/\/\/ Buscar serviços em andamento que o montador está participando[\s\S]*?\}\);/g, '')
  .replace(/\/\/ Buscar dados completos do montador logado[\s\S]*?\}\);/g, '')
  
  // Corrigir objeto serviceCounts com vírgulas ausentes
  .replace(/available: availableServices\.length\s*\/\/\s*pending:/g, 'available: availableServices.length,\n    // Aguardando Lojista\n    pending:')
  .replace(/pending: pendingServices\.length\s*\/\/\s*inProgress:/g, 'pending: pendingServices.length,\n    // Em andamento\n    inProgress:')
  .replace(/inProgress: inProgressServices\.length\s*\/\/\s*completed:/g, 'inProgress: inProgressServices.length,\n    // Finalizados\n    completed:');

// Garantir estrutura correta do objeto serviceCounts
const serviceCountsRegex = /const serviceCounts = \{[\s\S]*?\};/;
const serviceCountsReplacement = `const serviceCounts = {
    // Disponíveis: serviços abertos onde o montador ainda não se candidatou
    available: availableServices.length,
    // Aguardando Lojista: serviços onde o montador aplicou mas está pendente
    pending: pendingServices.length,
    // Em andamento: apenas contar serviços do activeServices com status 'in-progress'
    inProgress: inProgressServices.length,
    // Finalizados: apenas serviços do activeServices com status 'completed'
    completed: completedServicesFromActive.length
  };`;

content = content.replace(serviceCountsRegex, serviceCountsReplacement);

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Correção final aplicada!');