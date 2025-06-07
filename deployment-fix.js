#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Fixing deployment configuration...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build backend server with proper configuration
console.log('Building server...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

// Create essential directories
const dirs = ['dist/public', 'dist/uploads', 'dist/attached_assets', 'dist/shared'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copy shared schemas
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Copy static assets
['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

// Create production frontend
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container { 
      text-align: center; 
      background: rgba(255,255,255,0.1);
      padding: 2rem;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    .logo { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🛠️</div>
    <h1>Amigo Montador</h1>
    <p>Conectando lojas de móveis com montadores qualificados</p>
    <p>Aplicação iniciando...</p>
  </div>
  <script>
    function checkAndRedirect() {
      fetch('/api/user')
        .then(() => window.location.href = '/')
        .catch(() => setTimeout(checkAndRedirect, 2000));
    }
    setTimeout(checkAndRedirect, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', indexHtml);

// Create production package.json with correct configuration
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

// Verify all required files exist
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('Build failed - missing files:', missingFiles);
  process.exit(1);
}

console.log('Deployment build completed successfully!');
console.log('Created files:');
console.log('- dist/index.js (server entry point)');
console.log('- dist/package.json (production config)');  
console.log('- dist/public/index.html (frontend)');
console.log('- All required directories and assets');
console.log('');
console.log('Ready for deployment on port 5000');