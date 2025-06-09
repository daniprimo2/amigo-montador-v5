#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Criando deployment final otimizado...');

// Limpar e criar dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Compilar servidor com esbuild
console.log('Compilando servidor...');
execSync(`npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --target=node18 \
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

// Criar package.json de produção
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
    "node-fetch": originalPkg.dependencies["node-fetch"],
    "date-fns": originalPkg.dependencies["date-fns"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Criar diretórios necessários
['uploads/documents', 'uploads/logos', 'uploads/profiles', 'uploads/projects', 'attached_assets', 'shared', 'public'].forEach(dir => {
  fs.mkdirSync(`dist/${dir}`, { recursive: true });
});

// Copiar arquivos essenciais
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}
if (fs.existsSync('uploads')) {
  fs.cpSync('uploads', 'dist/uploads', { recursive: true });
}
if (fs.existsSync('attached_assets')) {
  fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
}
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
}

// Criar index.html básico para produção
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #2563eb; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 1rem; }
    .loading {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #2563eb;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 1rem auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .btn {
      background: #2563eb;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Amigo Montador</h1>
    <p>Conectando lojas e montadores</p>
    <div class="loading"></div>
    <p>Carregando aplicação...</p>
    <a href="/" class="btn">Acessar Sistema</a>
  </div>
  <script>
    setTimeout(() => {
      fetch('/api/health')
        .then(r => r.json())
        .then(d => {
          if (d.status === 'healthy') {
            document.querySelector('p').textContent = 'Sistema online';
          }
        })
        .catch(() => {});
    }, 1000);
  </script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

console.log('Deployment criado com sucesso!');
console.log(`Arquivo principal: ${Math.round(fs.statSync('dist/index.js').size / 1024)}KB`);
console.log('Pronto para produção.');