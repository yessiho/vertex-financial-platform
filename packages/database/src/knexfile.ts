import 'dotenv/config';
import type { Knex } from 'knex';
import path from 'path';

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
  migrations: {
    directory: path.join(__dirname, '../migrations'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: path.join(__dirname, '../seeds'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
};

export default config;
