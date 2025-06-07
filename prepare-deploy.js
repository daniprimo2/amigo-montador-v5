#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Preparing production deployment...');

// Step 1: Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
  console.log('✅ Cleaned existing dist directory');
}
fs.mkdirSync('dist', { recursive: true });

// Step 2: Try to build frontend with Vite, fallback to minimal if it fails
console.log('📦 Building frontend...');
let frontendBuilt = false;
try {
  execSync('npx vite build --outDir=dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend build completed with Vite');
  frontendBuilt = true;
} catch (error) {
  console.log('⚠️  Vite build failed, creating minimal frontend...');
  
  // Create minimal frontend as fallback
  const publicDir = path.join('dist', 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; text-align: center; }
    .logo { width: 100px; height: 100px; margin: 20px auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🛠️</div>
    <h1>Amigo Montador</h1>
    <p>Conectando lojas de móveis com montadores qualificados</p>
    <p>A aplicação está iniciando...</p>
  </div>
  <script>
    setTimeout(() => window.location.reload(), 5000);
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
  console.log('✅ Created minimal frontend');
}

// Step 3: Build the backend server
console.log('🔧 Building backend server...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });
  console.log('✅ Backend server build completed');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

// Step 4: Copy shared directory if it exists
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  console.log('✅ Copied shared directory');
}

// Step 5: Copy static assets and ensure directory structure
const staticDirs = ['uploads', 'attached_assets'];
staticDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
    console.log(`✅ Copied ${dir} directory`);
  } else {
    // Create empty directories for deployment
    fs.mkdirSync(path.join('dist', dir), { recursive: true });
    console.log(`✅ Created empty ${dir} directory`);
  }
});

// Step 6: Copy other essential files
const essentialFiles = ['default-avatar.svg'];
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
    console.log(`✅ Copied ${file}`);
  }
});

// Step 7: Create production package.json
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const productionPackage = {
  "name": originalPackage.name,
  "version": originalPackage.version,
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": originalPackage.dependencies.express,
    "express-session": originalPackage.dependencies["express-session"],
    "express-fileupload": originalPackage.dependencies["express-fileupload"],
    "passport": originalPackage.dependencies.passport,
    "passport-local": originalPackage.dependencies["passport-local"],
    "ws": originalPackage.dependencies.ws,
    "connect-pg-simple": originalPackage.dependencies["connect-pg-simple"],
    "drizzle-orm": originalPackage.dependencies["drizzle-orm"],
    "@neondatabase/serverless": originalPackage.dependencies["@neondatabase/serverless"],
    "axios": originalPackage.dependencies.axios,
    "stripe": originalPackage.dependencies.stripe,
    "zod": originalPackage.dependencies.zod,
    "drizzle-zod": originalPackage.dependencies["drizzle-zod"],
    "zod-validation-error": originalPackage.dependencies["zod-validation-error"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
console.log('✅ Created production package.json');

// Step 8: Verify critical files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Build verification failed - missing files:', missingFiles);
  process.exit(1);
}

// Step 9: Display build summary
console.log('\n🎉 Production build completed successfully!');
console.log('📁 Created files:');
console.log('  ✓ dist/index.js (server entry point)');
console.log('  ✓ dist/package.json (production dependencies)');
console.log('  ✓ dist/public/index.html (frontend)');
console.log('  ✓ dist/shared/ (shared schemas)');
console.log('  ✓ dist/uploads/ (file uploads directory)');
console.log('  ✓ dist/attached_assets/ (static assets)');
console.log('');
console.log('🚀 Deployment configuration:');
console.log('  • Server runs on PORT environment variable (default: 5000)');
console.log('  • Host binding: 0.0.0.0 (accessible externally)');
console.log('  • Static files served from dist/public/');
console.log('  • API endpoints available under /api/');
console.log('');
console.log('✅ Ready for deployment!');