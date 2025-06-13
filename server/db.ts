import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema.js";

// Usar a variável de ambiente DATABASE_URL ou construir a partir das outras variáveis
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Construir URL a partir de variáveis individuais
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || '5432';
    return `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${port}/${PGDATABASE}?sslmode=require`;
  }

  throw new Error(
    "Configuração do banco de dados não encontrada. Defina DATABASE_URL ou as variáveis PGHOST, PGUSER, PGPASSWORD, PGDATABASE."
  );
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  const connectionString = getDatabaseUrl();
  
  // Configuração simplificada do pool
  pool = new Pool({ 
    connectionString
  });
  
  db = drizzle({ client: pool, schema });
  console.log('✅ Database connection initialized successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  throw error;
}

export { pool, db };
