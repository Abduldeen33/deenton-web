import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Armchair, ClipboardList, UtensilsCrossed, CreditCard, ChartNoAxesCombined, Settings, Search, ArrowLeft, LogOut, UserRound } from 'lucide-react';
import { clearAuth, getUser } from '../store/auth';
import { can, canSellPos } from '../store/permissions';
import './restaurant-pos.css';
import './restaurant-pos-dark.css';

export default function RestaurantPosShell({ children, active, onNavigate, search, onSearch, busy = false, hasDraft = false }: { children: ReactNode; active: string; onNavigate: (section: string) => void; search: string; onSearch: (value: string) => void; busy?: boolean; hasDraft?: boolean }) {
  const user = getUser(), navigate = useNavigate();
  function logout() {
    if (busy) return;
    if (hasDraft && !window.confirm('Log out and discard this unsent cart? Orders already saved in the device outbox will remain for this account to sync later.')) return;
    clearAuth();
    navigate('/login', { replace: true });
  }
  const destinations = [{ label: 'Register', icon: UtensilsCrossed, id: 'menu' }, { label: 'Tables', icon: Armchair, id: 'tables' }, { label: 'Billing', icon: CreditCard, id: 'billing' }, { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' }, { label: 'Reports', icon: ChartNoAxesCombined, id: 'reports' }, { label: 'Settings', icon: Settings, id: 'settings' }];
  return <div className="restaurant-pos rp-dark">
    <div className="rp-main"><header className="rp-topbar">
      <button type="button" className="rp-logout" disabled={busy} onClick={logout}><LogOut size={19}/>Log out</button>
      <div className="rp-register-identity"><strong>{user?.firstName} {user?.lastName}</strong><UserRound size={16}/><small>{user?.propertyName || 'Anzak POS'} · {(user?.accessLevel || user?.role || '').replaceAll('_', ' ')}</small></div>
      <label className="rp-global-search"><Search size={19}/><input aria-label="Search restaurant menu and tables" placeholder="Search menu or tables…" value={search} onChange={e => onSearch(e.target.value)}/></label>
      {['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(user?.role || '') && <Link to="/reservations" className="rp-reservations-back"><ArrowLeft size={16}/><span>Back to Reservations</span></Link>}
    </header>
    <main className="rp-content">{!canSellPos() && <p role="status" className="mb-3 rounded border border-amber-200 bg-amber-50 p-3">View-only staff access. Your supervisor or manager can take orders and record payments.</p>}{children}</main></div>
    <nav className="rp-register-nav" aria-label="Restaurant navigation">{destinations.map(({label,icon:Icon,id}) => <div key={id}>{id === 'billing' && can('view_pos_queue') && <Link className="rp-nav-item" to="/pos-queues"><ClipboardList size={21}/>Orders</Link>}<button type="button" aria-current={active === id ? 'page' : undefined} className={'rp-nav-item ' + (active === id ? 'is-active' : '')} onClick={() => onNavigate(id)}><Icon size={21}/>{label}</button></div>)}</nav>
  </div>;
}
