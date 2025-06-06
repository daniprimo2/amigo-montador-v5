#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Verificação pós-deploy iniciada...');

// Carregar audit de referência
const auditPath = path.join(__dirname, 'content-audit.json');
if (!fs.existsSync(auditPath)) {
  console.error('❌ Arquivo de auditoria não encontrado!');
  process.exit(1);
}

const preDeployAudit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
console.log(`📋 Audit de referência: ${preDeployAudit.timestamp}`);

// Função para contar arquivos recursivamente
function countFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return 0;
  
  let count = 0;
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      count += countFilesRecursive(itemPath);
    } else {
      count++;
    }
  }
  
  return count;
}

// Verificação atual
const currentState = {
  uploads: {
    exists: fs.existsSync(path.join(__dirname, 'uploads')),
    totalFiles: countFilesRecursive(path.join(__dirname, 'uploads'))
  },
  assets: {
    exists: fs.existsSync(path.join(__dirname, 'attached_assets')),
    totalFiles: countFilesRecursive(path.join(__dirname, 'attached_assets'))
  }
};

// Comparação com estado anterior
const uploadsMatch = currentState.uploads.totalFiles === preDeployAudit.directories.uploads.totalFiles;
const assetsMatch = currentState.assets.totalFiles === preDeployAudit.directories.attached_assets.totalFiles;

console.log('\n📊 COMPARAÇÃO PRÉ/PÓS DEPLOY:');
console.log(`├── Uploads: ${preDeployAudit.directories.uploads.totalFiles} → ${currentState.uploads.totalFiles} ${uploadsMatch ? '✅' : '❌'}`);
console.log(`└── Assets: ${preDeployAudit.directories.attached_assets.totalFiles} → ${currentState.assets.totalFiles} ${assetsMatch ? '✅' : '❌'}`);

// Verificar assets críticos novamente
const criticalAssets = [
  'Logo - Amigo Montador.jpg',
  'ChatGPT Image 6 de jun. de 2025, 18_20_29.png',
  'Imagem do WhatsApp de 2025-06-05 à(s) 16.25.11_0df0a58b.jpg'
];

console.log('\n🔍 ASSETS CRÍTICOS PÓS-DEPLOY:');
const assetsDir = path.join(__dirname, 'attached_assets');
criticalAssets.forEach(asset => {
  const exists = fs.existsSync(path.join(assetsDir, asset));
  console.log(`├── ${asset}: ${exists ? '✅' : '❌'}`);
});

const allGood = uploadsMatch && assetsMatch && 
  criticalAssets.every(asset => fs.existsSync(path.join(assetsDir, asset)));

if (allGood) {
  console.log('\n🎉 DEPLOY VERIFICADO COM SUCESSO!');
  console.log('✅ Todo o conteúdo permanece idêntico');
} else {
  console.log('\n⚠️  ATENÇÃO: Diferenças detectadas no deploy');
  process.exit(1);
}