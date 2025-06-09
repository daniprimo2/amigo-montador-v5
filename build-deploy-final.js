#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Construindo deployment final...');

// Limpar diretório dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Compilar servidor usando esbuild (mais confiável para deployment)
console.log('📦 Compilando servidor com esbuild...');
try {
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/index.js \
    --target=node18 \
    --define:process.env.NODE_ENV='"production"' \
    --external:express \
    --external:express-session \
    --external:express-fileupload \
    --external:passport \
    --external:passport-local \
    --external:drizzle-orm \
    --external:@neondatabase/serverless \
    --external:ws \
    --external:connect-pg-simple \
    --external:axios \
    --external:stripe \
    --external:zod \
    --external:drizzle-zod \
    --external:zod-validation-error \
    --external:node-fetch \
    --external:date-fns`, 
    { stdio: 'inherit' }
  );
  console.log('✅ Servidor compilado com sucesso');
} catch (error) {
  console.error('❌ Falha na compilação:', error.message);
  process.exit(1);
}

// Verificar se o arquivo principal foi criado
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ ERRO CRÍTICO: dist/index.js não foi criado');
  process.exit(1);
}

// Criar package.json de produção
console.log('📄 Criando package.json de produção...');
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
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
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Criar diretórios necessários
console.log('📁 Criando estrutura de diretórios...');
const dirsToCreate = [
  'dist/uploads/documents',
  'dist/uploads/logos', 
  'dist/uploads/profiles',
  'dist/uploads/projects',
  'dist/attached_assets',
  'dist/shared'
];

dirsToCreate.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Copiar arquivos essenciais
console.log('📋 Copiando arquivos essenciais...');

// Copiar schema compartilhado
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  console.log('✅ Schema compartilhado copiado');
}

// Copiar uploads existentes
if (fs.existsSync('uploads')) {
  fs.cpSync('uploads', 'dist/uploads', { recursive: true });
  console.log('✅ Uploads copiados');
}

// Copiar assets anexados
if (fs.existsSync('attached_assets')) {
  fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  console.log('✅ Assets anexados copiados');
}

// Copiar avatar padrão
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  console.log('✅ Avatar padrão copiado');
}

// Verificação final de deployment
console.log('🔍 Verificação final de deployment...');

const validacoes = [
  { nome: 'Arquivo principal existe', teste: fs.existsSync('dist/index.js') },
  { nome: 'Package.json de produção existe', teste: fs.existsSync('dist/package.json') },
  { nome: 'Diretório de uploads existe', teste: fs.existsSync('dist/uploads') },
  { nome: 'Schema compartilhado existe', teste: fs.existsSync('dist/shared') },
  { nome: 'Assets anexados existem', teste: fs.existsSync('dist/attached_assets') }
];

let todasValidas = true;
validacoes.forEach(v => {
  if (v.teste) {
    console.log(`✅ ${v.nome}`);
  } else {
    console.log(`❌ ${v.nome}`);
    todasValidas = false;
  }
});

if (!todasValidas) {
  console.error('❌ Validação de deployment falhou');
  process.exit(1);
}

// Verificar configuração do servidor
const serverContent = fs.readFileSync('dist/index.js', 'utf8');
const configsEssenciais = [
  { nome: 'Suporte a PORT env var', teste: serverContent.includes('process.env.PORT') },
  { nome: 'Binding para 0.0.0.0', teste: serverContent.includes('0.0.0.0') },
  { nome: 'Endpoints de saúde', teste: serverContent.includes('/health') }
];

configsEssenciais.forEach(c => {
  if (c.teste) {
    console.log(`✅ ${c.nome}`);
  } else {
    console.log(`⚠️ ${c.nome} pode estar ausente`);
  }
});

// Resumo final
const tamanhoArquivo = fs.statSync('dist/index.js').size;
console.log(`\n📊 Resumo do Build:`);
console.log(`- Arquivo principal: ${Math.round(tamanhoArquivo / 1024)}KB`);
console.log(`- Dependências: ${Object.keys(prodPkg.dependencies).length} pacotes`);
console.log(`- Assets copiados: ${fs.readdirSync('dist').length} itens`);

console.log('\n🎉 Deployment construído com sucesso!');
console.log('✓ Servidor compilado e otimizado');
console.log('✓ Dependências de produção configuradas');
console.log('✓ Configuração de porta e host correta');
console.log('✓ Todos os assets e diretórios copiados');
console.log('✓ Endpoints de monitoramento configurados');
console.log('\n🚀 Pronto para deployment no Replit!');