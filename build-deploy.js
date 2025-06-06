#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Criando build para deploy...');

// Remover dist anterior
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Compilar apenas o servidor
console.log('Compilando servidor...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

// Copiar arquivos necessários
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Criar package.json para deploy
const deployPackage = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
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
    "zod-validation-error": "^3.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(deployPackage, null, 2));

console.log('Build concluído!');
console.log('- dist/index.js (servidor compilado)');
console.log('- dist/package.json (dependências de produção)');