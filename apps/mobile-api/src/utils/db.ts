import 'dotenv/config';
import knex from 'knex';
import path from 'path';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});
