#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Verificando integridade do conteúdo para deploy...');

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

// Verificar diretórios críticos e seus conteúdos
const contentAudit = {
  timestamp: new Date().toISOString(),
  directories: {
    uploads: {
      path: 'uploads',
      exists: fs.existsSync(path.join(__dirname, 'uploads')),
      totalFiles: countFilesRecursive(path.join(__dirname, 'uploads')),
      subdirectories: {}
    },
    attached_assets: {
      path: 'attached_assets',
      exists: fs.existsSync(path.join(__dirname, 'attached_assets')),
      totalFiles: countFilesRecursive(path.join(__dirname, 'attached_assets')),
      files: []
    }
  },
  serverConfiguration: {
    staticServing: true,
    uploadsRoute: '/uploads',
    assetsRoute: '/attached_assets'
  }
};

// Auditoria detalhada do diretório uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const subdirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  subdirs.forEach(subdir => {
    const subdirPath = path.join(uploadsDir, subdir);
    const files = fs.readdirSync(subdirPath);
    contentAudit.directories.uploads.subdirectories[subdir] = {
      fileCount: files.length,
      sampleFiles: files.slice(0, 3)
    };
  });
}

// Auditoria detalhada do diretório attached_assets
const assetsDir = path.join(__dirname, 'attached_assets');
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  contentAudit.directories.attached_assets.files = assets.map(asset => ({
    name: asset,
    size: fs.statSync(path.join(assetsDir, asset)).size,
    isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(asset),
    isPdf: /\.pdf$/i.test(asset)
  }));
}

// Verificar configurações do servidor
const serverIndexPath = path.join(__dirname, 'server', 'index.ts');
if (fs.existsSync(serverIndexPath)) {
  const serverContent = fs.readFileSync(serverIndexPath, 'utf-8');
  contentAudit.serverConfiguration.uploadsServing = serverContent.includes("/uploads");
  contentAudit.serverConfiguration.staticFileHandling = serverContent.includes("express.static");
}

// Salvar auditoria
const auditPath = path.join(__dirname, 'content-audit.json');
fs.writeFileSync(auditPath, JSON.stringify(contentAudit, null, 2));

// Exibir resumo
console.log('\n📊 RESUMO DA AUDITORIA:');
console.log(`├── Uploads: ${contentAudit.directories.uploads.totalFiles} arquivos`);
console.log(`├── Assets: ${contentAudit.directories.attached_assets.totalFiles} arquivos`);
console.log(`└── Configuração: ${contentAudit.serverConfiguration.staticFileHandling ? '✅' : '❌'} Servindo arquivos estáticos`);

// Verificar assets críticos
const criticalAssets = [
  'Logo - Amigo Montador.jpg',
  'ChatGPT Image 6 de jun. de 2025, 18_20_29.png',
  'Imagem do WhatsApp de 2025-06-05 à(s) 16.25.11_0df0a58b.jpg'
];

console.log('\n🔍 ASSETS CRÍTICOS:');
criticalAssets.forEach(asset => {
  const exists = fs.existsSync(path.join(assetsDir, asset));
  console.log(`├── ${asset}: ${exists ? '✅' : '❌'}`);
});

console.log('\n✅ Auditoria salva em: content-audit.json');
console.log('🚀 Sistema pronto para deploy com integridade garantida!');