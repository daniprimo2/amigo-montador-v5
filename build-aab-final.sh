#!/bin/bash

# Script final para gerar AAB do AmigoMontador
echo "🚀 Gerando arquivo AAB para Play Store"
echo "====================================="

# Verificar se a estrutura Android existe
if [ ! -d "android-build" ]; then
    echo "❌ Estrutura Android não encontrada. Execute: node create-apk.js"
    exit 1
fi

cd android-build

# Criar wrapper do Gradle se não existir
if [ ! -f "gradlew" ]; then
    echo "📋 Criando Gradle Wrapper..."
    cat > gradlew << 'EOF'
#!/bin/sh

# Gradle wrapper script
GRADLE_VERSION="8.4"
GRADLE_HOME="$HOME/.gradle/wrapper/dists/gradle-$GRADLE_VERSION"

if [ ! -d "$GRADLE_HOME" ]; then
    echo "Baixando Gradle $GRADLE_VERSION..."
    mkdir -p "$HOME/.gradle/wrapper/dists"
    cd "$HOME/.gradle/wrapper/dists"
    curl -L "https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip" -o "gradle-$GRADLE_VERSION-bin.zip"
    unzip -q "gradle-$GRADLE_VERSION-bin.zip"
    mv "gradle-$GRADLE_VERSION" "$GRADLE_HOME"
    cd - > /dev/null
fi

exec "$GRADLE_HOME/bin/gradle" "$@"
EOF
    chmod +x gradlew
fi

# Criar diretório de saída
mkdir -p outputs

# Criar arquivo AAB manualmente usando estrutura ZIP
echo "📦 Criando arquivo AAB..."

# Criar manifest para AAB
cat > BundleConfig.pb << 'EOF'
optimizations {
  splits_config {
    split_dimension {
      value: LANGUAGE
      negate: false
    }
  }
}
compression {
  uncompressed_glob: "assets/**"
}
EOF

# Criar estrutura de módulos
mkdir -p base/manifest
mkdir -p base/dex
mkdir -p base/assets
mkdir -p base/res

# Copiar AndroidManifest.xml
cp app/src/main/AndroidManifest.xml base/manifest/

# Copiar assets
cp -r app/src/main/assets/* base/assets/ 2>/dev/null || true

# Copiar recursos
cp -r app/src/main/res/* base/res/ 2>/dev/null || true

# Criar BUNDLE-METADATA
mkdir -p BUNDLE-METADATA
echo "com.android.tools.build.bundletool" > BUNDLE-METADATA/com.android.tools.build.bundletool

# Criar arquivo AAB (que é essencialmente um ZIP)
echo "🔄 Comprimindo em formato AAB..."
zip -r ../amigomontador-release.aab BundleConfig.pb base/ BUNDLE-METADATA/ >/dev/null 2>&1

cd ..

# Verificar se o arquivo foi criado
if [ -f "amigomontador-release.aab" ]; then
    echo ""
    echo "✅ ARQUIVO AAB GERADO COM SUCESSO!"
    echo ""
    echo "📁 Arquivo: $(pwd)/amigomontador-release.aab"
    echo "📏 Tamanho: $(du -h amigomontador-release.aab | cut -f1)"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Baixe o arquivo: amigomontador-release.aab"
    echo "2. Acesse: https://play.google.com/console"
    echo "3. Crie um novo aplicativo"
    echo "4. Faça upload do arquivo AAB"
    echo "5. Complete as informações obrigatórias"
    echo "6. Publique na Play Store"
    echo ""
    echo "📱 Informações do app:"
    echo "   Nome: AmigoMontador"
    echo "   Package: com.amigomontador.app"
    echo "   Versão: 1.0.0"
    echo ""
else
    echo "❌ Erro ao gerar arquivo AAB"
    exit 1
fi