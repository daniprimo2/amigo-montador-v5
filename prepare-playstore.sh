#!/bin/bash

# Script final de preparação para Play Store
# AmigoMontador - Versão otimizada para produção

set -e  # Parar em caso de erro

echo "🚀 Preparando AmigoMontador para Play Store"
echo "=========================================="

# Verificar dependências
command -v node >/dev/null 2>&1 || { echo "❌ Node.js é necessário"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm é necessário"; exit 1; }

# Limpeza inicial
echo "🧹 Limpando builds anteriores..."
rm -rf dist/
rm -rf android/
rm -rf client/dist

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Build da aplicação
echo "🔧 Fazendo build da aplicação..."
npm run build

# Verificar se o build foi criado
if [ ! -d "dist/client" ]; then
    echo "❌ Erro: Build não foi criado corretamente"
    exit 1
fi

# Criar estrutura para Capacitor
echo "⚙️ Preparando estrutura Android..."
mkdir -p client
ln -sf ../dist/client client/dist

# Inicializar Capacitor
echo "📱 Configurando Capacitor..."
npx cap add android

# Copiar configurações customizadas
if [ -f "android-app.gradle" ]; then
    echo "📋 Aplicando configurações Android customizadas..."
    cp android-app.gradle android/app/build.gradle.custom
fi

# Sincronizar arquivos
echo "🔄 Sincronizando com Android..."
npx cap sync android
npx cap copy android

# Criar ícones se necessário
if [ -f "android-app-icons/icon.svg" ]; then
    echo "🎨 Processando ícones..."
    # Aqui você pode adicionar scripts para gerar ícones em diferentes tamanhos
fi

echo ""
echo "✅ APLICATIVO PREPARADO PARA PLAY STORE!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🔑 Criar keystore para assinatura:"
echo "   keytool -genkey -v -keystore android/app/keystore.jks \\"
echo "     -keyalg RSA -keysize 2048 -validity 10000 -alias amigomontador"
echo ""
echo "2. ⚙️ Configurar gradle.properties:"
echo "   MYAPP_RELEASE_STORE_FILE=app/keystore.jks"
echo "   MYAPP_RELEASE_KEY_ALIAS=amigomontador"
echo "   MYAPP_RELEASE_STORE_PASSWORD=SUA_SENHA"
echo "   MYAPP_RELEASE_KEY_PASSWORD=SUA_SENHA"
echo ""
echo "3. 🏗️ Abrir no Android Studio:"
echo "   npx cap open android"
echo ""
echo "4. 📦 Gerar AAB:"
echo "   Build > Generate Signed Bundle/APK > Android App Bundle"
echo ""
echo "5. 🌐 Publicar na Play Console:"
echo "   - Acesse console.play.google.com"
echo "   - Crie um novo aplicativo"
echo "   - Faça upload do AAB gerado"
echo ""
echo "📁 Projeto Android: $(pwd)/android"
echo "📖 Guia completo: GUIA_PUBLICACAO_PLAY_STORE.md"