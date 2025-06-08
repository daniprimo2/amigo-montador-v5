#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('📦 Building deployment assets...');

// Create production package.json
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
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
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
    "node-fetch": originalPkg.dependencies["node-fetch"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Create required directories
const dirs = ['dist/uploads', 'dist/attached_assets', 'dist/shared', 'dist/public'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy shared schema
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Copy assets
['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

// Copy default avatar
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
}

// Create minimal index.html for production
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Conectando lojas e montadores</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais qualificados no Brasil.">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #2563eb; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; }
    .loading { margin: 20px 0; color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Amigo Montador</h1>
    <p>Conectando lojas de móveis com montadores profissionais</p>
    <div class="loading">Aplicação inicializando...</div>
    <p>A plataforma está sendo carregada. Aguarde alguns instantes.</p>
  </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

console.log('✅ Deployment assets created successfully');
console.log('- Production package.json configured');
console.log('- Required directories created');
console.log('- Assets and schema copied');
console.log('- Production index.html created');