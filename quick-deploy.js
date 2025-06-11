#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Preparando deploy rápido...');

// Limpar dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// Servidor de produção simplificado
const serverCode = `import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(\`Servidor rodando na porta \${port}\`);
});`;

fs.writeFileSync('dist/index.js', serverCode);

// Package.json mínimo
const pkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module", 
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// HTML básico
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amigo Montador</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { padding: 20px; background: #e8f5e8; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Amigo Montador</h1>
        <div class="status">
            <p>✅ Aplicação está funcionando</p>
            <p>🔧 Sistema de conexão entre lojas e montadores</p>
            <p>📱 Plataforma mobile-first</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

// Copiar diretórios essenciais
['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
  }
});

// Arquivo .replit
fs.writeFileSync('dist/.replit', `run = "node index.js"
entrypoint = "index.js"
[env]
PORT = "5000"
NODE_ENV = "production"
[deployment]
run = ["node", "index.js"]
`);

console.log('Deploy preparado com sucesso!');
console.log('Arquivos criados em dist/');