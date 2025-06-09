#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building production deployment...');

// Clean dist directory
if (fs.existsSync('dist')) {
  console.log('🧹 Cleaning dist directory...');
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server using TypeScript compiler
console.log('🔨 Building server with TypeScript...');
try {
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  console.log('✅ Server build completed successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Verify that the main entry point exists
if (!fs.existsSync('dist/server/index.js')) {
  console.error('❌ Missing dist/server/index.js after build');
  process.exit(1);
}

// Move server/index.js to dist/index.js for deployment
console.log('📦 Moving entry point to dist/index.js...');
fs.renameSync('dist/server/index.js', 'dist/index.js');

// Copy essential directories
console.log('📂 Copying essential directories...');
const dirsToCopy = ['uploads', 'attached_assets'];
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`✅ Copied ${dir}`);
  }
});

// Build frontend
console.log('🎨 Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  // Continue anyway - we can deploy without frontend if needed
}

// Copy frontend build to dist/public
if (fs.existsSync('dist-client')) {
  console.log('📱 Moving frontend build...');
  fs.cpSync('dist-client', 'dist/public', { recursive: true });
  fs.rmSync('dist-client', { recursive: true });
  console.log('✅ Frontend moved to dist/public');
}

// Create production package.json
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
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
    "date-fns": originalPkg.dependencies["date-fns"],
    "node-fetch": originalPkg.dependencies["node-fetch"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Verify deployment readiness
console.log('🔍 Verifying deployment readiness...');
const requiredFiles = ['dist/index.js', 'dist/package.json'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles);
  process.exit(1);
}

console.log('✅ All required files present');
console.log('📊 Build summary:');
console.log(`   - Main entry: ${fs.existsSync('dist/index.js') ? '✅' : '❌'} dist/index.js`);
console.log(`   - Package.json: ${fs.existsSync('dist/package.json') ? '✅' : '❌'} dist/package.json`);
console.log(`   - Frontend: ${fs.existsSync('dist/public') ? '✅' : '❌'} dist/public`);
console.log(`   - Uploads: ${fs.existsSync('dist/uploads') ? '✅' : '❌'} dist/uploads`);
console.log(`   - Assets: ${fs.existsSync('dist/attached_assets') ? '✅' : '❌'} dist/attached_assets`);

console.log('🎉 Production build completed successfully!');