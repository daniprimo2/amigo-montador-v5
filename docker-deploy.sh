#!/bin/bash

# Script de deploy para produção com Docker
set -e

echo "🚀 Iniciando deploy do Amigo Montador..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Instale o Docker primeiro."
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado. Instale o Docker Compose primeiro."
    exit 1
fi

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    warn "Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    warn "Configure as variáveis de ambiente no arquivo .env antes de continuar."
    read -p "Pressione Enter para continuar após configurar o .env..."
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down || true

# Limpar imagens antigas (opcional)
read -p "Deseja remover imagens Docker antigas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Removendo imagens antigas..."
    docker system prune -f || true
    docker image prune -f || true
fi

# Build da aplicação
log "Fazendo build da aplicação..."
docker-compose build --no-cache

# Iniciar serviços
log "Iniciando serviços..."
docker-compose up -d

# Aguardar serviços ficarem prontos
log "Aguardando serviços ficarem prontos..."
sleep 10

# Verificar status dos serviços
log "Verificando status dos serviços..."
if docker-compose ps | grep -q "Up"; then
    log "✅ Serviços iniciados com sucesso!"
    
    # Executar migrations se necessário
    log "Executando migrations do banco de dados..."
    docker-compose exec app npm run db:push || warn "Erro ao executar migrations. Execute manualmente se necessário."
    
    log "🎉 Deploy concluído com sucesso!"
    log "📱 Aplicação disponível em: http://localhost:5000"
    log "🗄️  Banco de dados disponível em: localhost:5432"
    log ""
    log "Para ver os logs: docker-compose logs -f"
    log "Para parar: docker-compose down"
    
else
    error "Falha ao iniciar os serviços. Verificando logs..."
    docker-compose logs
    exit 1
fi