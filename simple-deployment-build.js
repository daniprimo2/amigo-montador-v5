#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building for deployment...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build backend server
console.log('Building server...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --target=node18', { stdio: 'inherit' });

// Create essential directories
const dirs = ['dist/uploads', 'dist/attached_assets', 'dist/shared'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy shared schemas and static assets
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

// Create deployment-ready index.html
const deploymentHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Conectando Lojas e Montadores</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores qualificados no Brasil">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      background: rgba(255,255,255,0.15);
      padding: 3rem;
      border-radius: 20px;
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255,255,255,0.2);
      max-width: 500px;
    }
    .logo {
      font-size: 5rem;
      margin-bottom: 1.5rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    .subtitle {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .status {
      padding: 1rem;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      margin-top: 2rem;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🛠️</div>
    <h1>Amigo Montador</h1>
    <p class="subtitle">Conectando lojas de móveis com montadores qualificados</p>
    <div class="status">
      <div class="loading"></div>
      <p>Inicializando aplicação...</p>
    </div>
  </div>
  <script>
    let attempts = 0;
    const maxAttempts = 30;
    
    function checkServer() {
      attempts++;
      fetch('/api/health')
        .then(response => {
          if (response.ok) {
            window.location.href = '/';
          } else {
            throw new Error('Server not ready');
          }
        })
        .catch(() => {
          if (attempts < maxAttempts) {
            setTimeout(checkServer, 2000);
          } else {
            document.querySelector('.status').innerHTML = 
              '<p>Servidor indisponível. Tente novamente em alguns minutos.</p>';
          }
        });
    }
    
    setTimeout(checkServer, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync('dist/index.html', deploymentHtml);

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
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

console.log('✅ Deployment build completed!');
console.log('Files created:');
console.log('- dist/index.js (server)');
console.log('- dist/index.html (frontend)');
console.log('- dist/package.json (dependencies)');
console.log('- dist/shared/ (schemas)');
console.log('- dist/uploads/ (user files)');
console.log('- dist/attached_assets/ (static assets)');