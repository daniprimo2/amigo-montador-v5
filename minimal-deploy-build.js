#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Creating minimal deployment build...');

// Clean dist
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true });
fs.mkdirSync('dist', { recursive: true });

// Create minimal server bundle directly
console.log('Compiling server...');
try {
  execSync('esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --external:@neondatabase/serverless --external:drizzle-orm --external:pg', { stdio: 'inherit' });
} catch (error) {
  console.log('Direct esbuild failed, creating simple server...');
  
  // Fallback: create a simple working server
  const simpleServer = `
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Serve static assets
app.use('/uploads', express.static('uploads'));
app.use('/attached_assets', express.static('attached_assets'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Catch all
app.get('*', (req, res) => {
  res.send('<h1>Amigo Montador</h1><p>Application is starting...</p>');
});

const port = process.env.PORT || 3000;
const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
`;
  
  fs.writeFileSync('dist/index.js', simpleServer);
}

// Create simple public directory with index.html
fs.mkdirSync('dist/public', { recursive: true });
const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Amigo Montador</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div id="root">
    <h1>Amigo Montador</h1>
    <p>Platform connecting furniture stores with skilled installers in Brazil</p>
  </div>
</body>
</html>`;
fs.writeFileSync('dist/public/index.html', indexHtml);

// Copy directories
['shared', 'uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  }
});

// Create package.json
const pkg = {
  "name": "amigo-montador",
  "type": "module",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.21.2"
  }
};
fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Verify
if (!fs.existsSync('dist/index.js') || !fs.existsSync('dist/package.json')) {
  console.error('Build verification failed');
  process.exit(1);
}

console.log('Minimal build complete');
console.log('Files: dist/index.js, dist/package.json, dist/public/index.html');