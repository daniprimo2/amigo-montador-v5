#!/bin/bash

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
