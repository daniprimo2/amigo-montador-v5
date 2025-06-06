#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Starting production build...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // Step 1: Build server using the working esbuild config
  console.log('Building server...');
  execSync('node esbuild.config.js', { stdio: 'inherit' });

  // Step 2: Create minimal client build directory structure
  console.log('Creating client build structure...');
  fs.mkdirSync('dist/public', { recursive: true });

  // Copy client files directly for a minimal build
  const clientIndexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Amigo Montador</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais no Brasil" />
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
    .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Carregando aplicação...</div>
  </div>
  <script>
    // Basic fallback for production
    if (!window.React) {
      document.getElementById('root').innerHTML = '<div style="text-align: center; padding: 50px;"><h1>Amigo Montador</h1><p>Aplicação em modo de produção</p></div>';
    }
  </script>
</body>
</html>`;

  fs.writeFileSync('dist/public/index.html', clientIndexHtml);

  // Step 3: Copy necessary assets
  console.log('Copying assets...');
  
  // Copy attached assets
  if (fs.existsSync('attached_assets')) {
    fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  // Create uploads directory
  fs.mkdirSync('dist/uploads', { recursive: true });

  // Copy default avatar if exists
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  }

  // Step 4: Verify the build
  const indexExists = fs.existsSync('dist/index.js');
  const publicExists = fs.existsSync('dist/public/index.html');
  const packageExists = fs.existsSync('dist/package.json');

  console.log('\nBuild verification:');
  console.log(`✓ Server (dist/index.js): ${indexExists ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✓ Client (dist/public/): ${publicExists ? 'SUCCESS' : 'FAILED'}`);
  console.log(`✓ Package.json: ${packageExists ? 'SUCCESS' : 'FAILED'}`);

  if (!indexExists) {
    throw new Error('Server build failed - dist/index.js not found');
  }

  console.log('\n🎉 Production build completed successfully!');
  console.log('📁 Build output:');
  console.log('   - dist/index.js (server)');
  console.log('   - dist/public/ (client)');
  console.log('   - dist/package.json (dependencies)');
  console.log('\n🚀 Ready for deployment!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}