#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Iniciando build para deploy...\n');

// Limpar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Diretório dist limpo');
}

// Criar estrutura de diretórios
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('dist/public', { recursive: true });
console.log('✅ Estrutura de diretórios criada');

// 1. Build do frontend com Vite
console.log('\n📦 Fazendo build do frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Frontend construído com sucesso');
} catch (error) {
  console.error('❌ Erro no build do frontend:', error);
  process.exit(1);
}

// 2. Build do servidor com esbuild
console.log('\n🖥️ Fazendo build do servidor...');
try {
  execSync(`npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --external:drizzle-kit --external:@replit/vite-plugin-cartographer --external:@replit/vite-plugin-runtime-error-modal`, { stdio: 'inherit' });
  console.log('✅ Servidor construído com sucesso');
} catch (error) {
  console.error('❌ Erro no build do servidor:', error);
  process.exit(1);
}

// 3. Criar package.json para produção
const productionPackage = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.0.1",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@tanstack/react-query": "^5.80.6",
    "axios": "^1.9.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^4.1.0",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.1",
    "express": "^4.21.2",
    "express-fileupload": "^1.5.1",
    "express-session": "^1.18.1",
    "lucide-react": "^0.513.0",
    "node-fetch": "^3.3.2",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^19.1.0",
    "react-day-picker": "^9.7.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.57.0",
    "stripe": "^18.1.0",
    "tailwind-merge": "^3.3.0",
    "tailwindcss-animate": "^1.0.7",
    "wouter": "^3.7.1",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));
console.log('✅ package.json de produção criado');

// 4. Copiar diretórios essenciais
const copyDirs = ['shared', 'uploads', 'attached_assets'];
copyDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`✅ Copiado ${dir}/`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`✅ Criado diretório vazio ${dir}/`);
  }
});

// 5. Copiar arquivos estáticos importantes
const staticFiles = ['default-avatar.svg'];
staticFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `dist/${file}`);
    console.log(`✅ Copiado ${file}`);
  }
});

// 6. Criar arquivo .replit para deploy
const replitConfig = `run = "node index.js"
entrypoint = "index.js"

[env]
PORT = "5000"
NODE_ENV = "production"

[deployment]
run = ["node", "index.js"]
deploymentTarget = "cloudrun"
`;

fs.writeFileSync('dist/.replit', replitConfig);
console.log('✅ Configuração .replit criada');

// 7. Verificar arquivos necessários
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html',
  'dist/.replit'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('\n❌ Arquivos obrigatórios não encontrados:', missingFiles);
  process.exit(1);
}

console.log('\n🎉 Build de deploy concluído com sucesso!');
console.log('\n📁 Arquivos criados:');
console.log('  • dist/index.js - Servidor de produção');
console.log('  • dist/package.json - Dependências de produção');
console.log('  • dist/public/index.html - Frontend');
console.log('  • dist/shared/ - Esquemas do banco');
console.log('  • dist/uploads/ - Armazenamento de arquivos');
console.log('  • dist/attached_assets/ - Assets estáticos');
console.log('  • dist/.replit - Configuração de deploy');

console.log('\n🚀 Pronto para deploy!');
console.log('💡 O diretório "dist/" contém tudo necessário para deploy no Replit.');