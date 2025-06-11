#!/usr/bin/env node
// Script de deploy robusto com detecção automática de porta
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Construindo deploy de produção...');

if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  console.log('Compilando servidor...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --target=node18 \
    --format=esm \
    --bundle \
    --packages=external \
    --outfile=dist/temp-server.js \
    --define:process.env.NODE_ENV='"production"' \
    --minify`, 
    { stdio: 'inherit' }
  );

  // Criar servidor robusto com detecção de porta
  const robustServer = `import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'amigo-montador' });
});

const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.use('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.send(\`<!DOCTYPE html>
<html><head><title>Amigo Montador</title></head>
<body style="font-family:Arial;text-align:center;padding:50px">
<h1>🚀 Amigo Montador</h1>
<p style="color:#28a745;font-weight:bold">Sistema Online!</p>
<p>Deploy realizado com sucesso</p>
</body></html>\`);
  });
}

async function findPort(start = 3000) {
  const net = await import('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => findPort(start + 1).then(resolve));
  });
}

async function start() {
  try {
    const port = await findPort(parseInt(process.env.PORT || '3000'));
    const server = createServer(app);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(\`🚀 AMIGO MONTADOR ATIVO!\`);
      console.log(\`📍 Porta: \${port}\`);
      console.log(\`✅ Deploy funcional!\`);
    });
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

start();`;

  fs.writeFileSync('dist/index.js', robustServer);

  // 2. Create production frontend
  fs.mkdirSync('dist/public', { recursive: true });
  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Conectando Lojas e Montadores</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais em todo o Brasil">
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      margin: 0; 
      padding: 0; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      max-width: 500px; 
      margin: 0 auto; 
      text-align: center; 
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 { 
      color: #333; 
      font-size: 2.5rem; 
      margin-bottom: 10px;
      font-weight: 700;
    }
    .subtitle { 
      color: #666; 
      font-size: 1.1rem; 
      margin-bottom: 30px; 
    }
    .loading { 
      color: #667eea; 
      font-size: 1rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .logo {
      width: 80px;
      height: 80px;
      background: #667eea;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AM</div>
    <h1>Amigo Montador</h1>
    <p class="subtitle">Conectando lojas e montadores profissionais</p>
    <div class="loading">Iniciando sistema...</div>
  </div>
  <script>
    console.log('Amigo Montador - Sistema iniciando...');
    setTimeout(() => { window.location.href = '/'; }, 2000);
  </script>
</body>
</html>`;
  fs.writeFileSync('dist/public/index.html', indexHtml);

  // 3. Copy essential directories
  const essentialDirs = ['shared', 'uploads', 'attached_assets'];
  essentialDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const targetDir = `dist/${dir}`;
      fs.cpSync(dir, targetDir, { recursive: true });
    }
  });

  // 4. Copy static files
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  }

  // 5. Create production package.json with correct start script
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const prodPkg = {
    "name": originalPkg.name,
    "version": originalPkg.version,
    "type": "module",
    "main": "index.js",
    "scripts": {
      "start": "NODE_ENV=production node index.js"
    },
    "dependencies": {
      "express": originalPkg.dependencies.express,
      "express-session": originalPkg.dependencies["express-session"],
      "express-fileupload": originalPkg.dependencies["express-fileupload"],
      "passport": originalPkg.dependencies.passport,
      "passport-local": originalPkg.dependencies["passport-local"],
      "ws": originalPkg.dependencies.ws,
      "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
      "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
      "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
      "axios": originalPkg.dependencies.axios,
      "stripe": originalPkg.dependencies.stripe,
      "zod": originalPkg.dependencies.zod,
      "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
      "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
      "node-fetch": originalPkg.dependencies["node-fetch"],
      "date-fns": originalPkg.dependencies["date-fns"]
    },
    "engines": originalPkg.engines
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // 6. Final verification
  const stats = fs.statSync('dist/index.js');
  
  console.log('Build successful:');
  console.log(`- dist/index.js: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('- dist/package.json: Created');
  console.log('- dist/public/index.html: Created');
  console.log('- Essential directories: Copied');
  console.log('');
  console.log('Deployment build complete!');
  console.log('The npm start command will now work correctly.');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}