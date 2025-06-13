#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Preparando build para produção...');

// Criar diretório dist se não existir
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Build do servidor
console.log('📦 Compilando servidor...');
try {
  execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --external:pg-native --external:bcrypt --external:express --external:ws', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Erro no build do servidor:', error.message);
  process.exit(1);
}

// Build do cliente
console.log('🎨 Compilando cliente...');
try {
  execSync('npx vite build --outDir dist/client', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Erro no build do cliente:', error.message);
  process.exit(1);
}

// Copiar arquivos necessários
console.log('📋 Copiando arquivos...');
try {
  // Copiar package.json
  copyFileSync('package.json', 'dist/package.json');
  
  // Copiar shared
  if (!existsSync('dist/shared')) {
    mkdirSync('dist/shared', { recursive: true });
  }
  copyFileSync('shared/schema.ts', 'dist/shared/schema.ts');
  
  // Copiar tsconfig.json
  copyFileSync('tsconfig.json', 'dist/tsconfig.json');
  
} catch (error) {
  console.error('❌ Erro ao copiar arquivos:', error.message);
  process.exit(1);
}

console.log('✅ Build concluído com sucesso!');
console.log('📁 Arquivos gerados em: dist/');