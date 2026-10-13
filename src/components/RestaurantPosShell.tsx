import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Armchair, ClipboardList, UtensilsCrossed, CreditCard, ChartNoAxesCombined, Settings, Search, ArrowLeft, LogOut, ChefHat, Tags, SlidersHorizontal, QrCode, Menu, X } from 'lucide-react';
import { clearAuth, getUser } from '../store/auth';
import { can, canSellPos } from '../store/permissions';
import './restaurant-pos.css';
import './restaurant-pos-light.css';

export default function RestaurantPosShell({ children, active, onNavigate, search, onSearch, busy = false, hasDraft = false }: { children: ReactNode; active: string; onNavigate: (section: string) => void; search: string; onSearch: (value: string) => void; busy?: boolean; hasDraft?: boolean }) {
  const user = getUser(), navigate = useNavigate();
  const kitchen = user?.role === 'KITCHEN';
  const [navOpen, setNavOpen] = useState(false);
  const admin = ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(user?.role || '');
  const configure = admin || (['RESTAURANT', 'BAR'].includes(user?.role || '') && user?.accessLevel === 'MANAGER');
  function logout() {
    if (busy) return;
    if (hasDraft && !window.confirm('Log out and discard this unsent cart? Orders already saved in the device outbox will remain for this account to sync later.')) return;
    clearAuth(); navigate('/login', { replace: true });
  }
  function go(section: string) { onNavigate(section); setNavOpen(false); }
  const navItem = (label: string, id: string, Icon: typeof LayoutDashboard) => <button key={id} type="button" aria-current={active === id ? 'page' : undefined} className={'rp-nav-item ' + (active === id ? 'is-active' : '')} onClick={() => go(id)}><Icon size={18}/><span>{label}</span></button>;
  return <div className="restaurant-pos rp-light">
    <aside className={'rp-sidebar ' + (navOpen ? 'is-open' : '')}>
      <div className="rp-brand"><ChefHat size={27}/><span>Anzak <b>POS</b></span></div>
      <label className="rp-sidebar-search"><Search size={15}/><input aria-label={kitchen ? 'Search Kitchen tickets' : 'Search restaurant menu and tables'} placeholder={kitchen ? 'Search guest, table or dish…' : 'Search menu or tables…'} value={search} onChange={e => { onSearch(e.target.value); if (!kitchen) onNavigate('menu'); }}/></label>
      <nav aria-label="Restaurant navigation">
        {kitchen ? <>
          {navItem('Dashboard', 'dashboard', LayoutDashboard)}
          <p className="rp-nav-group">Menu management</p>
          {navItem('Menu items', 'menu', UtensilsCrossed)}
          <p className="rp-nav-group">Kitchen operations</p>
          {navItem('Preparation tickets', 'tickets', ClipboardList)}
          {can('view_inventory') && <Link className="rp-nav-item" to="/inventory"><Tags size={18}/><span>Kitchen inventory</span></Link>}
        </> : <>
        {navItem('Dashboard', 'dashboard', LayoutDashboard)}
        <p className="rp-nav-group">Menu management</p>
        {navItem('Register', 'menu', UtensilsCrossed)}
        {navItem('Categories', 'categories', Tags)}
        {configure && navItem('Add-ons & variants', 'modifiers', SlidersHorizontal)}
        {admin && navItem('QR Codes', 'qr', QrCode)}
        <p className="rp-nav-group">Operations</p>
        {navItem('Tables', 'tables', Armchair)}
        {can('view_pos_queue') && <Link className="rp-nav-item" to="/pos-queues"><ClipboardList size={18}/><span>Orders</span></Link>}
        {navItem('Billing', 'billing', CreditCard)}
        {navItem('Reports', 'reports', ChartNoAxesCombined)}
        {configure && navItem('Settings', 'settings', Settings)}
        </>}
      </nav>
      <div className="rp-sidebar-footer">{admin && <Link to="/reservations" className="rp-reservations-back"><ArrowLeft size={16}/><span>Back to Reservations</span></Link>}<button type="button" className="rp-logout" disabled={busy} onClick={logout}><LogOut size={17}/>Log out</button><small>Anzak Cloud · Restaurant POS</small></div>
    </aside>
    <div className="rp-main"><header className="rp-topbar">
      <button className="rp-mobile-toggle" aria-label={navOpen ? 'Close restaurant navigation' : 'Open restaurant navigation'} aria-expanded={navOpen} onClick={() => setNavOpen(v => !v)}>{navOpen ? <X size={22}/> : <Menu size={22}/>}</button>
      <div className="rp-page-title"><h1>{kitchen ? `${user?.propertyName || 'Restaurant'} · Kitchen Display` : `${user?.propertyName || 'Restaurant'} ${['dashboard','reports'].includes(active) ? 'Dashboard' : 'POS'}`}</h1><p>{kitchen ? 'Food preparation, live tickets, and menus.' : 'Operations, orders, and metrics.'}</p></div>
      <div className="rp-user"><span className="rp-avatar">{user?.firstName?.[0] || 'A'}{user?.lastName?.[0] || ''}</span><span><strong>{user?.firstName} {user?.lastName}</strong><small>{(user?.accessLevel || user?.role || '').replaceAll('_', ' ')}</small></span><span className="rp-app-badge">{kitchen ? 'KDS' : 'R-POS'}</span></div>
    </header><main className="rp-content">{!kitchen && !canSellPos() && <p role="status" className="mb-3 rounded border border-amber-200 bg-amber-50 p-3">View-only staff access. Your supervisor or manager can take orders and record payments.</p>}{children}</main></div>
  </div>;
}
