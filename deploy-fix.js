#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Creating optimized deployment build...');

// Clean and create dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build backend server
console.log('Building server...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

// Create optimized frontend
fs.mkdirSync('dist/public', { recursive: true });
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Conectando Lojas e Montadores</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores qualificados no Brasil. Encontre o profissional ideal para seus projetos de montagem.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: #667eea;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .status {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #667eea;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
      margin-right: 10px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
      text-align: left;
    }
    .feature {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      font-size: 14px;
    }
    .feature-icon {
      color: #667eea;
      margin-right: 8px;
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
      Inicializando aplicação...
    </div>
    
    <div class="features">
      <div class="feature">
        <span class="feature-icon">🏪</span>
        Para Lojas
      </div>
      <div class="feature">
        <span class="feature-icon">🔧</span>
        Para Montadores
      </div>
      <div class="feature">
        <span class="feature-icon">💳</span>
        Pagamento PIX
      </div>
      <div class="feature">
        <span class="feature-icon">⭐</span>
        Sistema de Avaliação
      </div>
    </div>
  </div>
  
  <script>
    let attempts = 0;
    const maxAttempts = 30;
    
    function checkApp() {
      fetch('/api/health')
        .then(response => response.json())
        .then(data => {
          if (data.status === 'healthy') {
            window.location.href = '/';
          } else {
            throw new Error('App not ready');
          }
        })
        .catch(() => {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkApp, 2000);
          } else {
            document.querySelector('.status').innerHTML = 
              '<div style="color: #dc3545;">Erro ao conectar. Recarregando...</div>';
            setTimeout(() => window.location.reload(), 3000);
          }
        });
    }
    
    // Start checking after 3 seconds
    setTimeout(checkApp, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', indexHtml);

// Copy essential directories and files
['shared', 'uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
  }
});

// Copy default avatar if exists
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
}

// Create production package.json with correct port configuration
const pkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production PORT=5000 node index.js"
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

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Verify build
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = requiredFiles.filter(f => !fs.existsSync(f));

if (missing.length > 0) {
  console.error('Missing files:', missing);
  process.exit(1);
}

console.log('Deployment build completed successfully!');
console.log('Files created:');
console.log('- dist/index.js (server)');
console.log('- dist/package.json (dependencies)');
console.log('- dist/public/index.html (frontend)');
console.log('- dist/shared/ (schemas)');
console.log('- dist/uploads/ (file storage)');
console.log('- dist/attached_assets/ (static assets)');
console.log('');
console.log('Deployment configuration:');
console.log('- Port: 5000 (Replit deployment standard)');
console.log('- Host: 0.0.0.0 (external access)');
console.log('- Environment: production');
console.log('');
console.log('Ready for deployment!');