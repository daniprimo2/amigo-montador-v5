#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Preparing deployment build...');

try {
  // Clean and create dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });
  mkdirSync('dist/public', { recursive: true });

  // Copy client files to public directory for static serving
  console.log('Copying frontend files...');
  cpSync('client', 'dist/client', { recursive: true });
  
  // Copy server source files
  console.log('Copying server files...');
  cpSync('server', 'dist/server', { recursive: true });
  cpSync('shared', 'dist/shared', { recursive: true });
  
  // Create optimized production entry point
  const productionEntry = `#!/usr/bin/env node

// Production server entry point
import { createServer } from 'http';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Starting Amigo Montador server...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.REPLIT_DEPLOYMENT = 'true';

// Start the server using tsx for TypeScript support
const serverPath = join(__dirname, 'server', 'index.ts');
const serverProcess = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

// Handle server process events
serverProcess.on('error', (error) => {
  console.error('Server startup error:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (signal) {
    console.log('Server terminated by signal:', signal);
  } else if (code !== 0) {
    console.error('Server exited with code:', code);
    process.exit(code);
  }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  serverProcess.kill('SIGTERM');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
`;

  writeFileSync('dist/index.js', productionEntry);

  // Copy essential configuration files
  cpSync('package.json', 'dist/package.json');
  cpSync('tsconfig.json', 'dist/tsconfig.json');
  cpSync('vite.config.ts', 'dist/vite.config.ts');
  
  if (existsSync('tailwind.config.ts')) {
    cpSync('tailwind.config.ts', 'dist/tailwind.config.ts');
  }
  
  if (existsSync('postcss.config.js')) {
    cpSync('postcss.config.js', 'dist/postcss.config.js');
  }

  if (existsSync('drizzle.config.ts')) {
    cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');
  }

  // Copy data directories
  if (existsSync('uploads')) {
    cpSync('uploads', 'dist/uploads', { recursive: true });
  }
  
  if (existsSync('migrations')) {
    cpSync('migrations', 'dist/migrations', { recursive: true });
  }

  if (existsSync('attached_assets')) {
    cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  console.log('Build completed successfully');
  console.log('Ready for deployment - start with: npm start');

} catch (error) {
  console.error('Build preparation failed:', error.message);
  process.exit(1);
}