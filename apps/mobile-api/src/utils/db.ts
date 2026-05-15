import 'dotenv/config';
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  },
  pool: { min: 2, max: 10 },
});
