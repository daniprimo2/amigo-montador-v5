#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('Preparando build de produção...');

// 1. Build da aplicação web
console.log('Compilando aplicação...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Criar AAB para Android se necessário
if (process.argv.includes('--android')) {
  console.log('Gerando AAB para Android...');
  
  // Importar e executar geração do AAB
  const { createPlayStoreAAB } = await import('./create-final-playstore-aab.js');
  createPlayStoreAAB();
  
  console.log('AAB criado com sucesso!');
}

console.log('Build de produção concluído!');