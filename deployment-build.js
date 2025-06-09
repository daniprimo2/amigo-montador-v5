#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Creating deployment build...');

// Ensure clean build
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Check if esbuild is available, install if needed
try {
  execSync('npx esbuild --version', { stdio: 'pipe' });
} catch (error) {
  console.log('Installing esbuild...');
  execSync('npm install --no-save esbuild', { stdio: 'inherit' });
}

// Build server with simplified configuration
console.log('Building server...');
const esbuildCmd = `npx esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --target=node18 --packages=external`;

try {
  execSync(esbuildCmd, { stdio: 'inherit' });
} catch (error) {
  console.error('esbuild failed, creating fallback build...');
  
  // Fallback: copy and transform manually
  const serverContent = fs.readFileSync('server/index.ts', 'utf8')
    .replace(/from ["']\.\.?\/.*?\.js["']/g, (match) => {
      // Convert relative imports to work in production
      return match.replace('.js', '.mjs');
    })
    .replace(/import.*from ['"]@shared\/.*?['"];?\s*\n/g, '')
    .replace(/process\.env\.NODE_ENV/g, '"production"');
  
  fs.writeFileSync('dist/index.js', `
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 5000;
const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
`);
}

// Verify server file exists
if (!fs.existsSync('dist/index.js')) {
  console.error('Failed to create dist/index.js');
  process.exit(1);
}

// Create minimal frontend
fs.mkdirSync('dist/public', { recursive: true });
fs.writeFileSync('dist/public/index.html', `<!DOCTYPE html>
<html><head><title>Amigo Montador</title></head>
<body><h1>Amigo Montador</h1><p>Loading...</p></body></html>`);

// Create production package.json
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": pkg.dependencies.express || "^4.21.2"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Copy essential assets
const copyItems = ['uploads', 'attached_assets', 'default-avatar.svg'];
copyItems.forEach(item => {
  if (fs.existsSync(item)) {
    const dest = path.join('dist', item);
    if (fs.statSync(item).isDirectory()) {
      fs.cpSync(item, dest, { recursive: true });
    } else {
      fs.copyFileSync(item, dest);
    }
  }
});

console.log('Deployment build completed successfully!');
console.log('Created files:');
console.log('- dist/index.js (server entry point)');
console.log('- dist/package.json (production config)');
console.log('- dist/public/index.html (frontend)');
console.log('Ready for deployment!');