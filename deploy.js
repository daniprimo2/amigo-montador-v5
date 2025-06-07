#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Creating deployment build...');

// Clean dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build backend server
console.log('Building server...');
execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });

// Create minimal frontend
fs.mkdirSync('dist/public', { recursive: true });
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    window.location.href = '/';
  </script>
</body>
</html>`;
fs.writeFileSync('dist/public/index.html', indexHtml);

// Copy essential directories
['shared', 'uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  }
});

// Create production package.json
const pkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "express-fileupload": "^1.5.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "ws": "^8.18.0",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.3",
    "@neondatabase/serverless": "^0.10.4",
    "axios": "^1.9.0",
    "stripe": "^18.1.0",
    "zod": "^3.24.2",
    "drizzle-zod": "^0.7.1",
    "zod-validation-error": "^3.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

console.log('Deployment build completed');
console.log('Files created:');
console.log('- dist/index.js');
console.log('- dist/package.json');
console.log('- dist/public/index.html');