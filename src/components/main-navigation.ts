import { can, type Permission } from '../store/permissions';

export type MainNavEntry = { path: string; label: string; icon: string; permission?: Permission; executive?: boolean; children?: MainNavEntry[] };
export type MainNavGroup = { label: string; entries: MainNavEntry[] };
const entry = (path: string, label: string, icon: string, permission: Permission): MainNavEntry => ({ path, label, icon, permission });
export const mainNavigation: MainNavGroup[] = [
  { label: 'Dashboard', entries: [entry('/dashboard', 'Hotel Dashboard', 'LayoutDashboard', 'view_dashboard')] },
  { label: 'Front Desk', entries: [
    entry('/rooms', 'Room View', 'BedDouble', 'view_rooms'),
    entry('/reservations', 'Reservations', 'CalendarDays', 'view_reservations'),
    entry('/guests', 'Guests', 'User', 'view_guests'),
    entry('/service-payments', 'Front Desk payments', 'Wallet', 'view_service_payments'),
    { ...entry('/rates', 'Rates & Availability', 'Tag', 'view_rates'), children: [
      entry('/rates', 'Rates', 'DollarSign', 'view_rates'),
      entry('/rates?view=packages', 'Packages & Promotions', 'Package', 'view_rates'),
      entry('/rates?view=threshold', 'Rate Threshold', 'ShieldCheck', 'view_rates'),
    ] },
  ] },
  { label: 'Housekeeping & Maintenance', entries: [entry('/housekeeping', 'Housekeeping', 'Sparkles', 'view_housekeeping'), entry('/maintenance', 'Maintenance', 'Wrench', 'view_maintenance')] },
  { label: 'Restaurant & POS', entries: [entry('/pos', 'Restaurant POS', 'UtensilsCrossed', 'use_pos'), entry('/pos-queues', 'Order queues', 'ClipboardList', 'view_pos_queue')] },
  { label: 'Finance & Accounting', entries: [
    entry('/finance', 'Finance', 'Wallet', 'view_finance'), entry('/billing', 'Billing', 'CreditCard', 'view_billing'),
    entry('/front-desk-cash', 'Cash & House Accounts', 'Landmark', 'view_billing'),
    entry('/front-desk-cash?tab=corporate', 'Corporate / Conference', 'Building2', 'view_billing'),
    entry('/expenses', 'Expenses', 'Receipt', 'view_expenses'), entry('/night-audit', 'Night Audit', 'Moon', 'view_night_audit'),
  ] },
  { label: 'Inventory', entries: [entry('/inventory', 'Inventory', 'Package', 'view_inventory')] },
  { label: 'Human Resources', entries: [entry('/hr', 'HR & Payroll', 'Users', 'view_hr'), entry('/staff', 'Staff', 'Users', 'view_staff'), entry('/my-payslips', 'My payslips', 'Receipt', 'view_my_payslips')] },
  { label: 'Reports', entries: [entry('/reports', 'Reports', 'BarChart3', 'view_reports'), entry('/sales-reports', 'Sales Reports', 'LineChart', 'view_reports'), entry('/revenue-management', 'Predictive Analytics', 'TrendingUp', 'view_reports')] },
  { label: 'Marketing & Tools', entries: [entry('/marketing', 'Automated Marketing', 'Mail', 'view_marketing'), entry('/channel-manager', 'Channels', 'Globe', 'view_channels'), entry('/loyalty', 'Loyalty', 'Star', 'view_guests'), entry('/ai-assistant', 'AI Assistant', 'Sparkles', 'view_reports')] },
  { label: 'Administration', entries: [{ path: '/super-admin', label: 'All hotels', icon: 'Globe', executive: true }, entry('/audit-logs', 'Audit Logs', 'ShieldCheck', 'view_audit_logs')] },
];

export function authorizedNavigation(role: string) {
  const allowed = (item: MainNavEntry): boolean => item.executive ? ['SUPER_ADMIN', 'CEO'].includes(role) : !!item.permission && can(item.permission);
  return mainNavigation.map(group => ({ ...group, entries: group.entries.filter(allowed).map(item => ({ ...item,
    label: item.path === '/pos-queues' && role === 'ACCOUNTS' ? 'POS payments' : item.label,
    ...(item.children ? { children: item.children.filter(allowed) } : {}),
  })) })).filter(group => group.entries.length > 0);
}

export function mainNavSelected(path: string, pathname: string, search: string) {
  const [target, query = ''] = path.split('?');
  if (target !== pathname.replace(/\/$/, '')) return false;
  const params = new URLSearchParams(search), link = new URLSearchParams(query);
  if (target === '/rates') {
    const view = params.get('view');
    return (['packages', 'threshold'].includes(view || '') ? view : 'rates') === (link.get('view') || 'rates');
  }
  if (target === '/front-desk-cash') {
    const corporate = params.get('tab') === 'corporate' || (!params.get('tab') && !!params.get('account'));
    return corporate === (link.get('tab') === 'corporate');
  }
  return true;
}
