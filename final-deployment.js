#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Criando deployment final funcional...');

// Limpar dist completamente
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build do servidor com esbuild
console.log('📦 Compilando servidor...');
execSync(`npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --target=node18 \
  --define:process.env.NODE_ENV='"production"' \
  --external:express \
  --external:express-session \
  --external:express-fileupload \
  --external:passport \
  --external:passport-local \
  --external:drizzle-orm \
  --external:@neondatabase/serverless \
  --external:ws \
  --external:connect-pg-simple \
  --external:axios \
  --external:stripe \
  --external:zod \
  --external:drizzle-zod \
  --external:zod-validation-error \
  --external:node-fetch \
  --external:date-fns`, 
  { stdio: 'inherit' }
);

// Criar package.json simplificado
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "express-session": "^1.18.1", 
    "express-fileupload": "^1.5.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "ws": "^8.18.0",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.3",
    "@neondatabase/serverless": "^0.10.4",
    "axios": "^1.9.0",
    "stripe": "^18.1.0",
    "zod": "^3.24.2",
    "drizzle-zod": "^0.7.1",
    "zod-validation-error": "^3.4.0",
    "node-fetch": "^3.3.2",
    "date-fns": "^4.1.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Criar estrutura de diretórios
const dirs = ['uploads/documents', 'uploads/logos', 'uploads/profiles', 'uploads/projects', 'attached_assets', 'shared'];
dirs.forEach(dir => fs.mkdirSync(`dist/${dir}`, { recursive: true }));

// Copiar arquivos essenciais
if (fs.existsSync('shared')) fs.cpSync('shared', 'dist/shared', { recursive: true });
if (fs.existsSync('uploads')) fs.cpSync('uploads', 'dist/uploads', { recursive: true });
if (fs.existsSync('attached_assets')) fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
if (fs.existsSync('default-avatar.svg')) fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');

console.log('✅ Deployment criado com sucesso!');
console.log(`📁 Tamanho: ${Math.round(fs.statSync('dist/index.js').size / 1024)}KB`);
console.log('🎯 Pronto para produção - use: npm start');