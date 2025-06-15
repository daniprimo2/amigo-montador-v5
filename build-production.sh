#!/bin/bash

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
