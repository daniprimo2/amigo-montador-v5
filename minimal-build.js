#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Creating minimal production build...');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Create a simple production server entry point
const serverCode = `
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve client build
const clientPath = path.join(__dirname, 'public');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.use("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
} else {
  app.get('*', (req, res) => {
    res.send('<h1>App is starting...</h1><p>Please wait while the application initializes.</p>');
  });
}

const port = process.env.PORT || 3000;
const server = createServer(app);

server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

// Write minimal server
fs.writeFileSync('dist/index.js', serverCode);

// Create production package.json
const packageJson = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "express": "^4.19.2"
  },
  "scripts": {
    "start": "node index.js"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

// Copy static directories if they exist
['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    const destDir = path.join('dist', dir);
    if (!fs.existsSync(destDir)) {
      fs.cpSync(dir, destDir, { recursive: true });
      console.log(`Copied ${dir}/ to dist/${dir}/`);
    }
  }
});

// Create a simple client build if it doesn't exist
const publicDir = 'dist/public';
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  
  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amigo Montador</title>
</head>
<body>
    <div id="root">
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui;">
            <div style="text-align: center;">
                <h1>Amigo Montador</h1>
                <p>Sistema de montagem de móveis</p>
                <p style="color: #666;">A aplicação está sendo preparada para produção...</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
  console.log('Created minimal client build');
}

console.log('✅ Minimal build completed successfully!');
console.log('Files created:');
console.log('  - dist/index.js (production server)');
console.log('  - dist/package.json (minimal dependencies)');
console.log('  - dist/public/index.html (client placeholder)');