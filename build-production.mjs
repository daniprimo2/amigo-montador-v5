#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Building production deployment...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

console.log('Compiling TypeScript server...');

// Build server with esbuild for better compatibility
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --target=node18', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  process.exit(1);
}

console.log('Building client application...');

// Build frontend
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// Move client build to dist/public
if (fs.existsSync('client/dist')) {
  fs.cpSync('client/dist', 'dist/public', { recursive: true });
  fs.rmSync('client/dist', { recursive: true });
}

console.log('Creating production package.json...');

// Read original package.json
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create production package.json with only runtime dependencies
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
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
    "node-fetch": originalPkg.dependencies["node-fetch"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

console.log('Copying essential directories...');

// Copy shared directory
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Copy uploads directory if it exists
if (fs.existsSync('uploads')) {
  fs.cpSync('uploads', 'dist/uploads', { recursive: true });
}

// Copy attached_assets directory if it exists  
if (fs.existsSync('attached_assets')) {
  fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
}

console.log('Verifying build output...');

// Verify required files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('Build verification failed - missing files:', missingFiles);
  process.exit(1);
}

console.log('Production build completed successfully!');
console.log('Created files:');
console.log('- dist/index.js (main server entry)');
console.log('- dist/package.json (production dependencies)');
console.log('- dist/public/ (client application)');
console.log('- dist/shared/ (shared schemas)');

if (fs.existsSync('dist/uploads')) {
  console.log('- dist/uploads/ (uploaded files)');
}

if (fs.existsSync('dist/attached_assets')) {
  console.log('- dist/attached_assets/ (static assets)');
}