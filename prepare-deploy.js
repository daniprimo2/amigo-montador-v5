#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, cpSync } from 'fs';

console.log('🚀 Preparando build para produção...');

// Criar diretório dist se não existir
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Build apenas do cliente (frontend)
console.log('🎨 Compilando aplicação web...');
try {
  execSync('npx vite build --outDir dist/client', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Erro no build do cliente:', error.message);
  process.exit(1);
}

// Copiar arquivos do servidor para produção
console.log('📋 Preparando arquivos do servidor...');
try {
  // Copiar pasta server
  if (!existsSync('dist/server')) {
    mkdirSync('dist/server', { recursive: true });
  }
  cpSync('server', 'dist/server', { recursive: true });
  
  // Copiar shared
  if (!existsSync('dist/shared')) {
    mkdirSync('dist/shared', { recursive: true });
  }
  cpSync('shared', 'dist/shared', { recursive: true });
  
  // Copiar package.json
  copyFileSync('package.json', 'dist/package.json');
  
  // Copiar tsconfig.json
  copyFileSync('tsconfig.json', 'dist/tsconfig.json');
  
} catch (error) {
  console.error('❌ Erro ao copiar arquivos:', error.message);
  process.exit(1);
}

console.log('✅ Build concluído com sucesso!');
console.log('📁 Frontend gerado em: dist/client/');
console.log('📁 Servidor copiado para: dist/server/');
console.log('🎯 Pronto para Capacitor!');