import { getUser } from './auth';

export type Permission =
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
  | 'view_audit_logs';

const rolePermissions: Record<string, Permission[]> = {
  ADMIN: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'update_housekeeping',
    'view_reservations', 'create_reservations', 'checkin_checkout',
    'view_billing', 'post_charges', 'record_payments',
    'view_guests', 'view_staff', 'manage_staff',
    'view_rates', 'manage_rates', 'view_expenses', 'manage_expenses',
    'night_audit', 'view_reports', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs',
  ],
  SUPER_ADMIN: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'update_housekeeping',
    'view_reservations', 'create_reservations', 'checkin_checkout',
    'view_billing', 'post_charges', 'record_payments',
    'view_guests', 'view_staff', 'manage_staff',
    'view_rates', 'manage_rates', 'view_expenses', 'manage_expenses',
    'night_audit', 'view_reports', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs',
  ],
  FRONT_DESK: [
    'view_dashboard', 'view_rooms', 'view_reservations', 'create_reservations',
    'checkin_checkout', 'view_billing', 'post_charges', 'record_payments',
    'view_guests',
  ],
  HOUSEKEEPING: [
    'view_dashboard', 'view_rooms', 'update_housekeeping',
  ],
  MAINTENANCE: [
    'view_dashboard', 'view_rooms', 'view_maintenance', 'manage_maintenance',
  ],
  ACCOUNTS: [
    'view_dashboard', 'view_billing', 'view_expenses', 'manage_expenses',
    'view_reports', 'view_guests',
  ],
  RESTAURANT: [
    'view_dashboard', 'view_reservations',
  ],
  IT: [
    'view_dashboard', 'view_rooms', 'block_rooms', 'view_reservations',
    'view_guests', 'view_staff', 'view_maintenance', 'manage_maintenance',
    'view_audit_logs',
  ],
};

export function can(permission: Permission): boolean {
  const user = getUser();
  if (!user) return false;
  const perms = rolePermissions[user.role] ?? [];
  return perms.includes(permission);
}

export function canAny(...permissions: Permission[]): boolean {
  return permissions.some(p => can(p));
}