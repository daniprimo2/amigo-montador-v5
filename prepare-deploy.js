#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readFileSync } from 'fs';

console.log('Preparing deployment...');

try {
  // Clean and create dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Compile server code to JavaScript
  console.log('Compiling server...');
  execSync('npx tsc --project tsconfig.server.json --outDir dist --skipLibCheck', { stdio: 'inherit' });

  // Build frontend for production
  console.log('Building frontend...');
  try {
    execSync('NODE_ENV=production npx vite build --outDir dist/public', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
      timeout: 120000
    });
  } catch (error) {
    console.log('Frontend build failed, using development mode for static files...');
    // Copy client files for development serving
    cpSync('client', 'dist/client', { recursive: true });
    cpSync('vite.config.ts', 'dist/vite.config.ts');
    cpSync('tailwind.config.ts', 'dist/tailwind.config.ts');
    cpSync('postcss.config.js', 'dist/postcss.config.js');
    cpSync('tsconfig.json', 'dist/tsconfig.json');
  }

  // Copy configuration files
  cpSync('package.json', 'dist/package.json');
  cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');

  // Copy public assets
  if (existsSync('public')) {
    cpSync('public', 'dist/public', { recursive: true });
  }

  // Copy attached assets
  if (existsSync('attached_assets')) {
    cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  // Create upload directories
  mkdirSync('dist/uploads/documents', { recursive: true });
  mkdirSync('dist/uploads/logos', { recursive: true });
  mkdirSync('dist/uploads/profiles', { recursive: true });
  mkdirSync('dist/uploads/projects', { recursive: true });

  // Copy existing uploads
  if (existsSync('uploads')) {
    cpSync('uploads', 'dist/uploads', { recursive: true });
  }

  // Update package.json for production
  const packageJson = JSON.parse(readFileSync('dist/package.json', 'utf8'));
  packageJson.main = 'index.js';
  packageJson.scripts.start = 'NODE_ENV=production node index.js';
  
  // Move tsx to dependencies for runtime compilation fallback
  if (packageJson.devDependencies && packageJson.devDependencies.tsx) {
    packageJson.dependencies.tsx = packageJson.devDependencies.tsx;
  }
  
  writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

  console.log('Deployment preparation completed successfully!');

} catch (error) {
  console.error('Deployment preparation failed:', error.message);
  process.exit(1);
}