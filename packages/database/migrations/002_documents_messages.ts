import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE doc_category AS ENUM ('invoice','tax_filing','payroll','bank_statement','report','contract','other');
    CREATE TYPE message_status AS ENUM ('unread','read','archived');
    CREATE TYPE message_priority AS ENUM ('normal','high','urgent');
    CREATE TYPE portal_type AS ENUM ('payroll','payment','tax','banking','custom');
  `);

  await knex.schema.createTable('documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('entity_id').notNullable().references('id').inTable('entities').onDelete('CASCADE');
    t.uuid('uploaded_by').notNullable().references('id').inTable('users');
    t.specificType('category', 'doc_category').defaultTo('other');
    t.string('name', 500).notNullable();
    t.string('mime_type', 200);
    t.bigInteger('size_bytes');
    t.string('box_file_id', 100).notNullable().unique();
    t.string('box_folder_id', 100).notNullable();
    t.boolean('is_archived').defaultTo(false);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('entity_id').notNullable().references('id').inTable('entities').onDelete('CASCADE');
    t.uuid('sender_id').notNullable().references('id').inTable('users');
    t.uuid('assigned_team_id').references('id').inTable('teams');
    t.string('subject', 500).notNullable();
    t.text('body').notNullable();
    t.specificType('status', 'message_status').defaultTo('unread');
    t.specificType('priority', 'message_priority').defaultTo('normal');
    t.boolean('is_archived').defaultTo(false);
    t.string('email_message_id', 500);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('message_replies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.uuid('sender_id').notNullable().references('id').inTable('users');
    t.text('body').notNullable();
    t.boolean('is_from_team').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('portal_redirects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('entity_id').notNullable().references('id').inTable('entities').onDelete('CASCADE');
    t.specificType('portal_type', 'portal_type').notNullable();
    t.string('label', 200).notNullable();
    t.text('target_url').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.integer('version').defaultTo(1);
    t.uuid('updated_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.raw('CREATE INDEX idx_docs_entity ON documents(entity_id)');
  await knex.raw('CREATE INDEX idx_msgs_entity ON messages(entity_id)');
  await knex.raw('CREATE INDEX idx_msgs_status ON messages(entity_id, status)');
  await knex.raw('CREATE INDEX idx_redirects_entity ON portal_redirects(entity_id, portal_type, is_active)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('portal_redirects');
  await knex.schema.dropTableIfExists('message_replies');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('documents');
  await knex.raw('DROP TYPE IF EXISTS portal_type, message_priority, message_status, doc_category');
}
