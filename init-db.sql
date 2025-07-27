-- Script de inicialização do banco de dados
-- Este arquivo será executado automaticamente quando o container PostgreSQL for criado

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar timezone
SET timezone = 'America/Sao_Paulo';

-- Comentário informativo
COMMENT ON DATABASE amigo_montador_db IS 'Database for Amigo Montador application';

-- As tabelas serão criadas através das migrations do Drizzle
-- Este arquivo serve apenas para configurações iniciais básicas