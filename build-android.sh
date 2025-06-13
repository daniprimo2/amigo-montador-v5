#!/bin/bash

# Script para gerar APK/AAB para a Play Store
# AmigoMontador - Build Android

echo "🚀 Iniciando build do AmigoMontador para Android..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale o npm primeiro."
    exit 1
fi

# Instalar dependências se necessário
echo "📦 Verificando dependências..."
npm install

# Build da aplicação web
echo "🔧 Fazendo build da aplicação web..."
npm run build

# Verificar se o build foi criado
if [ ! -d "client/dist" ]; then
    echo "❌ Erro: Pasta client/dist não encontrada. O build falhou."
    exit 1
fi

# Inicializar Capacitor se ainda não foi feito
if [ ! -f "capacitor.config.ts" ]; then
    echo "⚙️ Inicializando Capacitor..."
    npx cap init "AmigoMontador" "com.amigomontador.app" --web-dir="client/dist"
fi

# Adicionar plataforma Android se ainda não foi adicionada
if [ ! -d "android" ]; then
    echo "📱 Adicionando plataforma Android..."
    npx cap add android
fi

# Sincronizar arquivos com o projeto Android
echo "🔄 Sincronizando arquivos..."
npx cap sync android

# Copiar arquivos web para o projeto Android
echo "📋 Copiando arquivos web..."
npx cap copy android

# Verificar se o Android Studio está disponível
if command -v android-studio &> /dev/null; then
    echo "🎯 Android Studio encontrado!"
    echo "📖 Para continuar:"
    echo "1. Abra o Android Studio"
    echo "2. Abra o projeto em: $(pwd)/android"
    echo "3. Vá em Build > Generate Signed Bundle/APK"
    echo "4. Escolha Android App Bundle (AAB) para Play Store"
    echo "5. Configure seu keystore ou crie um novo"
else
    echo "⚠️ Android Studio não encontrado no PATH"
    echo "📖 Instruções para continuar:"
    echo "1. Instale o Android Studio: https://developer.android.com/studio"
    echo "2. Abra o projeto em: $(pwd)/android"
    echo "3. Vá em Build > Generate Signed Bundle/APK"
    echo "4. Escolha Android App Bundle (AAB) para Play Store"
fi

echo ""
echo "✅ Preparação do projeto Android concluída!"
echo "📁 Projeto Android está em: $(pwd)/android"
echo ""
echo "🔑 PRÓXIMOS PASSOS IMPORTANTES:"
echo "1. Criar um keystore para assinar o app"
echo "2. Configurar as variáveis de ambiente do keystore"
echo "3. Gerar o AAB no Android Studio"
echo "4. Fazer upload na Play Console"
echo ""
echo "📋 Para gerar o keystore execute:"
echo "keytool -genkey -v -keystore android/app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias amigomontador"