import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Wallet, Receipt, Landmark, Package, LogOut, Menu, X, Moon, UtensilsCrossed } from 'lucide-react';
import { can, canOperate, type Permission } from '../store/permissions';
import { clearAuth, getUser } from '../store/auth';
import './finance.css';

export default function FinanceShell({ children }: { children: ReactNode }) {
  const user = getUser(), navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links: { path: string; label: string; permission: Permission; icon: typeof Wallet }[] = [
    { path: '/finance', label: 'Business overview', permission: 'view_finance', icon: BarChart3 },
    { path: '/service-payments', label: 'Front Desk services', permission: 'view_service_payments', icon: Wallet },
    { path: '/billing', label: 'Guest billing & payments', permission: 'view_billing', icon: Receipt },
    { path: '/front-desk-cash', label: 'Cash & house accounts', permission: 'view_billing', icon: Landmark },
    { path: '/front-desk-cash?tab=corporate', label: 'Corporate / Conference', permission: 'view_billing', icon: Receipt },
    { path: '/expenses', label: 'Expenses', permission: 'view_expenses', icon: Wallet },
    { path: '/inventory', label: 'Inventory', permission: 'view_inventory', icon: Package },
    { path: '/reports', label: 'Hotel reports', permission: 'view_reports', icon: BarChart3 },
    { path: '/pos-queues', label: 'POS settlements', permission: 'view_pos_queue', icon: UtensilsCrossed },
    { path: '/night-audit', label: 'Night audit', permission: 'view_night_audit', icon: Moon },
  ];
  return <div className="finance-shell">
    <aside className={'finance-nav ' + (open ? 'is-open' : '')}>
      <div className="finance-brand"><span>ac</span><div>Anzak Cloud<small>FINANCE WORKSPACE</small></div></div>
      {can('record_payments') && <NavLink className="finance-create" to="/billing" onClick={() => setOpen(false)}>+ Record a payment</NavLink>}
      <p className="finance-nav-label">YOUR BUSINESS</p>
      <nav aria-label="Finance navigation">{links.filter(l => can(l.permission)).map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18}/>{label}</NavLink>)}</nav>
      <div className="finance-nav-footer"><small>{user?.role === 'DIRECTOR_OF_FINANCE' ? 'CFO / Director of Finance' : 'Accountant'}<br/>{user?.propertyName}</small><button onClick={() => { clearAuth(); navigate('/login', { replace: true }); }}><LogOut size={16}/> Log out</button></div>
    </aside>
    <div className="finance-body"><header className="finance-topbar"><button className="finance-menu" aria-label="Toggle finance navigation" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X/> : <Menu/>}</button><div><strong>{user?.propertyName || 'Hotel finance'}</strong><small>Keep your hotel finances in view</small></div><span className="finance-profile">{user?.firstName} {user?.lastName}</span></header>
      {!canOperate() && <p className="finance-notice">Junior cashier access: record guest-bill and house-account payments and print receipts. Expense entry, refunds, payment voids and inventory remain restricted. Your existing Night Audit permission is unchanged.</p>}
      <main>{children}</main>
    </div>
  </div>;
}
