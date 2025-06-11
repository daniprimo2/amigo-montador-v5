#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync } from 'fs';
import path from 'path';

console.log('Starting deployment preparation...');

try {
  // Ensure dist directory exists
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
    console.log('Created dist directory');
  }

  // Build the frontend with Vite
  console.log('Building frontend...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Frontend build completed');

  // Use esbuild for faster server compilation
  console.log('Compiling server files...');
  execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:"@neondatabase/serverless" --external:"express" --external:"ws" --external:"passport" --external:"drizzle-orm" --external:"connect-pg-simple" --external:"express-session" --external:"express-fileupload" --external:"passport-local" --external:"axios" --external:"node-fetch"', { stdio: 'inherit' });
  
  // Copy shared files
  if (existsSync('shared')) {
    cpSync('shared', 'dist/shared', { recursive: true });
    console.log('Copied shared files');
  }

  // Copy uploads directory if it exists
  if (existsSync('uploads')) {
    cpSync('uploads', 'dist/uploads', { recursive: true });
    console.log('Copied uploads directory');
  }

  // Copy package.json for production dependencies
  cpSync('package.json', 'dist/package.json');
  console.log('Copied package.json');

  console.log('Deployment preparation completed successfully!');
  console.log('You can now start the application with: npm start');

} catch (error) {
  console.error('Deployment preparation failed:', error.message);
  process.exit(1);
}