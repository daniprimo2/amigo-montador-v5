import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

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
    return `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  throw new Error(
    "Configuração do banco de dados não encontrada. Defina DATABASE_URL ou as variáveis PGHOST, PGUSER, PGPASSWORD, PGDATABASE."
  );
};

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle({ client: pool, schema });
