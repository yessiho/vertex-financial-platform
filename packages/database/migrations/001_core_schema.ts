import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw(`
    CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'accountant', 'client');
    CREATE TYPE entity_type AS ENUM ('llc', 'corporation', 'sole_proprietor', 'partnership', 'trust');
    CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'suspended');
  `);

  await knex.schema.createTable('organizations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.string('slug', 100).notNullable().unique();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('entities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name', 200).notNullable();
    t.specificType('type', 'entity_type').notNullable();
    t.specificType('status', 'entity_status').defaultTo('active');
    t.string('tax_id', 50);
    t.string('box_root_folder_id', 100);
    t.string('box_documents_folder_id', 100);
    t.string('box_reports_folder_id', 100);
    t.string('box_tax_folder_id', 100);
    t.string('box_payroll_folder_id', 100);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('email', 254).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.specificType('role', 'user_role').defaultTo('client');
    t.boolean('mfa_enabled').defaultTo(false);
    t.string('mfa_secret', 255);
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_login_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('user_entity_access', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('entity_id').notNullable().references('id').inTable('entities').onDelete('CASCADE');
    t.boolean('is_primary').defaultTo(false);
    t.timestamp('granted_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'entity_id']);
  });

  await knex.schema.createTable('teams', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.string('email', 254).notNullable();
    t.jsonb('member_user_ids').defaultTo('[]');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('entity_team_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('entity_id').notNullable().references('id').inTable('entities').onDelete('CASCADE');
    t.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
    t.unique(['entity_id', 'team_id']);
  });

  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.boolean('is_revoked').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.bigIncrements('id');
    t.uuid('organization_id');
    t.uuid('entity_id');
    t.uuid('user_id');
    t.string('action', 100).notNullable();
    t.string('resource_type', 100);
    t.uuid('resource_id');
    t.jsonb('before').defaultTo('{}');
    t.jsonb('after').defaultTo('{}');
    t.string('ip_address', 45);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_entities_org ON entities(organization_id)');
  await knex.raw('CREATE INDEX idx_users_org ON users(organization_id)');
  await knex.raw('CREATE INDEX idx_audit_entity ON audit_logs(entity_id)');
  await knex.raw('CREATE INDEX idx_audit_created ON audit_logs(created_at DESC)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('entity_team_assignments');
  await knex.schema.dropTableIfExists('teams');
  await knex.schema.dropTableIfExists('user_entity_access');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('entities');
  await knex.schema.dropTableIfExists('organizations');
  await knex.raw('DROP TYPE IF EXISTS entity_status, entity_type, user_role');
}
