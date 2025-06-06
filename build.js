#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting build process...');

try {
  // Step 1: Build client (frontend)
  console.log('📦 Building client...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Step 2: Compile server with TypeScript
  console.log('🔧 Compiling server...');
  execSync('tsc -p tsconfig.server.json', { stdio: 'inherit' });
  
  // Step 3: Copy shared directory to dist
  console.log('📋 Copying shared files...');
  const sharedSrc = path.join(__dirname, 'shared');
  const sharedDest = path.join(__dirname, 'dist', 'shared');
  
  if (fs.existsSync(sharedSrc)) {
    execSync(`cp -r ${sharedSrc} ${sharedDest}`, { stdio: 'inherit' });
  }
  
  // Step 4: Verify dist/index.js exists
  const distIndex = path.join(__dirname, 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    console.error('❌ dist/index.js was not created');
    process.exit(1);
  }
  
  // Step 5: Copy package.json to dist for production dependencies
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    dependencies: packageJson.dependencies,
    scripts: {
      start: "node index.js"
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'dist', 'package.json'), 
    JSON.stringify(prodPackageJson, null, 2)
  );
  
  console.log('✅ Build completed successfully!');
  console.log(`📁 Output directory: ${path.join(__dirname, 'dist')}`);
  console.log(`🎯 Entry point: ${distIndex}`);
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}