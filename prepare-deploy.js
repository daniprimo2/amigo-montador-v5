#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando o build da aplicação...');

try {
  // Executa o build do Vite
  console.log('📦 Fazendo build do frontend com Vite...');
  execSync('npx vite build', { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  
  console.log('✅ Build concluído com sucesso!');
  console.log('📁 Arquivos de build salvos em: dist/public/');
  
} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}