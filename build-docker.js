import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Para compatibilidade com ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🐳 Build simplificado para Docker...');

try {
  const distPath = path.join(__dirname, 'dist');
  
  // Limpar diretório dist
  if (fs.existsSync(distPath)) {
    console.log('🧹 Limpando diretório dist...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Criar estrutura básica
  fs.mkdirSync(distPath, { recursive: true });

  // Build do frontend
  console.log('📦 Build do frontend...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Para o servidor, vamos usar uma abordagem mais simples
  console.log('⚙️ Preparando servidor...');
  
  // Criar diretório do servidor no dist
  const serverDistPath = path.join(distPath, 'server');
  fs.mkdirSync(serverDistPath, { recursive: true });
  
  // Copiar arquivos do servidor (será transpilado no Docker)
  console.log('📋 Copiando arquivos do servidor...');
  execSync(`cp -r server/* ${serverDistPath}/`, { stdio: 'inherit' });
  
  // Copiar index.ts como index.js para o root do dist
  fs.copyFileSync(
    path.join(__dirname, 'server/index.ts'),
    path.join(distPath, 'index.js')
  );

  // Copiar package.json e script de start
  fs.copyFileSync(
    path.join(__dirname, 'package.json'),
    path.join(distPath, 'package.json')
  );
  fs.copyFileSync(
    path.join(__dirname, 'start-docker.js'),
    path.join(distPath, 'start-docker.js')
  );

  // Copiar shared directory
  const sharedSrc = path.join(__dirname, 'shared');
  const sharedDest = path.join(distPath, 'shared');
  if (fs.existsSync(sharedSrc)) {
    execSync(`cp -r ${sharedSrc} ${sharedDest}`, { stdio: 'inherit' });
  }

  // Copiar migrations
  const migrationsSrc = path.join(__dirname, 'migrations');
  const migrationsDest = path.join(distPath, 'migrations');
  if (fs.existsSync(migrationsSrc)) {
    execSync(`cp -r ${migrationsSrc} ${migrationsDest}`, { stdio: 'inherit' });
  }

  // Copiar arquivos estáticos
  const staticFiles = ['default-avatar.svg'];
  staticFiles.forEach(file => {
    const srcFile = path.join(__dirname, file);
    const destFile = path.join(distPath, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  });

  console.log('✅ Build Docker concluído!');
  console.log('📁 Arquivos prontos em ./dist/');
  console.log('🐳 O TypeScript será transpilado durante o build do Docker');

} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}