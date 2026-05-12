import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Clean in order
  await knex('user_entity_access').del();
  await knex('message_replies').del();
  await knex('messages').del();
  await knex('documents').del();
  await knex('audit_logs').del();
  await knex('entity_team_assignments').del();
  await knex('teams').del();
  await knex('users').del();
  await knex('entities').del();
  await knex('organizations').del();

  // Create org
  const [org] = await knex('organizations').insert({
    name: 'Vertex Demo Firm',
    slug: 'vertex-demo',
    is_active: true,
  }).returning('*');

  // Create entity
  const [entity] = await knex('entities').insert({
    organization_id: org.id,
    name: 'Demo LLC',
    type: 'llc',
    status: 'active',
  }).returning('*');

  // Create team(s) for the entity (messages controller assigns one, if any exist)
  const [team] = await knex('teams').insert({
    organization_id: org.id,
    name: 'Core Team',
    email: 'core@vertex.local',
    member_user_ids: '[]',
  }).returning('*');

  await knex('entity_team_assignments').insert({
    entity_id: entity.id,
    team_id: team.id,
    is_active: true,
  });

  // Create superadmin user (password: Admin1234!)
  const hash = await bcrypt.hash('Admin1234!', 12);
  const [user] = await knex('users').insert({
    organization_id: org.id,
    email: 'admin@vertex.local',
    password_hash: hash,
    first_name: 'Admin',
    last_name: 'User',
    role: 'superadmin',
    mfa_enabled: false,
    is_active: true,
  }).returning('*');

  // Grant access
  await knex('user_entity_access').insert({
    user_id: user.id,
    entity_id: entity.id,
    is_primary: true,
  });

  // Seed one document
  await knex('documents').insert({
    entity_id: entity.id,
    uploaded_by: user.id,
    category: 'invoice',
    name: 'January-2026-Invoice.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    box_file_id: `pending_doc_seed_${Date.now()}`,
    box_folder_id: 'pending',
    is_archived: false,
    metadata: JSON.stringify({ seeded: true }),
  });

  // Seed one message (unarchived)
  const [message] = await knex('messages').insert({
    entity_id: entity.id,
    sender_id: user.id,
    assigned_team_id: team.id,
    subject: 'Welcome to Vertex Demo',
    body: 'This is a seeded message so the UI has data to render.',
    priority: 'normal',
    status: 'unread',
    is_archived: false,
    email_message_id: `seed_msg_${Date.now()}`,
  }).returning('*');

  // Seed one reply so message thread view has content
  await knex('message_replies').insert({
    message_id: message.id,
    sender_id: user.id,
    body: 'Reply seeded successfully.',
    is_from_team: true,
    created_at: knex.fn.now(),
  });

  console.log('✅ Seed complete');
  console.log('   Email:    admin@vertex.local');
  console.log('   Password: Admin1234!');
}
