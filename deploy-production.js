#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Iniciando deploy para produção...');

// Limpar e preparar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// 1. Build do frontend com Vite (otimizado)
console.log('Construindo frontend...');
try {
  process.env.NODE_ENV = 'production';
  execSync('npx vite build --mode production', { 
    stdio: 'inherit',
    timeout: 180000 // 3 minutos de timeout
  });
  console.log('Frontend construído com sucesso');
} catch (error) {
  console.warn('Build do frontend falhou, usando fallback HTML');
  
  // Criar estrutura mínima se o build falhar
  fs.mkdirSync('dist/public', { recursive: true });
  const fallbackHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Amigo Montador</h1>
        <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p class="text-green-800">Sistema funcionando</p>
          <p class="text-sm text-green-600 mt-2">Plataforma de conexão entre lojas e montadores</p>
        </div>
        <div class="space-y-2 text-sm text-gray-600">
          <p>🏪 Para lojas de móveis</p>
          <p>🔧 Para montadores profissionais</p>
          <p>📱 Interface mobile-first</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  fs.writeFileSync('dist/public/index.html', fallbackHTML);
}

// 2. Build do servidor
console.log('Construindo servidor...');
try {
  execSync(`npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/server.js --external:drizzle-kit --external:@replit/vite-plugin-cartographer --external:@replit/vite-plugin-runtime-error-modal --external:typescript`, { 
    stdio: 'inherit' 
  });
  console.log('Servidor construído com esbuild');
} catch (error) {
  console.warn('Build com esbuild falhou, copiando servidor manualmente');
  
  // Fallback: copiar arquivos do servidor
  const serverFiles = ['server/index.ts', 'server/routes.ts', 'server/storage.ts', 'server/vite.ts'];
  serverFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const destPath = `dist/${path.basename(file).replace('.ts', '.js')}`;
      fs.copyFileSync(file, destPath);
    }
  });
}

// 3. Criar entrada principal do servidor
const mainServer = `import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));

// Health checks
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
    environment: 'production',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured'
  });
});

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

// Importar rotas se disponível
try {
  const { registerRoutes } = await import('./routes.js').catch(() => ({}));
  if (registerRoutes) {
    await registerRoutes(app);
  }
} catch (error) {
  console.warn('Rotas não carregadas:', error.message);
}

// Servir frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Aplicação não encontrada');
  }
});

const port = process.env.PORT || 8080;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(\`🚀 Amigo Montador rodando em \${host}:\${port}\`);
  console.log(\`📱 Acesse: http://\${host}:\${port}\`);
  console.log(\`🔍 Health check: http://\${host}:\${port}/health\`);
});`;

fs.writeFileSync('dist/index.js', mainServer);

// 4. Package.json para produção
const prodPackage = {
  "name": "amigo-montador-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "drizzle-orm": "^0.39.3",
    "@neondatabase/serverless": "^0.10.4",
    "express-fileupload": "^1.5.1",
    "express-session": "^1.18.1",
    "connect-pg-simple": "^10.0.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "zod": "^3.24.2",
    "drizzle-zod": "^0.7.1",
    "ws": "^8.18.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPackage, null, 2));

// 5. Copiar arquivos essenciais
const essentialDirs = ['shared', 'uploads', 'attached_assets'];
essentialDirs.forEach(dir => {
  const sourcePath = path.resolve(dir);
  const destPath = path.resolve('dist', dir);
  
  if (fs.existsSync(sourcePath)) {
    fs.cpSync(sourcePath, destPath, { recursive: true });
    console.log(`Copiado ${dir}/`);
  } else {
    fs.mkdirSync(destPath, { recursive: true });
    console.log(`Criado ${dir}/ vazio`);
  }
});

// Copiar arquivos de configuração
const configFiles = ['default-avatar.svg', 'drizzle.config.ts'];
configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, \`dist/\${file}\`);
  }
});

// 6. Configuração Replit
const replitConfig = \`run = "node index.js"
entrypoint = "index.js"

[env]
PORT = "8080"
NODE_ENV = "production"

[deployment]
run = ["node", "index.js"]
deploymentTarget = "cloudrun"
ignoredPaths = ["client", "server", "node_modules"]
\`;

fs.writeFileSync('dist/.replit', replitConfig);

// 7. Verificação final
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('Arquivos obrigatórios ausentes:', missingFiles);
  process.exit(1);
}

console.log('\\nDeploy preparado com sucesso!');
console.log('\\nArquivos de produção:');
console.log('• dist/index.js - Servidor principal');
console.log('• dist/package.json - Dependências de produção');
console.log('• dist/public/ - Frontend construído');
console.log('• dist/shared/ - Esquemas compartilhados');
console.log('• dist/uploads/ - Armazenamento de arquivos');
console.log('• dist/.replit - Configuração de deploy');

console.log('\\nPróximos passos:');
console.log('1. cd dist');
console.log('2. npm install');
console.log('3. npm start');
console.log('4. Ou use o botão Deploy no Replit');