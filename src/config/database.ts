import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .ENV file explicitly from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.ENV') });

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

// Test connection on load
pool.connect()
  .then((client) => {
    console.log('PostgreSQL connection pool established for schema: notification');
    client.release();
  })
  .catch((err) => {
    console.warn(
      `Database connection failed: host=${host}, port=${port}, user=${user}. ` +
      `Ensure PostgreSQL Docker container is running. System will use mock fallback. Error: ${err.message}`
    );
  });
