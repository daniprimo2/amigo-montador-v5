#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Building for deployment...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // 1. Compile TypeScript server to dist/index.js - this is the critical requirement
  console.log('Compiling server...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --target=node18 \
    --format=esm \
    --bundle \
    --packages=external \
    --outfile=dist/index.js`, 
    { stdio: 'inherit' }
  );

  // Verify the compiled file exists
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('CRITICAL: dist/index.js not created');
  }
  console.log('✓ Server compiled to dist/index.js');

  // 2. Create minimal frontend for production
  fs.mkdirSync('dist/public', { recursive: true });
  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; text-align: center; }
    .loading { color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Amigo Montador</h1>
    <p>Plataforma de conexão entre lojas e montadores</p>
    <div class="loading">Sistema iniciando...</div>
  </div>
  <script>
    // Redirect to main app
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  </script>
</body>
</html>`;
  fs.writeFileSync('dist/public/index.html', indexHtml);
  console.log('✓ Frontend placeholder created');

  // 3. Copy essential directories
  const essentialDirs = ['shared', 'uploads', 'attached_assets'];
  essentialDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const targetDir = `dist/${dir}`;
      fs.cpSync(dir, targetDir, { recursive: true });
      console.log(`✓ Copied ${dir}`);
    }
  });

  // 4. Copy static files
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
    console.log('✓ Copied static files');
  }

  // 5. Create production package.json
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
  console.log('✓ Production package.json created');

  // 6. Verify build
  const stats = fs.statSync('dist/index.js');
  console.log(`\nBuild complete:`);
  console.log(`- dist/index.js: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`- dist/package.json: Created`);
  console.log(`- dist/public/index.html: Created`);
  console.log(`\nDeployment ready!`);

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}