#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Creating deployment build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // Build server bundle
  console.log('Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --target=node18', { stdio: 'inherit' });

  // Create directories
  fs.mkdirSync('dist/public', { recursive: true });
  fs.mkdirSync('dist/uploads', { recursive: true });
  fs.mkdirSync('dist/shared', { recursive: true });
  fs.mkdirSync('dist/attached_assets', { recursive: true });

  // Copy shared and assets
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  if (fs.existsSync('uploads')) {
    fs.cpSync('uploads', 'dist/uploads', { recursive: true });
  }
  if (fs.existsSync('attached_assets')) {
    fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  // Create simple production HTML
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin: 0;
    }
    .container {
      text-align: center;
      background: rgba(255,255,255,0.15);
      padding: 2rem;
      border-radius: 15px;
      backdrop-filter: blur(10px);
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-right: 10px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛠️ Amigo Montador</h1>
    <p>Conectando lojas e montadores</p>
    <div>
      <div class="loading"></div>
      <span>Carregando aplicação...</span>
    </div>
  </div>
  <script>
    function checkApp() {
      fetch('/api/health')
        .then(r => r.ok ? window.location.href = '/' : setTimeout(checkApp, 2000))
        .catch(() => setTimeout(checkApp, 2000));
    }
    setTimeout(checkApp, 1000);
  </script>
</body>
</html>`;

  fs.writeFileSync('dist/public/index.html', html);

  // Create production package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPkg = {
    name: "amigo-montador",
    version: "1.0.0",
    type: "module",
    main: "index.js",
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    dependencies: {
      express: pkg.dependencies.express,
      "express-session": pkg.dependencies["express-session"],
      "express-fileupload": pkg.dependencies["express-fileupload"],
      passport: pkg.dependencies.passport,
      "passport-local": pkg.dependencies["passport-local"],
      ws: pkg.dependencies.ws,
      "connect-pg-simple": pkg.dependencies["connect-pg-simple"],
      "drizzle-orm": pkg.dependencies["drizzle-orm"],
      "@neondatabase/serverless": pkg.dependencies["@neondatabase/serverless"],
      axios: pkg.dependencies.axios,
      stripe: pkg.dependencies.stripe,
      zod: pkg.dependencies.zod,
      "drizzle-zod": pkg.dependencies["drizzle-zod"],
      "zod-validation-error": pkg.dependencies["zod-validation-error"]
    },
    engines: {
      node: ">=18.0.0"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // Create .replit
  fs.writeFileSync('dist/.replit', `[deployment]
run = ["node", "index.js"]
deploymentTarget = "autoscale"

[[ports]]
localPort = 5000
externalPort = 80
`);

  console.log('✅ Build completed successfully!');
  
  // Verify
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Server build failed');
  }
  
  const size = (fs.statSync('dist/index.js').size / 1024).toFixed(1);
  console.log(`📦 Server: ${size} KB`);
  console.log('🚀 Ready for deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}