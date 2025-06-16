#!/bin/bash

echo "🚀 AmigoMontador - Build AAB para Play Store"
echo "============================================="

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório react-native-app/"
    exit 1
fi

# Limpar builds anteriores
echo "🧹 Limpando builds anteriores..."
cd android
./gradlew clean

# Verificar se keystore existe
if [ ! -f "app/amigomontador-release-key.keystore" ]; then
    echo "⚠️  Keystore não encontrado. Gerando..."
    keytool -genkey -v -keystore app/amigomontador-release-key.keystore \
        -alias amigomontador-key-alias \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass amigomontador123 \
        -keypass amigomontador123 \
        -dname "CN=AmigoMontador, OU=Development, O=AmigoMontador, L=Brazil, S=BR, C=BR"
    echo "✅ Keystore gerado com sucesso!"
fi

# Gerar AAB
echo "📦 Gerando Android App Bundle..."
./gradlew bundleRelease

# Verificar se AAB foi gerado
AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo "✅ AAB gerado com sucesso!"
    echo "📁 Localização: $AAB_PATH"
    echo "📏 Tamanho: $AAB_SIZE"
    
    # Verificar assinatura
    echo "🔐 Verificando assinatura..."
    if jarsigner -verify -verbose -certs "$AAB_PATH" > /dev/null 2>&1; then
        echo "✅ AAB assinado corretamente!"
    else
        echo "❌ Erro na assinatura do AAB"
        exit 1
    fi
    
    echo ""
    echo "🎉 Build concluído com sucesso!"
    echo "📤 O arquivo AAB está pronto para upload na Play Store"
    echo ""
    echo "Próximos passos:"
    echo "1. Acesse o Google Play Console"
    echo "2. Faça upload do arquivo: $AAB_PATH"
    echo "3. Complete os metadados do app"
    echo "4. Publique na Play Store"
    
else
    echo "❌ Erro ao gerar AAB"
    exit 1
fi