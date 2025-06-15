#!/bin/bash

echo "🏗️ Preparando build para Play Store..."

# Limpar builds anteriores
rm -rf dist/
rm -rf android/app/src/main/assets/public/

# Build otimizado do frontend
echo "📦 Building frontend..."
NODE_ENV=production npm run build

# Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "❌ Erro no build do frontend"
  exit 1
fi

# Sync com Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

echo "✅ Projeto pronto para gerar AAB!"
echo "📱 Para gerar AAB: cd android && ./gradlew bundleRelease"
echo "📍 AAB será gerado em: android/app/build/outputs/bundle/release/"
