import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Check if org already exists - don't wipe existing data
  const existingOrg = await knex('organizations').first();
  if (existingOrg) {
    console.log('Data already exists, skipping destructive seed');
    console.log('   Use db:reset to fully reset');
    return;
  }

  // Create org
  const [org] = await knex('organizations').insert({
    name: 'Vertex Demo Firm',
    slug: 'vertex-demo',
    is_active: true,
  }).returning('*');

  // Create entities
  const [entity1] = await knex('entities').insert({
    organization_id: org.id,
    name: 'Demo LLC',
    type: 'llc',
    status: 'active',
  }).returning('*');

  const [entity2] = await knex('entities').insert({
    organization_id: org.id,
    name: 'Acme Corporation',
    type: 'corporation',
    status: 'active',
    tax_id: '12-3456789',
  }).returning('*');

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

  // Grant access to both entities
  await knex('user_entity_access').insert([
    { user_id: user.id, entity_id: entity1.id, is_primary: true },
    { user_id: user.id, entity_id: entity2.id, is_primary: false },
  ]);

  // Create a demo team
  const [team] = await knex('teams').insert({
    organization_id: org.id,
    name: 'Tax & Accounting Team',
    email: 'team@vertexfinancial.com',
    member_user_ids: JSON.stringify([]),
  }).returning('*');

  // Assign team to entity1
  await knex('entity_team_assignments').insert({
    entity_id: entity1.id,
    team_id: team.id,
    is_active: true,
  });

  // Create sample document
  await knex('documents').insert({
    entity_id: entity1.id,
    uploaded_by: user.id,
    category: 'invoice',
    name: 'January-2026-Invoice.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    box_file_id: 'demo_file_001',
    box_folder_id: 'demo_folder_001',
    is_archived: false,
  });

  // Create sample message
  await knex('messages').insert({
    entity_id: entity1.id,
    sender_id: user.id,
    subject: 'Welcome to Vertex Demo',
    body: 'This is a demo message to show the messaging feature.',
    status: 'unread',
    priority: 'normal',
  });

  // Create ADP payroll redirect
  await knex('portal_redirects').insert({
    entity_id: entity1.id,
    portal_type: 'payroll',
    label: 'ADP Payroll',
    target_url: 'https://workforcenow.adp.com',
    is_active: true,
    version: 1,
    updated_by: user.id,
  });

  console.log('Seed complete');
  console.log('   Email:    admin@vertex.local');
  console.log('   Password: Admin1234!');
}
