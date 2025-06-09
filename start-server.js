#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

console.log(`Iniciando servidor - Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

if (isProduction) {
  // Em produção, garantir que o build existe
  if (!fs.existsSync('dist/index.js')) {
    console.log('Build não encontrado, criando...');
    execSync('node deployment-final.js', { stdio: 'inherit' });
  }
  
  // Verificar se o build foi criado com sucesso
  if (!fs.existsSync('dist/index.js')) {
    console.error('ERRO: Falha ao criar dist/index.js');
    process.exit(1);
  }
  
  console.log('Iniciando servidor de produção...');
  execSync('node dist/index.js', { stdio: 'inherit' });
  
} else {
  // Em desenvolvimento, usar tsx
  console.log('Iniciando servidor de desenvolvimento...');
  execSync('tsx server/index.ts', { stdio: 'inherit' });
}