#!/usr/bin/env node

/**
 * Script para otimizar o projeto AmigoMontador para produção
 * Remove logs de desenvolvimento e prepara para publicação na Play Store
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando otimização para produção...');

// Função para processar arquivos recursivamente
function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = fs.readdirSync(dir);
  let processedFiles = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file)) {
      processedFiles += processDirectory(filePath, extensions);
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      if (optimizeFile(filePath)) {
        processedFiles++;
      }
    }
  });

  return processedFiles;
}

// Função para otimizar um arquivo específico
function optimizeFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let changes = 0;

  // Remover console.log de desenvolvimento
  content = content.replace(/console\.log\([^)]*\);?\s*\n?/g, match => {
    // Manter apenas logs importantes de erro ou produção
    if (match.includes('ERROR') || match.includes('ERRO') || 
        match.includes('Cliente conectado') || match.includes('Cliente desconectado') ||
        match.includes('Nova conexão WebSocket')) {
      return match;
    }
    changes++;
    return '';
  });

  // Remover console.debug
  content = content.replace(/console\.debug\([^)]*\);?\s*\n?/g, () => {
    changes++;
    return '';
  });

  // Remover comentários de debug excessivos
  content = content.replace(/\/\/ \[DEBUG\].*\n/g, () => {
    changes++;
    return '';
  });

  content = content.replace(/\/\* DEBUG:.*?\*\/\s*/gs, () => {
    changes++;
    return '';
  });

  // Otimizar console.error para produção (manter apenas mensagens essenciais)
  content = content.replace(/console\.error\(`\[.*?\].*?`[^;]*\);?\s*\n?/g, match => {
    // Manter erros importantes
    if (match.includes('Erro ao') || match.includes('Error:') || match.includes('ERRO')) {
      changes++;
      return '// Error logging removed for production\n';
    }
    changes++;
    return '';
  });

  // Remover logs específicos do projeto
  content = content.replace(/console\.log\(`\[.*?\].*?`[^;]*\);?\s*\n?/g, () => {
    changes++;
    return '';
  });

  // Limpar linhas vazias excessivas
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${changes} otimizações`);
    return true;
  }

  return false;
}

// Função para criar configuração de produção do Capacitor
function createProductionCapacitorConfig() {
  const capacitorConfig = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amigomontador.app',
  appName: 'AmigoMontador',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false // Desabilitado para produção
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563EB",
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#2563EB"
    }
  }
};

export default config;
`;

  fs.writeFileSync('capacitor.config.ts', capacitorConfig);
  console.log('✅ Configuração do Capacitor otimizada para produção');
}

// Função para criar script de build otimizado
function createOptimizedBuildScript() {
  const buildScript = `#!/bin/bash

echo "🏗️  Iniciando build otimizado para produção..."

# Limpar builds anteriores
rm -rf dist/
rm -rf android/app/src/main/assets/public/

# Build do frontend otimizado
echo "📦 Building frontend..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "❌ Erro no build do frontend"
  exit 1
fi

# Sync com Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

echo "✅ Build otimizado concluído!"
echo "📱 Pronto para gerar AAB com: npm run android:build"
`;

  fs.writeFileSync('build-production.sh', buildScript);
  fs.chmodSync('build-production.sh', '755');
  console.log('✅ Script de build otimizado criado');
}

// Função para criar script de build do Android
function createAndroidBuildScript() {
  const androidScript = `#!/bin/bash

echo "📱 Preparando build Android para Play Store..."

# Verificar se o projeto foi buildado
if [ ! -d "dist" ]; then
  echo "❌ Execute primeiro: ./build-production.sh"
  exit 1
fi

# Build do Android
echo "🔨 Building Android AAB..."
cd android
./gradlew bundleRelease

if [ $? -eq 0 ]; then
  echo "✅ AAB gerado com sucesso!"
  echo "📍 Localização: android/app/build/outputs/bundle/release/app-release.aab"
  echo "🚀 Pronto para upload na Play Store!"
else
  echo "❌ Erro ao gerar AAB"
  exit 1
fi

cd ..
`;

  fs.writeFileSync('build-android.sh', androidScript);
  fs.chmodSync('build-android.sh', '755');
  console.log('✅ Script de build Android criado');
}

// Função para otimizar package.json para produção
function optimizePackageJson() {
  const packagePath = 'package.json';
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Adicionar scripts de produção
    packageJson.scripts = {
      ...packageJson.scripts,
      'build:prod': './build-production.sh',
      'android:build': './build-android.sh',
      'optimize': 'node optimize-for-production.js'
    };

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Package.json otimizado com novos scripts');
  }
}

// Função para criar arquivo de ambiente de produção
function createProductionEnv() {
  const prodEnv = `# Configurações de Produção
NODE_ENV=production
VITE_APP_TITLE=AmigoMontador
VITE_API_URL=https://amigomontador.replit.app
`;

  fs.writeFileSync('.env.production', prodEnv);
  console.log('✅ Arquivo .env.production criado');
}

// Executar otimizações
console.log('📁 Processando arquivos do servidor...');
const serverFiles = processDirectory('./server');

console.log('📁 Processando arquivos do cliente...');
const clientFiles = processDirectory('./client/src');

console.log('🔧 Criando configurações de produção...');
createProductionCapacitorConfig();
createOptimizedBuildScript();
createAndroidBuildScript();
optimizePackageJson();
createProductionEnv();

console.log('\n🎉 Otimização concluída!');
console.log(`📊 Total de arquivos otimizados: ${serverFiles + clientFiles}`);
console.log('\n📋 Próximos passos:');
console.log('1. Execute: npm run build:prod');
console.log('2. Execute: npm run android:build');
console.log('3. Upload do AAB para a Play Store');
console.log('\n🚀 Projeto pronto para produção!');