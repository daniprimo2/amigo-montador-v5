const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando processo de build para produção...');

try {
  // Limpar diretório dist se existir
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('🧹 Limpando diretório dist...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // Build do frontend com Vite
  console.log('📦 Fazendo build do frontend...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Compilar TypeScript do servidor
  console.log('⚙️ Compilando TypeScript do servidor...');
  execSync('npx tsc --project tsconfig.json', { stdio: 'inherit' });

  // Copiar arquivos necessários para o dist
  console.log('📋 Copiando arquivos necessários...');
  
  // Copiar package.json
  fs.copyFileSync(
    path.join(__dirname, 'package.json'),
    path.join(distPath, 'package.json')
  );

  // Copiar shared directory
  const sharedSrc = path.join(__dirname, 'shared');
  const sharedDest = path.join(distPath, 'shared');
  if (fs.existsSync(sharedSrc)) {
    fs.cpSync(sharedSrc, sharedDest, { recursive: true });
  }

  // Copiar migrations se existir
  const migrationsSrc = path.join(__dirname, 'migrations');
  const migrationsDest = path.join(distPath, 'migrations');
  if (fs.existsSync(migrationsSrc)) {
    fs.cpSync(migrationsSrc, migrationsDest, { recursive: true });
  }

  // Copiar arquivos estáticos necessários
  const staticFiles = ['default-avatar.svg'];
  staticFiles.forEach(file => {
    const srcFile = path.join(__dirname, file);
    const destFile = path.join(distPath, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  });

  console.log('✅ Build concluído com sucesso!');
  console.log('📁 Arquivos de produção estão em ./dist/');

} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}