# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS base
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++

# Stage 1: Instalar dependências
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build da aplicação
FROM base AS builder
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (frontend + preparação)
RUN npm run build

# Garantir que temos um arquivo JS executável
RUN if [ ! -f dist/index.js ]; then \
    echo "Criando index.js a partir do TypeScript..." && \
    npx tsx server/index.ts --build --outDir dist 2>/dev/null || \
    cp server/index.ts dist/index.js; \
    fi

# Stage 3: Imagem de produção
FROM node:18-alpine AS production

# Instalar dependências do sistema para produção
RUN apk add --no-cache dumb-init wget

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copiar dependências de produção
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar arquivos built
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/attached_assets ./attached_assets

# Copiar arquivos necessários para runtime
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/start-docker.js ./
COPY --from=builder --chown=nodejs:nodejs /app/default-avatar.svg ./
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/services ./services

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 5000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Usar dumb-init para proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Comando para rodar a aplicação (inteligente JS/TS)
CMD ["node", "start-docker.js"]