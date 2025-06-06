#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Preparando arquivos para deploy...');

// Compilar servidor
console.log('Compilando servidor...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=server-prod.js', { stdio: 'inherit' });

// Copiar arquivos necessários para a raiz
if (fs.existsSync('shared')) {
  if (fs.existsSync('shared-prod')) {
    fs.rmSync('shared-prod', { recursive: true });
  }
  fs.cpSync('shared', 'shared-prod', { recursive: true });
}

// Criar package.json de produção na raiz
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "server-prod.js",
  "scripts": {
    "start": "node server-prod.js",
    "dev": originalPkg.scripts.dev,
    "build": "node prepare-deploy.js",
    "check": originalPkg.scripts.check,
    "db:push": originalPkg.scripts["db:push"]
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
  "devDependencies": originalPkg.devDependencies,
  "engines": {
    "node": ">=18.0.0"
  }
};

// Fazer backup do package.json original
if (!fs.existsSync('package-dev.json')) {
  fs.copyFileSync('package.json', 'package-dev.json');
}

// Sobrescrever package.json com versão de produção
fs.writeFileSync('package.json', JSON.stringify(prodPkg, null, 2));

console.log('Arquivos preparados para deploy:');
console.log('- server-prod.js (servidor compilado)');
console.log('- package.json (atualizado para produção)');
console.log('- shared-prod/ (esquemas copiados)');
console.log('');
console.log('Deploy pronto! Execute "npm start" para testar.');