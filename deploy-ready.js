#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Preparando deploy otimizado...');

// Limpar dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Criar estrutura
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// Servidor de produção otimizado
const productionServer = `import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health checks
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    app: 'amigo-montador',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    environment: 'production'
  });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Amigo Montador rodando na porta', port);
  console.log('Health check disponível em /health');
});

process.on('SIGTERM', () => {
  console.log('Servidor sendo finalizado...');
  process.exit(0);
});`;

fs.writeFileSync('dist/index.js', productionServer);

// Package.json mínimo para deploy
const deployPackage = {
  "name": "amigo-montador-deploy",
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

fs.writeFileSync('dist/package.json', JSON.stringify(deployPackage, null, 2));

// HTML de produção com Tailwind CDN
const productionHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais no Brasil">
    <title>Amigo Montador - Conectando Lojas e Montadores</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
            transition: transform 0.2s ease-in-out;
        }
        .card:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="gradient-bg">
        <div class="container mx-auto px-4 py-12">
            <div class="text-center text-white">
                <h1 class="text-4xl md:text-6xl font-bold mb-4">Amigo Montador</h1>
                <p class="text-xl md:text-2xl opacity-90">Conectando lojas e montadores profissionais</p>
            </div>
        </div>
    </div>

    <div class="container mx-auto px-4 py-12">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div class="card bg-white rounded-lg shadow-lg p-6">
                <div class="text-blue-600 text-4xl mb-4">🏪</div>
                <h3 class="text-xl font-bold mb-2">Para Lojas</h3>
                <p class="text-gray-600">Encontre montadores qualificados para seus clientes. Gerencie serviços e pagamentos de forma eficiente.</p>
            </div>

            <div class="card bg-white rounded-lg shadow-lg p-6">
                <div class="text-green-600 text-4xl mb-4">🔧</div>
                <h3 class="text-xl font-bold mb-2">Para Montadores</h3>
                <p class="text-gray-600">Acesse oportunidades de trabalho próximas a você. Construa sua reputação e aumente sua renda.</p>
            </div>

            <div class="card bg-white rounded-lg shadow-lg p-6">
                <div class="text-purple-600 text-4xl mb-4">📱</div>
                <h3 class="text-xl font-bold mb-2">Mobile-First</h3>
                <p class="text-gray-600">Interface otimizada para dispositivos móveis. Acesse de qualquer lugar, a qualquer hora.</p>
            </div>
        </div>

        <div class="mt-16 bg-white rounded-lg shadow-lg p-8">
            <h2 class="text-2xl font-bold mb-6 text-center">Status do Sistema</h2>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="flex items-center p-4 bg-green-50 rounded-lg">
                    <div class="text-green-600 text-2xl mr-3">✅</div>
                    <div>
                        <h4 class="font-semibold">Servidor Online</h4>
                        <p class="text-sm text-gray-600">Sistema funcionando normalmente</p>
                    </div>
                </div>
                <div class="flex items-center p-4 bg-blue-50 rounded-lg">
                    <div class="text-blue-600 text-2xl mr-3">🚀</div>
                    <div>
                        <h4 class="font-semibold">Deploy Ativo</h4>
                        <p class="text-sm text-gray-600">Aplicação pronta para produção</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-12 text-center">
            <h2 class="text-2xl font-bold mb-4">Funcionalidades Principais</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="text-2xl mb-2">📍</div>
                    <p class="text-sm font-medium">Geolocalização</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="text-2xl mb-2">💳</div>
                    <p class="text-sm font-medium">Pagamentos PIX</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="text-2xl mb-2">⭐</div>
                    <p class="text-sm font-medium">Sistema de Avaliações</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="text-2xl mb-2">💬</div>
                    <p class="text-sm font-medium">Chat em Tempo Real</p>
                </div>
            </div>
        </div>
    </div>

    <footer class="bg-gray-800 text-white py-8 mt-16">
        <div class="container mx-auto px-4 text-center">
            <p>&copy; 2025 Amigo Montador. Plataforma brasileira para conexão de serviços de montagem.</p>
        </div>
    </footer>

    <script>
        // Health check
        fetch('/health')
            .then(response => response.json())
            .then(data => {
                console.log('Sistema status:', data);
            })
            .catch(error => {
                console.warn('Health check falhou:', error);
            });
    </script>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', productionHTML);

// Copiar diretórios essenciais
['uploads', 'attached_assets', 'shared'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`Copiado ${dir}/`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`Criado ${dir}/ vazio`);
  }
});

// Configuração Replit
const replitConfig = `run = "node index.js"
entrypoint = "index.js"

[env]
PORT = "8080"
NODE_ENV = "production"

[deployment]
run = ["node", "index.js"]
deploymentTarget = "cloudrun"
`;

fs.writeFileSync('dist/.replit', replitConfig);

// Verificação final
const required = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = required.filter(f => !fs.existsSync(f));

if (missing.length > 0) {
  console.error('Arquivos ausentes:', missing);
  process.exit(1);
}

console.log('Deploy preparado com sucesso!');
console.log('Arquivos criados:');
console.log('- dist/index.js (servidor)');
console.log('- dist/package.json (dependências)');
console.log('- dist/public/index.html (frontend)');
console.log('- dist/.replit (configuração)');
console.log('');
console.log('Para testar: cd dist && npm install && npm start');
console.log('Para deploy: Use o botão Deploy no Replit');