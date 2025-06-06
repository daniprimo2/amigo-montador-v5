import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Building for deployment...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // Build server with esbuild
  console.log('Building server...');
  await esbuild.build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/index.js',
    external: [
      'express',
      'drizzle-orm',
      '@neondatabase/serverless',
      'ws',
      'passport',
      'express-session',
      'connect-pg-simple',
      'express-fileupload',
      'axios',
      'bcrypt',
      'pg'
    ],
    define: {
      'import.meta.dirname': '__dirname'
    },
    banner: {
      js: `
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
  });

  // Build client separately (simpler approach)
  console.log('Building client...');
  execSync('npx vite build --mode production', { 
    stdio: 'inherit',
    timeout: 120000 // 2 minute timeout
  });

  // Copy necessary files
  console.log('Copying files...');
  
  // Copy shared directory
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copy assets
  if (fs.existsSync('attached_assets')) {
    fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  // Create uploads directory
  fs.mkdirSync('dist/uploads', { recursive: true });

  // Copy default avatar if exists
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  }

  // Create production package.json
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

  // Verify build
  const indexExists = fs.existsSync('dist/index.js');
  const publicExists = fs.existsSync('dist/public');
  
  console.log(`Server build: ${indexExists ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Client build: ${publicExists ? 'SUCCESS' : 'FAILED'}`);
  
  if (!indexExists) {
    throw new Error('Server build failed - dist/index.js not created');
  }
  
  console.log('Build completed successfully!');
  
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}