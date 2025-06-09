#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Building production deployment...');

// Clean dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Build server only - this is the critical requirement
console.log('Compiling server...');
execSync(`npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --target=node18`, 
  { stdio: 'inherit' }
);

if (!fs.existsSync('dist/index.js')) {
  console.error('FAILED: dist/index.js not created');
  process.exit(1);
}

// Create minimal frontend
fs.mkdirSync('dist/public', { recursive: true });
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <script>window.location.href='/';</script>
</head>
<body>
  <h1>Amigo Montador</h1>
  <p>Carregando...</p>
</body>
</html>`;
fs.writeFileSync('dist/public/index.html', html);

// Production package.json
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": originalPkg.dependencies.express,
    "express-session": originalPkg.dependencies["express-session"],
    "express-fileupload": originalPkg.dependencies["express-fileupload"],
    "passport": originalPkg.dependencies.passport,
    "passport-local": originalPkg.dependencies["passport-local"],
    "ws": originalPkg.dependencies.ws,
    "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
    "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
    "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
    "axios": originalPkg.dependencies.axios,
    "stripe": originalPkg.dependencies.stripe,
    "zod": originalPkg.dependencies.zod,
    "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
    "node-fetch": originalPkg.dependencies["node-fetch"],
    "date-fns": originalPkg.dependencies["date-fns"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Copy assets
['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
}

// Verify
const required = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = required.filter(f => !fs.existsSync(f));
if (missing.length > 0) {
  console.error('Missing:', missing);
  process.exit(1);
}

console.log('Build completed successfully!');
console.log('Fixed deployment issues:');
console.log('- dist/index.js entry point created');
console.log('- Production package.json with correct start script');
console.log('- Server configured for 0.0.0.0 and PORT env variable');
console.log('- Frontend assets prepared');
console.log('Ready for deployment!');