# 🐳 Docker Deployment - Amigo Montador

Este documento contém todas as instruções para dockerizar e fazer deploy da aplicação Amigo Montador.

## 📋 Pré-requisitos

- Docker (versão 20.0 ou superior)
- Docker Compose (versão 2.0 ou superior)
- Git

## 🚀 Deploy Rápido

### 1. Clone o repositório (se ainda não fez)
```bash
git clone <seu-repositorio>
cd amigo-montador
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env  # ou use seu editor preferido
```

### 3. Execute o script de deploy
```bash
./docker-deploy.sh
```

## 🔧 Deploy Manual

### 1. Configurar ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar variáveis necessárias
vim .env
```

### 2. Build e execução
```bash
# Fazer build das imagens
docker-compose build

# Iniciar os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### 3. Executar migrations
```bash
# Aplicar migrations do banco
docker-compose exec app npm run db:push
```

## 📁 Estrutura dos Arquivos Docker

```
├── Dockerfile              # Imagem da aplicação
├── docker-compose.yml      # Orquestração dos serviços
├── .dockerignore           # Arquivos ignorados no build
├── init-db.sql            # Script de inicialização do banco
├── docker-deploy.sh       # Script automatizado de deploy
└── .env.example           # Exemplo de variáveis de ambiente
```

## 🏗️ Arquitetura

A aplicação roda em dois containers:

- **app**: Aplicação Node.js + React (porta 5000)
- **db**: PostgreSQL 15 (porta 5432)

## 🌍 Variáveis de Ambiente

### Obrigatórias
```env
DATABASE_URL=postgresql://usuario:senha@host:porta/database
NODE_ENV=production
PORT=5000
SESSION_SECRET=sua-chave-secreta-super-segura
```

### Opcionais
```env
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app

# Pagamento
STRIPE_SECRET_KEY=sk_test_...
PAGARME_API_KEY=ak_test_...
```

## 📊 Comandos Úteis

### Gestão dos containers
```bash
# Iniciar serviços
docker-compose up -d

# Parar serviços
docker-compose down

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f app

# Reiniciar um serviço
docker-compose restart app

# Executar comando dentro do container
docker-compose exec app bash
```

### Banco de dados
```bash
# Conectar ao PostgreSQL
docker-compose exec db psql -U amigo_user -d amigo_montador_db

# Fazer backup
docker-compose exec db pg_dump -U amigo_user amigo_montador_db > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U amigo_user -d amigo_montador_db < backup.sql

# Ver migrations
docker-compose exec app npm run db:push
```

### Monitoramento
```bash
# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats

# Health check da aplicação
curl http://localhost:5000/health
```

## 🔍 Troubleshooting

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs app

# Verificar configuração
docker-compose config

# Rebuild sem cache
docker-compose build --no-cache
```

### Problemas de conexão com banco
```bash
# Verificar se o PostgreSQL está rodando
docker-compose exec db pg_isready -U amigo_user

# Testar conexão
docker-compose exec app node -e "console.log('DATABASE_URL:', process.env.DATABASE_URL)"
```

### Problemas de permissão
```bash
# Verificar usuário no container
docker-compose exec app whoami

# Verificar permissões dos arquivos
docker-compose exec app ls -la /app
```

## 🚀 Deploy em Produção

### 1. Servidor VPS/Cloud

```bash
# No servidor de produção
git clone <seu-repositorio>
cd amigo-montador

# Configurar variáveis de produção
cp .env.example .env
nano .env  # Configure com valores de produção

# Deploy
./docker-deploy.sh
```

### 2. Configurações de produção importantes

```env
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@host:porta/database
SESSION_SECRET=chave-super-segura-aleatoria
ALLOWED_ORIGINS=https://seudominio.com
```

### 3. Proxy reverso (Nginx)

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Segurança

### Checklist de segurança
- [ ] Usar chaves SESSION_SECRET únicas e seguras
- [ ] Configurar SSL/TLS (HTTPS)
- [ ] Usar senhas fortes para o banco de dados
- [ ] Configurar firewall adequadamente
- [ ] Manter imagens Docker atualizadas
- [ ] Fazer backups regulares do banco

### Atualizações
```bash
# Atualizar imagens base
docker-compose pull

# Rebuild e restart
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Confirme variáveis de ambiente no `.env`
3. Teste conectividade do banco
4. Verifique se todas as portas estão disponíveis

## 🎯 Performance

### Otimizações recomendadas
- Use volumes para dados persistentes
- Configure limites de recursos
- Monitore uso de CPU/memória
- Configure logs rotation

### Monitoramento
```bash
# Recursos utilizados
docker stats

# Espaço em disco
docker system df

# Limpeza periódica
docker system prune -f
```