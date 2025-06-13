#!/bin/bash

echo "🚀 Configuração Rápida para Play Store"
echo "======================================"

# Verificar se já existe build
if [ -d "dist/client" ]; then
    echo "✅ Build existente encontrado em dist/client"
else
    echo "📦 Criando build básico..."
    mkdir -p dist/client
    echo '<!DOCTYPE html><html><head><title>AmigoMontador</title></head><body><div id="root">AmigoMontador</div></body></html>' > dist/client/index.html
fi

# Configurar Capacitor
echo "⚙️ Configurando Capacitor para Android..."

# Adicionar Android se não existir
if [ ! -d "android" ]; then
    npx cap add android
fi

# Sincronizar
npx cap sync android

echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "📋 Próximos passos:"
echo "1. Criar keystore:"
echo "   keytool -genkey -v -keystore android/app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias amigomontador"
echo ""
echo "2. Abrir Android Studio:"
echo "   npx cap open android"
echo ""
echo "3. No Android Studio:"
echo "   - Build > Generate Signed Bundle/APK"
echo "   - Escolher Android App Bundle"
echo "   - Configurar keystore"
echo "   - Gerar AAB"
echo ""
echo "📁 Projeto Android: $(pwd)/android"