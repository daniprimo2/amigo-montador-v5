import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "../shared/schema.js";

// Configure WebSocket para Node.js
neonConfig.webSocketConstructor = ws;

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

const initializeDatabase = async () => {
  try {
    const connectionString = getDatabaseUrl();
    
    // Configuração do pool com timeout e configurações específicas
    pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 10000
    });
    
    db = drizzle({ client: pool, schema });
    
    // Testar conexão
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection initialized successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Inicializar conexão
initializeDatabase();

export { pool, db };
