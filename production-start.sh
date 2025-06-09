#!/bin/bash
set -e

echo "Iniciando deployment de produção..."

# Verificar se estamos em produção
export NODE_ENV=production

# Criar build se não existir
if [ ! -f "dist/index.js" ]; then
    echo "Criando build de produção..."
    node deployment-final.js
fi

# Verificar se o build foi criado
if [ ! -f "dist/index.js" ]; then
    echo "ERRO: dist/index.js não foi criado"
    exit 1
fi

echo "Build encontrado ($(du -h dist/index.js | cut -f1))"

# Configurar porta
export PORT=${PORT:-5000}

echo "Iniciando servidor na porta $PORT..."

# Iniciar servidor
exec node dist/index.js