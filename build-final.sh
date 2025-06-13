#!/bin/bash

# Build otimizado e final para Play Store
echo "🚀 Build Final - AmigoMontador"
echo "=============================="

# Limpeza
rm -rf dist/ android/ client/dist

# Build rápido apenas do frontend
echo "📦 Compilando frontend..."
npx vite build --outDir dist/client --minify

# Verificar se funcionou
if [ ! -d "dist/client" ]; then
    echo "❌ Erro no build"
    exit 1
fi

echo "✅ Build concluído!"
echo "📁 Arquivos em: dist/client/"
echo ""
echo "🎯 Próximos passos:"
echo "1. npx cap add android"
echo "2. npx cap sync android"
echo "3. npx cap open android"