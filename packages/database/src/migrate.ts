import 'dotenv/config';
import knex from 'knex';
import config from './knexfile';

const db = knex(config);

const command = process.argv[2] || 'latest';

async function run() {
  try {
    if (command === 'latest') {
      const [batch, list] = await db.migrate.latest();
      if (list.length === 0) {
        console.log('✅ Already up to date');
      } else {
        console.log(`✅ Batch ${batch} migrations run:`);
        list.forEach((m: string) => console.log('  -', m));
      }
    } else if (command === 'rollback') {
      const [batch, list] = await db.migrate.rollback();
      console.log(`✅ Batch ${batch} rolled back:`, list);
    } else if (command === 'seed') {
      await db.seed.run();
      console.log('✅ Seeds completed');
    }
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

run();
