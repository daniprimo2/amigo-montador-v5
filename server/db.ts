import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Mostrar informações de debug
console.log('Variáveis de ambiente do banco:', {
  DATABASE_URL: process.env.DATABASE_URL ? '***definida***' : undefined,
  PGHOST: process.env.PGHOST,
  PGUSER: process.env.PGUSER,
  PGPASSWORD: process.env.PGPASSWORD ? '***definida***' : undefined,
  PGDATABASE: process.env.PGDATABASE,
  PGPORT: process.env.PGPORT
});

// Configure Neon WebSocket only in serverless environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Usar a variável de ambiente DATABASE_URL ou construir a partir das outras variáveis
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://neondb_owner:password@ep-example.neon.tech/neondb?sslmode=require') {
    return process.env.DATABASE_URL;
  }
  
  // Construir URL a partir de variáveis individuais
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || '5432';
    return `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  throw new Error(
    "AÇÃO NECESSÁRIA: Configure uma URL de banco real no arquivo .env\n" +
    "1. Acesse https://neon.tech ou https://www.elephantsql.com\n" +
    "2. Crie uma conta gratuita\n" +
    "3. Copie a string de conexão\n" +
    "4. Cole no arquivo .env como DATABASE_URL="
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
