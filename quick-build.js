#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Quick build for deployment...');

try {
  // Step 1: Build only the client (skip if dist/public exists)
  if (!fs.existsSync('dist/public')) {
    console.log('📦 Building client...');
    execSync('vite build', { stdio: 'inherit' });
  } else {
    console.log('📦 Client already built, skipping...');
  }
  
  // Step 2: Simple server compilation with esbuild
  console.log('🔧 Compiling server...');
  execSync(`esbuild server/index.ts --platform=node --target=node18 --format=esm --bundle --outfile=dist/index.js --external:express --external:drizzle-orm --external:@neondatabase/serverless --external:ws --external:passport --external:passport-local --external:express-session --external:connect-pg-simple --external:express-fileupload --external:axios --external:react-input-mask --external:stripe --external:memorystore --external:zod --external:drizzle-zod --external:zod-validation-error --define:import.meta.dirname='"__dirname"' --banner:js="import { fileURLToPath } from 'url'; import { dirname } from 'path'; const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);"`, { stdio: 'inherit' });
  
  // Step 3: Copy necessary files
  console.log('📋 Copying required files...');
  
  // Copy shared directory
  if (fs.existsSync('shared')) {
    execSync('cp -r shared dist/', { stdio: 'inherit' });
  }
  
  // Copy uploads directory if it exists
  if (fs.existsSync('uploads')) {
    execSync('cp -r uploads dist/', { stdio: 'inherit' });
  }
  
  // Copy attached_assets directory if it exists
  if (fs.existsSync('attached_assets')) {
    execSync('cp -r attached_assets dist/', { stdio: 'inherit' });
  }
  
  // Step 4: Create production package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: 'module',
    dependencies: packageJson.dependencies,
    scripts: {
      start: "node index.js"
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));
  
  // Step 5: Verify critical files exist
  const criticalFiles = ['dist/index.js', 'dist/package.json'];
  const missingFiles = criticalFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing critical files:', missingFiles);
    process.exit(1);
  }
  
  console.log('✅ Quick build completed successfully!');
  console.log('📁 Files created:');
  console.log('  - dist/index.js (server entry point)');
  console.log('  - dist/package.json (production dependencies)');
  console.log('  - dist/public/ (client build)');
  console.log('  - dist/shared/ (shared schemas)');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}