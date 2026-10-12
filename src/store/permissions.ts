import { getUser } from './auth';
export function canSellPos(): boolean {
  const user = getUser();
  return !!user && (['RESTAURANT', 'BAR'].includes(user.role) || canOperate());
}
export const departmentRoles = ['FRONT_DESK', 'RESTAURANT', 'KITCHEN', 'BAR', 'HOUSEKEEPING', 'MAINTENANCE', 'IT', 'ACCOUNTS'];
export function canOperate(): boolean {
  const user = getUser();
  return !!user && (!departmentRoles.includes(user.role) || ['SUPERVISOR', 'ASSISTANT_MANAGER', 'MANAGER'].includes(user.accessLevel || 'STAFF'));
}
const writePermissions = ['block_rooms', 'update_housekeeping', 'create_reservations', 'checkin_checkout', 'post_charges', 'record_payments', 'manage_staff', 'manage_rates', 'manage_expenses', 'night_audit', 'manage_maintenance'];

export type Permission =
  | 'view_inventory'
  | 'view_housekeeping'
  | 'view_night_audit'
  | 'view_marketing'
  | 'view_channels'
  | 'view_dashboard'
  | 'view_rooms'
  | 'block_rooms'
  | 'update_housekeeping'
  | 'view_reservations'
  | 'create_reservations'
  | 'checkin_checkout'
  | 'view_billing'
  | 'post_charges'
  | 'record_payments'
  | 'view_guests'
  | 'view_staff'
  | 'manage_staff'
  | 'view_rates'
  | 'manage_rates'
  | 'view_expenses'
  | 'manage_expenses'
  | 'night_audit'
  | 'view_reports'
  | 'view_maintenance'
  | 'manage_maintenance'
  | 'view_audit_logs'
  | 'use_pos'
  | 'view_pos_queue';

const rolePermissions: Record<string, Permission[]> = {
  GENERAL_MANAGER: ['view_inventory'],
  PURCHASE_MANAGER: ['view_inventory'],
  ADMIN: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'update_housekeeping',
    'view_reservations', 'create_reservations', 'checkin_checkout',
    'view_billing', 'post_charges', 'record_payments',
    'view_guests', 'view_staff', 'manage_staff',
    'view_rates', 'manage_rates', 'view_expenses', 'manage_expenses',
    'night_audit', 'view_reports', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs', 'use_pos', 'view_pos_queue',
  ],
  SUPER_ADMIN: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'update_housekeeping',
    'view_reservations', 'create_reservations', 'checkin_checkout',
    'view_billing', 'post_charges', 'record_payments',
    'view_guests', 'view_staff', 'manage_staff',
    'view_rates', 'manage_rates', 'view_expenses', 'manage_expenses',
    'night_audit', 'view_reports', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs', 'use_pos', 'view_pos_queue',
  ],
  FRONT_DESK: [
    'view_dashboard', 'view_rooms', 'view_reservations', 'create_reservations',
    'checkin_checkout', 'view_billing', 'post_charges', 'record_payments',
    'view_guests', 'view_pos_queue',
  ],
  HOUSEKEEPING: [
    'view_dashboard', 'view_rooms', 'update_housekeeping',
  ],
  MAINTENANCE: [
    'view_dashboard', 'view_rooms', 'view_maintenance', 'manage_maintenance',
  ],
  ACCOUNTS: [
    'record_payments', 'view_pos_queue',
    'view_dashboard', 'view_billing', 'view_expenses', 'manage_expenses',
    'view_reports', 'view_guests',
  ],
  RESTAURANT: [
    'view_dashboard', 'use_pos', 'view_pos_queue',
  ],
  KITCHEN: ['view_pos_queue'],
  BAR: ['use_pos', 'view_pos_queue'],
  IT: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'view_reservations',
    'view_guests', 'view_staff', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs',
  ],
};

export function can(permission: Permission): boolean {
  const user = getUser();
  if (!user) return false;
  if (permission === 'record_payments' && user.role === 'FRONT_DESK') return true;
  if (permission === 'create_reservations' && user.role === 'FRONT_DESK') return true;
  if (permission === 'night_audit') return ['ADMIN', 'SUPER_ADMIN', 'CEO', 'FRONT_DESK', 'ACCOUNTS'].includes(user.role);
  if (permission === 'view_pos_queue' && !canOperate()) return false;
  if (permission === 'view_night_audit') return ['ADMIN', 'SUPER_ADMIN', 'CEO', 'ACCOUNTS', 'FRONT_DESK'].includes(user.role);
  if (permission === 'view_marketing' || permission === 'view_channels') return ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(user.role);
  if (permission === 'view_housekeeping') return ['ADMIN', 'SUPER_ADMIN', 'CEO', 'HOUSEKEEPING'].includes(user.role);
  if (permission === 'view_inventory') return ['ADMIN', 'SUPER_ADMIN', 'GENERAL_MANAGER', 'PURCHASE_MANAGER', 'CEO'].includes(user.role) || (departmentRoles.includes(user.role) && ['MANAGER', 'ASSISTANT_MANAGER'].includes(user.accessLevel || 'STAFF'));
  if (!canOperate() && writePermissions.includes(permission)) return false;
  const perms = rolePermissions[user.role === 'CEO' ? 'SUPER_ADMIN' : user.role] ?? [];
  return perms.includes(permission);
}

export function canAny(...permissions: Permission[]): boolean {
  return permissions.some(p => can(p));
}
