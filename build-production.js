#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building for production deployment...');

// Step 1: Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
  console.log('✅ Cleaned existing dist directory');
}
fs.mkdirSync('dist', { recursive: true });

// Step 2: Build the frontend using Vite
console.log('📦 Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
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

// Step 5: Copy static assets
const staticDirs = ['uploads', 'attached_assets'];
staticDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
    console.log(`✅ Copied ${dir} directory`);
  }
});

// Step 6: Copy default avatar if it exists
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  console.log('✅ Copied default-avatar.svg');
}

// Step 7: Create production package.json
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const productionPackage = {
  "name": originalPackage.name,
  "version": originalPackage.version,
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
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

console.log('🎉 Production build completed successfully!');
console.log('📁 Created files:');
console.log('  - dist/index.js (server entry point)');
console.log('  - dist/package.json (production dependencies)');
console.log('  - dist/public/ (frontend build)');
console.log('  - dist/shared/ (shared schemas)');
console.log('');
console.log('🚀 Ready for deployment!');