import { query } from '../config/database';
import { DbUser } from '../types/db.types';

export const userRepo = {
  async getById(id: string | number): Promise<DbUser | null> {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  }
};
