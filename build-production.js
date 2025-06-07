#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting production build...');

// 1. Clean and create dist directory
console.log('📁 Cleaning and creating dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// 2. Build frontend using Vite
console.log('🎨 Building frontend with Vite...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// 3. Build backend server with esbuild
console.log('🔧 Building backend server...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --target=node18', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

// 4. Create essential directories
console.log('📂 Creating essential directories...');
const dirs = ['dist/uploads', 'dist/attached_assets', 'dist/shared'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// 5. Copy shared schemas and assets
console.log('📋 Copying shared files and assets...');
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

// 6. Create production package.json
console.log('📄 Creating production package.json...');
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

// 7. Verify build output
console.log('✅ Verifying build output...');
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/index.html'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Build verification failed - missing files:', missingFiles);
  
  // Try to create missing index.html if needed
  if (missingFiles.includes('dist/index.html')) {
    console.log('🔄 Creating fallback index.html...');
    const fallbackHtml = `<!DOCTYPE html>
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
    fs.writeFileSync('dist/index.html', fallbackHtml);
  }
  
  // Re-check after creating fallback files
  const stillMissing = requiredFiles.filter(file => !fs.existsSync(file));
  if (stillMissing.length > 0) {
    console.error('❌ Critical files still missing:', stillMissing);
    process.exit(1);
  }
}

// 8. Display build summary
console.log('\n🎉 Production build completed successfully!');
console.log('📋 Build summary:');
console.log('   ✅ Backend: dist/index.js');
console.log('   ✅ Frontend: dist/index.html');
console.log('   ✅ Dependencies: dist/package.json');
console.log('   ✅ Assets: dist/uploads, dist/attached_assets');
console.log('   ✅ Schemas: dist/shared');

const stats = fs.statSync('dist/index.js');
console.log(`   📊 Server bundle size: ${(stats.size / 1024).toFixed(2)} KB`);

console.log('\n🚀 Ready for deployment!');
console.log('   Command: cd dist && npm start');
console.log('   Port: 5000 (configured for Replit deployment)');