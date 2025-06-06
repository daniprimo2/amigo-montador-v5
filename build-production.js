#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('🚀 Iniciando build de produção...');

// Limpar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // 1. Build do cliente (frontend)
  console.log('📦 Construindo frontend...');
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });

  // 2. Build do servidor (backend)
  console.log('⚙️ Construindo servidor...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

  // 3. Criar package.json de produção
  console.log('📄 Criando package.json de produção...');
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const prodPkg = {
    "name": "amigo-montador",
    "version": "1.0.0",
    "type": "module",
    "main": "index.js",
    "scripts": {
      "start": "node index.js"
    },
    "dependencies": {
      "express": originalPkg.dependencies.express,
      "express-session": originalPkg.dependencies["express-session"],
      "express-fileupload": originalPkg.dependencies["express-fileupload"],
      "passport": originalPkg.dependencies.passport,
      "passport-local": originalPkg.dependencies["passport-local"],
      "ws": originalPkg.dependencies.ws,
      "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
      "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
      "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
      "axios": originalPkg.dependencies.axios,
      "stripe": originalPkg.dependencies.stripe,
      "zod": originalPkg.dependencies.zod,
      "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
      "zod-validation-error": originalPkg.dependencies["zod-validation-error"]
    },
    "engines": {
      "node": ">=18.0.0"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // 4. Copiar arquivos necessários
  console.log('📂 Copiando arquivos...');
  
  // Copiar shared/schema.ts (necessário para o servidor)
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copiar assets
  if (fs.existsSync('attached_assets')) {
    fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  if (fs.existsSync('uploads')) {
    fs.cpSync('uploads', 'dist/uploads', { recursive: true });
  }

  // Verificar se os arquivos necessários existem
  const requiredFiles = [
    'dist/index.js',
    'dist/package.json',
    'dist/public/index.html'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Build falhou - arquivos ausentes:', missingFiles);
    process.exit(1);
  }

  console.log('✅ Build de produção concluído com sucesso!');
  console.log('📋 Resumo:');
  console.log('   - Frontend construído em dist/public/');
  console.log('   - Servidor construído como dist/index.js');
  console.log('   - Dependências configuradas para produção');
  console.log('   - Pronto para deploy no Replit');

} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}