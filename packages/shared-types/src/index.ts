export type UserRole = 'superadmin' | 'admin' | 'accountant' | 'client';
export type EntityType = 'llc' | 'corporation' | 'sole_proprietor' | 'partnership' | 'trust';
export type EntityStatus = 'active' | 'inactive' | 'suspended';
export type DocumentCategory = 'invoice' | 'tax_filing' | 'payroll' | 'bank_statement' | 'report' | 'contract' | 'other';
export type MessageStatus = 'unread' | 'read' | 'archived';
export type MessagePriority = 'normal' | 'high' | 'urgent';
export type PortalType = 'payroll' | 'payment' | 'tax' | 'banking' | 'custom';

export interface Organization {
  id: string; name: string; slug: string;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface Entity {
  id: string; organization_id: string; name: string;
  type: EntityType; status: EntityStatus; tax_id?: string;
  box_root_folder_id?: string; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}
export interface User {
  id: string; organization_id: string; email: string;
  first_name: string; last_name: string; role: UserRole;
  mfa_enabled: boolean; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface JwtPayload {
  sub: string; org_id: string; entity_id: string;
  role: UserRole; mfa_verified: boolean; iat: number; exp: number;
}
