#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Starting production build...\n');

try {
  // Step 1: Clean dist directory
  console.log('🧹 Cleaning dist directory...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Step 2: Build frontend with Vite
  console.log('🎨 Building frontend...');
  const { stdout: viteOutput, stderr: viteError } = await execAsync('npx vite build');
  if (viteError) {
    console.warn('Vite warnings:', viteError);
  }
  console.log('Frontend build completed');

  // Step 3: Build server with esbuild
  console.log('⚙️ Building server...');
  const { stdout: serverOutput, stderr: serverError } = await execAsync(`npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --define:import.meta.dirname='"__dirname"' --banner:js="import { fileURLToPath } from 'url'; import { dirname } from 'path'; const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);" --external:express --external:drizzle-orm --external:@neondatabase/serverless --external:ws --external:passport --external:express-session --external:connect-pg-simple --external:express-fileupload --external:axios --external:react-input-mask --external:stripe --external:memorystore --external:passport-local --external:zod --external:drizzle-zod`);
  if (serverError) {
    console.warn('Server build warnings:', serverError);
  }
  console.log('Server build completed');

  // Step 4: Copy shared directory
  console.log('📁 Copying shared schemas...');
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Step 5: Copy static assets
  console.log('📦 Copying static assets...');
  const assetDirs = ['uploads', 'attached_assets'];
  assetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.cpSync(dir, `dist/${dir}`, { recursive: true });
      console.log(`Copied ${dir}/ to dist/${dir}/`);
    }
  });

  // Step 6: Create production package.json
  console.log('📋 Creating production package.json...');
  const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const prodPackage = {
    "name": "amigo-montador",
    "version": "1.0.0",
    "type": "module",
    "main": "index.js",
    "scripts": {
      "start": "node index.js"
    },
    "dependencies": {
      "express": originalPackage.dependencies.express,
      "drizzle-orm": originalPackage.dependencies["drizzle-orm"],
      "@neondatabase/serverless": originalPackage.dependencies["@neondatabase/serverless"],
      "ws": originalPackage.dependencies.ws,
      "passport": originalPackage.dependencies.passport,
      "passport-local": originalPackage.dependencies["passport-local"],
      "express-session": originalPackage.dependencies["express-session"],
      "connect-pg-simple": originalPackage.dependencies["connect-pg-simple"],
      "express-fileupload": originalPackage.dependencies["express-fileupload"],
      "axios": originalPackage.dependencies.axios,
      "react-input-mask": originalPackage.dependencies["react-input-mask"],
      "stripe": originalPackage.dependencies.stripe,
      "memorystore": originalPackage.dependencies.memorystore,
      "zod": originalPackage.dependencies.zod,
      "drizzle-zod": originalPackage.dependencies["drizzle-zod"]
    },
    "engines": {
      "node": ">=18.0.0"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackage, null, 2));

  // Step 7: Verify critical files exist
  console.log('✅ Verifying build...');
  const criticalFiles = [
    'dist/index.js',
    'dist/package.json',
    'dist/public/index.html'
  ];

  const missingFiles = criticalFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing critical files:', missingFiles);
    process.exit(1);
  }

  // Step 8: Display build summary
  console.log('\n✅ Production build completed successfully!');
  console.log('📁 Files created:');
  console.log('  • dist/index.js - Server entry point');
  console.log('  • dist/package.json - Production dependencies');
  console.log('  • dist/public/ - Frontend build');
  console.log('  • dist/shared/ - Shared schemas');
  
  if (fs.existsSync('dist/uploads')) {
    console.log('  • dist/uploads/ - Upload directory');
  }
  if (fs.existsSync('dist/attached_assets')) {
    console.log('  • dist/attached_assets/ - Static assets');
  }

  console.log('\n🚀 Ready for deployment!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}