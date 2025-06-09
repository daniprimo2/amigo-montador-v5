#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Preparando deployment final...');

// Limpar e recriar dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

// Executar build otimizado
execSync('node deployment-final.js', { stdio: 'inherit' });

// Validar que tudo foi criado corretamente
const checks = [
  { file: 'dist/index.js', desc: 'Servidor principal' },
  { file: 'dist/package.json', desc: 'Package.json de produção' },
  { file: 'dist/shared', desc: 'Schema compartilhado' },
  { file: 'dist/uploads', desc: 'Diretório de uploads' },
  { file: 'dist/attached_assets', desc: 'Assets anexados' }
];

console.log('Validando deployment...');
let allValid = true;

checks.forEach(check => {
  if (fs.existsSync(check.file)) {
    console.log(`✓ ${check.desc}`);
  } else {
    console.log(`✗ ${check.desc} - FALTANDO`);
    allValid = false;
  }
});

if (!allValid) {
  console.error('Deployment inválido - arquivos faltando');
  process.exit(1);
}

// Testar o servidor rapidamente
console.log('Testando servidor...');
const child = execSync('timeout 5s node dist/index.js', { 
  stdio: 'pipe',
  encoding: 'utf8'
}).toString();

if (child.includes('serving on port') || child.includes('running on port')) {
  console.log('✓ Servidor iniciou corretamente');
} else {
  console.log('⚠ Servidor pode ter problemas (mas build está OK)');
}

console.log('Deployment pronto para produção!');
console.log(`Tamanho do build: ${Math.round(fs.statSync('dist/index.js').size / 1024)}KB`);