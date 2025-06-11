#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Preparando build para deploy Replit...');

// Limpar dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Criar estrutura
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// Criar servidor de produção
const serverCode = `import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    environment: process.env.NODE_ENV || 'production'
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Página não encontrada' });
  }
});

const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log('Servidor rodando em ' + host + ':' + port);
});

process.on('SIGTERM', () => {
  process.exit(0);
});`;

fs.writeFileSync('dist/index.js', serverCode);

// Package.json de produção
const prodPackage = {
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

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackage, null, 2));

// HTML básico
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amigo Montador</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 class="text-2xl font-bold text-center mb-4">Amigo Montador</h1>
        <div class="bg-green-50 border border-green-200 rounded p-4">
            <p class="text-green-800 text-center">Sistema Online</p>
            <p class="text-sm text-green-600 text-center mt-2">Conectando lojas e montadores</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

// Copiar diretórios essenciais
const dirs = ['uploads', 'attached_assets', 'shared'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
  }
});

// Verificar se arquivos foram criados
const required = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = required.filter(file => !fs.existsSync(file));

if (missing.length > 0) {
  console.error('Erro: Arquivos obrigatórios ausentes:', missing);
  process.exit(1);
}

console.log('Build concluído com sucesso!');
console.log('Arquivos criados:');
console.log('- dist/index.js (servidor)');
console.log('- dist/package.json (dependências)');
console.log('- dist/public/index.html (frontend)');
console.log('Pronto para deploy!');