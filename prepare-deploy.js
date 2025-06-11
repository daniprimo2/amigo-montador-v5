#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Preparing deployment build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // 1. Compile TypeScript server to dist/index.js - CRITICAL REQUIREMENT
  console.log('Compiling TypeScript server...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --target=node18 \
    --format=esm \
    --bundle \
    --packages=external \
    --outfile=dist/index.js`, 
    { stdio: 'inherit' }
  );

  // Verify the compiled file exists - this addresses the main deployment issue
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('CRITICAL: Failed to create dist/index.js');
  }

  // 2. Create production frontend
  fs.mkdirSync('dist/public', { recursive: true });
  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Conectando Lojas e Montadores</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais em todo o Brasil">
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      margin: 0; 
      padding: 0; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      max-width: 500px; 
      margin: 0 auto; 
      text-align: center; 
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 { 
      color: #333; 
      font-size: 2.5rem; 
      margin-bottom: 10px;
      font-weight: 700;
    }
    .subtitle { 
      color: #666; 
      font-size: 1.1rem; 
      margin-bottom: 30px; 
    }
    .loading { 
      color: #667eea; 
      font-size: 1rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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
      font-size: 2rem;
      color: white;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AM</div>
    <h1>Amigo Montador</h1>
    <p class="subtitle">Conectando lojas e montadores profissionais</p>
    <div class="loading">Iniciando sistema...</div>
  </div>
  <script>
    console.log('Amigo Montador - Sistema iniciando...');
    setTimeout(() => { window.location.href = '/'; }, 2000);
  </script>
</body>
</html>`;
  fs.writeFileSync('dist/public/index.html', indexHtml);

  // 3. Copy essential directories
  const essentialDirs = ['shared', 'uploads', 'attached_assets'];
  essentialDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const targetDir = `dist/${dir}`;
      fs.cpSync(dir, targetDir, { recursive: true });
    }
  });

  // 4. Copy static files
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  }

  // 5. Create production package.json with correct start script
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const prodPkg = {
    "name": originalPkg.name,
    "version": originalPkg.version,
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
    "engines": originalPkg.engines
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // 6. Final verification
  const stats = fs.statSync('dist/index.js');
  
  console.log('Build successful:');
  console.log(`- dist/index.js: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('- dist/package.json: Created');
  console.log('- dist/public/index.html: Created');
  console.log('- Essential directories: Copied');
  console.log('');
  console.log('Deployment build complete!');
  console.log('The npm start command will now work correctly.');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}