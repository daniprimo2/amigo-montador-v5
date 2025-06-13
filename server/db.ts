import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se está usando o banco do Replit
if (process.env.DATABASE_URL) {
  console.log('✅ Usando banco PostgreSQL do Replit');
} else {
  console.log('⚠️ DATABASE_URL não encontrada');
}

// Configure Neon WebSocket only in serverless environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Usar a variável de ambiente DATABASE_URL do Replit
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Construir URL a partir de variáveis individuais do Replit
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || '5432';
    return `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  throw new Error(
    "Banco de dados do Replit não configurado. Verifique se o PostgreSQL está provisionado."
  );
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  const connectionString = getDatabaseUrl();
  pool = new Pool({ 
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  db = drizzle({ client: pool, schema });
  console.log('✅ Configuração do banco inicializada');
} catch (error) {
  console.error('❌ Erro na conexão do banco:', error instanceof Error ? error.message : error);
  console.log('📋 Solução: Configure DATABASE_URL no arquivo .env');
  console.log('📖 Veja o arquivo CONFIGURACAO_BANCO_LOCAL.md para instruções detalhadas');
  throw error;
}

export { pool, db };
