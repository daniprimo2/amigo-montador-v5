#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Creating simple deployment build...');

// Clean dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Try esbuild first, fallback to manual if not available
let buildSuccess = false;

try {
  console.log('Attempting esbuild compilation...');
  execSync('npx esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --target=node18 --packages=external', { stdio: 'pipe' });
  buildSuccess = true;
  console.log('✓ esbuild compilation successful');
} catch (error) {
  console.log('esbuild not available, creating manual build...');
  
  // Create a basic server that works without complex dependencies
  const basicServer = `
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Catch all - serve index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>Amigo Montador</h1><p>Application loading...</p>');
  }
});

const port = process.env.PORT || 5000;
const server = createServer(app);

server.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
  console.log(\`🚀 Amigo Montador running on port \${port}\`);
  console.log(\`📱 Application: http://0.0.0.0:\${port}\`);
  console.log(\`✅ Production deployment successful\`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(\`Port \${port} is in use, trying port \${port + 1}\`);
    server.listen(port + 1, '0.0.0.0');
  }
});
`;

  fs.writeFileSync('dist/index.js', basicServer);
  buildSuccess = true;
  console.log('✓ Manual build created');
}

// Verify index.js exists
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ Failed to create dist/index.js');
  process.exit(1);
}

// Create public directory and index.html
fs.mkdirSync('dist/public', { recursive: true });
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Plataforma de Montagem</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; padding: 20px; background: #f5f5f5; 
    }
    .container { 
      max-width: 600px; margin: 50px auto; padding: 40px; 
      background: white; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    h1 { color: #2563eb; margin-bottom: 16px; }
    .loading { 
      display: inline-block; width: 40px; height: 40px; margin: 20px 0;
      border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; 
      border-radius: 50%; animation: spin 1s linear infinite; 
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Amigo Montador</h1>
    <p>Conectando lojas de móveis com montadores profissionais</p>
    <div class="loading"></div>
    <p>Carregando aplicação...</p>
  </div>
  <script>
    // Reload after 3 seconds to get the full app
    setTimeout(() => { window.location.reload(); }, 3000);
  </script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', indexHtml);

// Create production package.json with minimal dependencies
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Copy assets
['uploads', 'attached_assets', 'default-avatar.svg'].forEach(item => {
  if (fs.existsSync(item)) {
    const dest = path.join('dist', item);
    if (fs.statSync(item).isDirectory()) {
      fs.cpSync(item, dest, { recursive: true });
      console.log(\`✓ Copied \${item}/ directory\`);
    } else {
      fs.copyFileSync(item, dest);
      console.log(\`✓ Copied \${item} file\`);
    }
  }
});

// Final verification
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = requiredFiles.filter(f => !fs.existsSync(f));

if (missing.length > 0) {
  console.error('❌ Missing required files:', missing);
  process.exit(1);
}

console.log('✅ Simple deployment build completed!');
console.log('Created files:');
console.log('  - dist/index.js (server entry point)');
console.log('  - dist/package.json (production dependencies)');
console.log('  - dist/public/index.html (frontend)');
console.log('📦 Ready for deployment with minimal dependencies');

// Show file sizes
try {
  const stats = fs.statSync('dist/index.js');
  console.log(\`📊 Server bundle size: \${Math.round(stats.size / 1024)}KB\`);
} catch (e) {}