#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building for deployment...');

try {
  // Clean and create dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build frontend first (fast approach)
  console.log('Building frontend...');
  execSync('vite build --mode production', { stdio: 'pipe' });

  // Compile server with minimal externals
  console.log('Compiling server...');
  execSync(`esbuild server/index.ts --platform=node --format=esm --bundle --outfile=dist/index.js --target=node18 --external:pg --external:@neondatabase/serverless --external:drizzle-orm --banner:js="import{fileURLToPath}from'url';import{dirname}from'path';const __filename=fileURLToPath(import.meta.url);const __dirname=dirname(__filename);"`, { stdio: 'inherit' });

  // Copy essential directories
  ['shared', 'uploads', 'attached_assets'].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    }
  });

  // Create minimal package.json
  const pkg = {
    "name": "amigo-montador",
    "type": "module",
    "scripts": { "start": "node index.js" },
    "dependencies": {
      "@neondatabase/serverless": "^0.10.4",
      "drizzle-orm": "^0.39.3",
      "express": "^4.21.2",
      "ws": "^8.18.0"
    }
  };
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('dist/index.js not created');
  }
  if (!fs.existsSync('dist/public/index.html')) {
    throw new Error('Frontend build failed');
  }

  console.log('Build completed successfully');
  console.log('Created: dist/index.js, dist/package.json, dist/public/');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}