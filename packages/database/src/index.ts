import 'dotenv/config';
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});

/**
 * Set the active entity context for Row Level Security.
 * Must be called inside a transaction before any entity-scoped query.
 */
export async function setEntityContext(
  trx: knex.Knex.Transaction,
  entityId: string,
  orgId: string
) {
  await trx.raw(`SET LOCAL app.current_entity_id = '${entityId}'`);
  await trx.raw(`SET LOCAL app.current_org_id = '${orgId}'`);
}

export { knex };
