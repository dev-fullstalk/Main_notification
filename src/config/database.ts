import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .ENV file explicitly from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.ENV'), quiet: true });

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5433');
const database = process.env.DB_NAME || 'terax_database';
const user = process.env.DB_USER || 'admin';
const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'Cpi2026!';

export const pool = new Pool({
  host,
  port,
  database,
  user,
  password,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  options: '-c search_path=notification', // Set schema automatically
});

// Helper for executing queries
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Test connection on load (only once globally to avoid console noise)
declare global {
  var __pgPoolTested: boolean | undefined;
}

if (!globalThis.__pgPoolTested) {
  globalThis.__pgPoolTested = true;
  pool.connect()
    .then((client) => {
      client.release();
    })
    .catch((err) => {
      console.warn(
        `[Database] Connection failed: host=${host}, port=${port}, user=${user}. ` +
        `Ensure PostgreSQL is running. Error: ${err.message}`
      );
    });
}
