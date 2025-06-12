#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';

console.log('Preparing deployment...');

try {
  // Clean and create dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Copy all source files for runtime compilation
  console.log('Copying source files...');
  cpSync('client', 'dist/client', { recursive: true });
  cpSync('server', 'dist/server', { recursive: true });
  cpSync('shared', 'dist/shared', { recursive: true });

  // Copy configuration files
  cpSync('package.json', 'dist/package.json');
  cpSync('tsconfig.json', 'dist/tsconfig.json');
  cpSync('vite.config.ts', 'dist/vite.config.ts');
  cpSync('tailwind.config.ts', 'dist/tailwind.config.ts');
  cpSync('postcss.config.js', 'dist/postcss.config.js');
  cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');
  
  // Copy public assets
  if (existsSync('public')) {
    cpSync('public', 'dist/public', { recursive: true });
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

  console.log('Deployment preparation completed successfully!');

} catch (error) {
  console.error('Deployment preparation failed:', error.message);
  process.exit(1);
}