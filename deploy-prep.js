#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Preparando deploy - garantindo integridade do conteúdo...');

// Verificar se diretórios críticos existem
const criticalDirs = ['uploads', 'attached_assets'];
criticalDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 Criando diretório: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.log(`✅ Diretório existe: ${dir}`);
  }
});

// Verificar arquivos de configuração essenciais
const configFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'drizzle.config.ts',
  'tailwind.config.ts'
];

configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Arquivo de configuração: ${file}`);
  } else {
    console.error(`❌ ERRO: Arquivo essencial ausente: ${file}`);
    process.exit(1);
  }
});

// Verificar se existe conteúdo em attached_assets
const assetsDir = path.join(__dirname, 'attached_assets');
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  console.log(`📎 Assets encontrados: ${assets.length} arquivos`);
  
  // Listar alguns assets importantes
  const importantAssets = assets.filter(asset => 
    asset.includes('Logo') || 
    asset.includes('Imagem') || 
    asset.includes('ChatGPT')
  );
  
  if (importantAssets.length > 0) {
    console.log(`🖼️  Assets importantes:`);
    importantAssets.slice(0, 5).forEach(asset => {
      console.log(`   - ${asset}`);
    });
  }
}

// Verificar uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const subdirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📂 Subdiretórios em uploads: ${subdirs.join(', ')}`);
  
  // Contar arquivos em cada subdiretório
  subdirs.forEach(subdir => {
    const subdirPath = path.join(uploadsDir, subdir);
    const files = fs.readdirSync(subdirPath);
    console.log(`   ${subdir}: ${files.length} arquivos`);
  });
}

// Criar arquivo de manifesto para verificação pós-deploy
const manifest = {
  deployTimestamp: new Date().toISOString(),
  criticalDirectories: criticalDirs.map(dir => ({
    name: dir,
    exists: fs.existsSync(path.join(__dirname, dir)),
    fileCount: fs.existsSync(path.join(__dirname, dir)) 
      ? fs.readdirSync(path.join(__dirname, dir)).length 
      : 0
  })),
  configFiles: configFiles.map(file => ({
    name: file,
    exists: fs.existsSync(path.join(__dirname, file))
  }))
};

fs.writeFileSync(
  path.join(__dirname, 'deployment-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('✅ Preparação concluída! Manifesto criado em deployment-manifest.json');
console.log('🔒 Todos os arquivos e diretórios críticos foram verificados');