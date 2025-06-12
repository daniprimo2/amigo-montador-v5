#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';

console.log('Starting deployment preparation...');

try {
  // Clean previous build
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }

  mkdirSync('dist', { recursive: true });

  // Build frontend first
  console.log('Building frontend...');
  execSync('NODE_ENV=production npx vite build --mode production', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Build server with esbuild for speed
  console.log('Building server...');
  execSync(`npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:express --external:bcrypt --external:drizzle-orm --external:@neondatabase/serverless --external:connect-pg-simple --external:express-session --external:passport --external:passport-local --external:express-fileupload --external:ws --external:nodemailer --define:process.env.NODE_ENV='"production"'`, {
    stdio: 'inherit'
  });

  // Copy essential files
  console.log('Copying assets...');
  
  // Ensure required directories exist
  mkdirSync('dist/uploads/documents', { recursive: true });
  mkdirSync('dist/uploads/logos', { recursive: true });
  mkdirSync('dist/uploads/profiles', { recursive: true });
  mkdirSync('dist/uploads/projects', { recursive: true });

  // Copy existing uploads if they exist
  if (existsSync('uploads')) {
    cpSync('uploads', 'dist/uploads', { recursive: true });
  }

  // Copy production dependencies info
  cpSync('package.json', 'dist/package.json');
  
  console.log('Build completed successfully!');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}