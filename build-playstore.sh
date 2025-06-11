#!/bin/bash

# Script completo para gerar AAB para Play Store
# MontaFácil - Build para Produção

echo "🚀 MontaFácil - Build para Play Store"
echo "====================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado."
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado."
    exit 1
fi

echo "✅ Dependências verificadas"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build da aplicação web
echo "🔧 Fazendo build da aplicação web..."
npm run build

# Verificar se o build existe
if [ ! -d "client/dist" ]; then
    echo "❌ Build da web falhou. Pasta client/dist não encontrada."
    exit 1
fi

echo "✅ Build da web concluído"

# Inicializar Capacitor
echo "⚙️ Configurando Capacitor..."
if [ ! -f "capacitor.config.ts" ]; then
    npx cap init "MontaFácil" "com.montafacil.app" --web-dir="client/dist"
fi

# Adicionar plataforma Android
echo "📱 Configurando Android..."
if [ ! -d "android" ]; then
    npx cap add android
fi

# Sincronizar com Android
echo "🔄 Sincronizando arquivos..."
npx cap sync android
npx cap copy android

echo ""
echo "✅ PROJETO ANDROID PREPARADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🔑 Criar keystore:"
echo "   keytool -genkey -v -keystore android/app/keystore.jks \\"
echo "     -keyalg RSA -keysize 2048 -validity 10000 -alias montafacil"
echo ""
echo "2. ⚙️ Configurar senhas no arquivo gradle.properties"
echo ""
echo "3. 🏗️ Abrir no Android Studio:"
echo "   - Abra a pasta android/ no Android Studio"
echo "   - Build > Generate Signed Bundle/APK"
echo "   - Escolha Android App Bundle (AAB)"
echo "   - Configure o keystore"
echo "   - Gere o arquivo AAB"
echo ""
echo "4. 🌐 Publicar na Play Store:"
echo "   - Acesse play.google.com/console"
echo "   - Crie um novo aplicativo"
echo "   - Faça upload do arquivo AAB"
echo "   - Complete as informações obrigatórias"
echo ""
echo "📁 Projeto localizado em: $(pwd)/android"
echo "📖 Consulte GUIA_PUBLICACAO_PLAY_STORE.md para detalhes"
echo ""
echo "🎉 Pronto para a Play Store!"