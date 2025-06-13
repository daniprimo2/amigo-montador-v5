import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';

console.log('Creating streamlined deployment...');

// Clean and create dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}
mkdirSync('dist', { recursive: true });

// Copy only essential server files
cpSync('server', 'dist/server', { recursive: true });
cpSync('shared', 'dist/shared', { recursive: true });
cpSync('client', 'dist/client', { recursive: true });

// Copy and modify package.json for deployment
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
packageJson.type = 'commonjs';
packageJson.main = 'index.js';
packageJson.scripts = { start: 'node index.js' };
packageJson.engines = { node: '>=18.0.0' };

// Ensure tsx is in dependencies for deployment
if (!packageJson.dependencies.tsx) {
  packageJson.dependencies.tsx = packageJson.devDependencies?.tsx || '^4.0.0';
}

writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));
cpSync('tsconfig.json', 'dist/tsconfig.json');
cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');

// Copy static assets
if (existsSync('public')) {
  cpSync('public', 'dist/public', { recursive: true });
}

if (existsSync('attached_assets')) {
  cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
}

// Create upload directories
mkdirSync('dist/uploads/documents', { recursive: true });
mkdirSync('dist/uploads/logos', { recursive: true });
mkdirSync('dist/uploads/profiles', { recursive: true });
mkdirSync('dist/uploads/projects', { recursive: true });

if (existsSync('uploads')) {
  cpSync('uploads', 'dist/uploads', { recursive: true });
}

// Create minimal production entry point
const indexJs = `// Streamlined production entry for Amigo Montador
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'production';
const PORT = process.env.PORT || 3000;
process.env.PORT = PORT;

console.log('Amigo Montador starting on port', PORT);

// Start server process
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error('Server exited with code', code);
    process.exit(code);
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received interrupt signal');
  server.kill('SIGINT');
});
`;

writeFileSync('dist/index.js', indexJs);

console.log('Streamlined deployment completed');
console.log('Entry point: dist/index.js');
console.log('Ready for deployment');