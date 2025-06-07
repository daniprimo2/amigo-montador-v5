#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Preparando arquivos para deploy...');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Compilar servidor
console.log('Compilando servidor...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

// Copiar arquivos necessários para dist
if (fs.existsSync('shared')) {
  const sharedDest = path.join('dist', 'shared');
  if (fs.existsSync(sharedDest)) {
    fs.rmSync(sharedDest, { recursive: true });
  }
  fs.cpSync('shared', sharedDest, { recursive: true });
}

// Copy uploads directory if it exists
if (fs.existsSync('uploads')) {
  const uploadsDest = path.join('dist', 'uploads');
  if (fs.existsSync(uploadsDest)) {
    fs.rmSync(uploadsDest, { recursive: true });
  }
  fs.cpSync('uploads', uploadsDest, { recursive: true });
}

// Copy attached_assets directory if it exists
if (fs.existsSync('attached_assets')) {
  const assetsDest = path.join('dist', 'attached_assets');
  if (fs.existsSync(assetsDest)) {
    fs.rmSync(assetsDest, { recursive: true });
  }
  fs.cpSync('attached_assets', assetsDest, { recursive: true });
}

// Criar package.json de produção na raiz
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

// Write production package.json to dist directory
fs.writeFileSync(path.join('dist', 'package.json'), JSON.stringify(prodPkg, null, 2));

console.log('Arquivos preparados para deploy:');
console.log('- dist/index.js (servidor compilado)');
console.log('- dist/package.json (package.json de produção)');
console.log('- dist/shared/ (esquemas copiados)');
console.log('- dist/uploads/ (arquivos de upload)');
console.log('- dist/attached_assets/ (assets estáticos)');
console.log('');
console.log('Deploy pronto! Execute "cd dist && npm install && npm start" para testar.');