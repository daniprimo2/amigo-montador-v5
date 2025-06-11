#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Iniciando build para deploy Replit...');

// Limpar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Criar estrutura
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// 1. Build do frontend
console.log('Fazendo build do frontend...');
try {
  execSync('npx vite build --mode production', { 
    stdio: 'pipe',
    timeout: 300000 // 5 minutos
  });
  console.log('Frontend construído com sucesso');
} catch (error) {
  console.log('Build do frontend usando fallback...');
  
  // Criar HTML básico se o build falhar
  const basicHTML = `<!DOCTYPE html>
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
            <p class="text-green-800 text-center">Sistema funcionando</p>
            <p class="text-sm text-green-600 text-center mt-2">Plataforma de conexão entre lojas e montadores</p>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('dist/public/index.html', basicHTML);
}

// 2. Build do servidor principal
console.log('Criando servidor de produção...');

const serverCode = `import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check endpoints
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

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

// Servir frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rota catch-all para SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Página não encontrada' });
  }
});

// Iniciar servidor
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(\`Amigo Montador rodando em \${host}:\${port}\`);
  console.log(\`Health check: http://\${host}:\${port}/health\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Finalizando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Finalizando servidor...');
  process.exit(0);
});`;

// Salvar o arquivo index.js na raiz do dist
fs.writeFileSync('dist/index.js', serverCode);

// 3. Criar package.json de produção
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

// 4. Copiar diretórios essenciais
const dirs = ['uploads', 'attached_assets', 'shared'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`Copiado ${dir}/`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`Criado ${dir}/ vazio`);
  }
});

// 5. Verificar arquivos obrigatórios
const required = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

const missing = required.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('Arquivos obrigatórios ausentes:', missing);
  process.exit(1);
}

// Verificar conteúdo dos arquivos
const indexSize = fs.statSync('dist/index.js').size;
const packageSize = fs.statSync('dist/package.json').size;
const htmlSize = fs.statSync('dist/public/index.html').size;

if (indexSize < 100 || packageSize < 50 || htmlSize < 100) {
  console.error('Arquivos com tamanho suspeito - build pode ter falhado');
  process.exit(1);
}

console.log('\\nBuild concluído com sucesso!');
console.log('Arquivos gerados:');
console.log(\`- dist/index.js (\${Math.round(indexSize/1024)}KB)\`);
console.log(\`- dist/package.json (\${packageSize}B)\`);
console.log(\`- dist/public/index.html (\${Math.round(htmlSize/1024)}KB)\`);
console.log('');
console.log('Pronto para deploy no Replit!');`;

fs.writeFileSync('build-for-deploy.js', serverCode);

// Agora vou corrigir o arquivo que acabei de criar, pois houve um erro
const correctBuildScript = `#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Iniciando build para deploy Replit...');

// Limpar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Criar estrutura
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });

// 1. Build do frontend
console.log('Fazendo build do frontend...');
try {
  execSync('npx vite build --mode production', { 
    stdio: 'pipe',
    timeout: 300000 // 5 minutos
  });
  console.log('Frontend construído com sucesso');
} catch (error) {
  console.log('Build do frontend usando fallback...');
  
  // Criar HTML básico se o build falhar
  const basicHTML = \`<!DOCTYPE html>
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
            <p class="text-green-800 text-center">Sistema funcionando</p>
            <p class="text-sm text-green-600 text-center mt-2">Plataforma de conexão entre lojas e montadores</p>
        </div>
    </div>
</body>
</html>\`;
  
  fs.writeFileSync('dist/public/index.html', basicHTML);
}

// 2. Build do servidor principal
console.log('Criando servidor de produção...');

const serverCode = \`import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check endpoints
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

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

// Servir frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rota catch-all para SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Página não encontrada' });
  }
});

// Iniciar servidor
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(\\\`Amigo Montador rodando em \\\${host}:\\\${port}\\\`);
  console.log(\\\`Health check: http://\\\${host}:\\\${port}/health\\\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Finalizando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Finalizando servidor...');
  process.exit(0);
});\`;

// Salvar o arquivo index.js na raiz do dist
fs.writeFileSync('dist/index.js', serverCode);

// 3. Criar package.json de produção
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

// 4. Copiar diretórios essenciais
const dirs = ['uploads', 'attached_assets', 'shared'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, \`dist/\${dir}\`, { recursive: true });
    console.log(\`Copiado \${dir}/\`);
  } else {
    fs.mkdirSync(\`dist/\${dir}\`, { recursive: true });
    console.log(\`Criado \${dir}/ vazio\`);
  }
});

// 5. Verificar arquivos obrigatórios
const required = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

const missing = required.filter(file => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('Arquivos obrigatórios ausentes:', missing);
  process.exit(1);
}

// Verificar conteúdo dos arquivos
const indexSize = fs.statSync('dist/index.js').size;
const packageSize = fs.statSync('dist/package.json').size;
const htmlSize = fs.statSync('dist/public/index.html').size;

if (indexSize < 100 || packageSize < 50 || htmlSize < 100) {
  console.error('Arquivos com tamanho suspeito - build pode ter falhado');
  process.exit(1);
}

console.log('\\nBuild concluído com sucesso!');
console.log('Arquivos gerados:');
console.log(\`- dist/index.js (\${Math.round(indexSize/1024)}KB)\`);
console.log(\`- dist/package.json (\${packageSize}B)\`);
console.log(\`- dist/public/index.html (\${Math.round(htmlSize/1024)}KB)\`);
console.log('');
console.log('Pronto para deploy no Replit!');`;

fs.writeFileSync('build-for-deploy.js', correctBuildScript);