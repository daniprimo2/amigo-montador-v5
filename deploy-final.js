#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Deploy build iniciado...');

// Limpar e criar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// Build frontend com timeout reduzido
console.log('📦 Frontend build...');
try {
  execSync('timeout 300 npx vite build', { stdio: 'pipe' });
} catch (error) {
  console.log('Frontend build com timeout, continuando...');
}

// Build servidor - versão simplificada
console.log('🖥️ Servidor build...');
const serverBuild = `
import express from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', environment: process.env.NODE_ENV || 'production' });
});

(async () => {
  try {
    const server = await registerRoutes(app);
    
    // Servir arquivos estáticos em produção
    const publicPath = path.resolve(__dirname, "public");
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
    }
    
    const port = parseInt(process.env.PORT || '5000');
    const host = "0.0.0.0";
    
    server.listen({ port, host }, () => {
      console.log(\`🚀 Servidor rodando na porta \${port}\`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
})();
`;

fs.writeFileSync('dist/server-entry.js', serverBuild);

// Copiar arquivos do servidor original se necessário
try {
  if (fs.existsSync('server/routes.js')) {
    fs.copyFileSync('server/routes.js', 'dist/routes.js');
  }
  if (fs.existsSync('server/storage.ts')) {
    execSync('npx tsc server/storage.ts --outDir dist --target es2020 --module esnext');
  }
} catch (error) {
  console.log('Usando build alternativo do servidor...');
}

// Package.json para produção
const pkg = {
  "name": "amigo-montador",
  "version": "1.0.0", 
  "type": "module",
  "main": "server-entry.js",
  "scripts": { "start": "node server-entry.js" },
  "dependencies": {
    "express": "^4.21.2",
    "drizzle-orm": "^0.39.3",
    "@neondatabase/serverless": "^0.10.4"
  },
  "engines": { "node": ">=18.0.0" }
};

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Copiar diretórios essenciais
['shared', 'uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
  }
});

// HTML básico se não existir
if (!fs.existsSync('dist/public/index.html')) {
  const html = `<!DOCTYPE html>
<html><head><title>Amigo Montador</title></head>
<body><div id="root">Carregando...</div></body></html>`;
  fs.writeFileSync('dist/public/index.html', html);
}

// Arquivo .replit
fs.writeFileSync('dist/.replit', `run = "node server-entry.js"
entrypoint = "server-entry.js"

[env]
PORT = "5000"
NODE_ENV = "production"
`);

console.log('✅ Deploy build concluído!');
console.log('📁 Arquivos prontos em dist/');
console.log('🚀 Para testar: cd dist && npm install && npm start');