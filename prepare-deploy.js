#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Preparando build para produção...');

// Build da aplicação web
console.log('🎨 Compilando aplicação web...');
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Build web concluído');
} catch (error) {
  console.error('❌ Erro no build web:', error.message);
  process.exit(1);
}

// Verificar se dist foi criado
if (!fs.existsSync('./dist')) {
  console.error('❌ Pasta dist não foi criada');
  process.exit(1);
}

console.log('✅ Build de produção concluído com sucesso!');