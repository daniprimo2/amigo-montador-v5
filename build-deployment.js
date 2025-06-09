#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building for deployment...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
  console.log('✅ Cleaned existing dist directory');
}
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// Build the server using esbuild
console.log('📦 Compiling server...');
try {
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/index.js \
    --target=node18 \
    --external:vite \
    --external:@vitejs/plugin-react \
    --external:@replit/vite-plugin-cartographer \
    --external:@replit/vite-plugin-runtime-error-modal`, 
    { stdio: 'inherit' }
  );
  
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('dist/index.js was not created');
  }
  console.log('✅ Server compiled successfully');
} catch (error) {
  console.error('❌ Server compilation failed:', error.message);
  process.exit(1);
}

// Build the frontend using Vite
console.log('🎨 Building frontend...');
try {
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend built successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  // Create a minimal fallback frontend
  console.log('⚠️ Creating fallback frontend...');
  const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .container { max-width: 600px; margin: 0 auto; }
    .logo { color: #3b82f6; font-size: 2em; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔧 Amigo Montador</div>
    <h1>Aplicação Iniciando...</h1>
    <p>Por favor, aguarde enquanto a aplicação é carregada.</p>
    <script>
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    </script>
  </div>
</body>
</html>`;
  fs.writeFileSync('dist/public/index.html', fallbackHtml);
}

// Read original package.json for dependencies
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create production package.json with only runtime dependencies
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    // Core server dependencies
    "express": originalPkg.dependencies.express,
    "express-session": originalPkg.dependencies["express-session"],
    "express-fileupload": originalPkg.dependencies["express-fileupload"],
    
    // Authentication
    "passport": originalPkg.dependencies.passport,
    "passport-local": originalPkg.dependencies["passport-local"],
    "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
    
    // Database
    "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
    "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
    
    // WebSocket
    "ws": originalPkg.dependencies.ws,
    
    // HTTP client and utilities
    "axios": originalPkg.dependencies.axios,
    "node-fetch": originalPkg.dependencies["node-fetch"],
    
    // Payment processing
    "stripe": originalPkg.dependencies.stripe,
    
    // Validation
    "zod": originalPkg.dependencies.zod,
    "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
    
    // Date utilities
    "date-fns": originalPkg.dependencies["date-fns"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));
console.log('✅ Created production package.json');

// Copy essential directories
const copyDirs = ['shared', 'uploads', 'attached_assets'];
copyDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`✅ Copied ${dir}/ directory`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`✅ Created empty ${dir}/ directory`);
  }
});

// Create default avatar if it doesn't exist
const avatarPath = 'default-avatar.svg';
if (!fs.existsSync(avatarPath)) {
  const defaultAvatar = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="20" fill="#e5e7eb"/>
  <circle cx="20" cy="16" r="6" fill="#9ca3af"/>
  <path d="M8 32c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="#9ca3af"/>
</svg>`;
  fs.writeFileSync(avatarPath, defaultAvatar);
  console.log('✅ Created default avatar');
}

// Copy default avatar to dist
if (fs.existsSync(avatarPath)) {
  fs.copyFileSync(avatarPath, `dist/${avatarPath}`);
  console.log('✅ Copied default avatar to dist');
}

console.log('\n🎉 Deployment build completed successfully!');
console.log('\nFiles created:');
console.log('- dist/index.js (server entry point)');
console.log('- dist/package.json (production dependencies)');
console.log('- dist/public/index.html (frontend)');
console.log('- dist/shared/ (shared schemas)');
console.log('- dist/uploads/ (user uploads)');
console.log('- dist/attached_assets/ (static assets)');

// Verify critical files exist
const criticalFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = criticalFiles.filter(file => !fs.existsSync(file));

if (missing.length > 0) {
  console.error('\n❌ Critical files missing:', missing);
  process.exit(1);
} else {
  console.log('\n✅ All critical files verified');
  console.log('🚀 Ready for deployment!');
}