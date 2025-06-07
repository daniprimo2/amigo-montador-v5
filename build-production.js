#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting production build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
  console.log('✅ Cleaned existing dist directory');
}
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// 1. Build frontend with Vite
console.log('📦 Building frontend...');
try {
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// 2. Build server with esbuild
console.log('🔧 Building server...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// 3. Copy static assets
console.log('📂 Copying static assets...');
const assetDirs = ['uploads', 'attached_assets', 'shared'];
assetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const destPath = path.join('dist', dir);
    fs.cpSync(dir, destPath, { recursive: true });
    console.log(`✅ Copied ${dir}/ to dist/${dir}/`);
  }
});

// Copy default-avatar.svg if it exists
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  console.log('✅ Copied default-avatar.svg');
}

// 4. Create production package.json
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
console.log('✅ Created production package.json');

// 5. Verify all required files exist
console.log('🔍 Verifying build...');
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

// Check file sizes
const stats = {
  server: fs.statSync('dist/index.js').size,
  frontend: fs.statSync('dist/public/index.html').size,
  packageJson: fs.statSync('dist/package.json').size
};

console.log('📊 Build statistics:');
console.log(`   Server: ${(stats.server / 1024).toFixed(1)} KB`);
console.log(`   Frontend: ${(stats.frontend / 1024).toFixed(1)} KB`);
console.log(`   Package: ${(stats.packageJson / 1024).toFixed(1)} KB`);

console.log('✅ Production build completed successfully!');
console.log('📁 Files created:');
console.log('   - dist/index.js (production server)');
console.log('   - dist/package.json (production dependencies)');
console.log('   - dist/public/ (built frontend)');
console.log('   - dist/uploads/ (static assets)');
console.log('   - dist/attached_assets/ (media files)');
console.log('');
console.log('🚀 Ready for deployment!');