import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Armchair, ClipboardList, UtensilsCrossed, CreditCard, ChartNoAxesCombined, Settings, Search, ArrowLeft, LogOut, ChefHat, Tags, SlidersHorizontal, QrCode, Menu, X, ChevronDown, PanelLeftClose, PanelLeftOpen, Wine, ReceiptText, Undo2, Wallet, Package, Users, ShieldCheck, type LucideIcon } from 'lucide-react';
import { clearAuth, getUser } from '../store/auth';
import { can, canOperate, canSellPos } from '../store/permissions';
import './restaurant-pos.css';
import './restaurant-pos-light.css';
import './restaurant-pos-navigation.css';

type Entry = { label: string; id: string; icon: LucideIcon; href?: string };
type Group = { id: string; label: string; items: Entry[] };
export default function RestaurantPosShell({ children, active, onNavigate, search, onSearch, busy = false, hasDraft = false }: { children: ReactNode; active: string; onNavigate: (section: string) => void; search: string; onSearch: (value: string) => void; busy?: boolean; hasDraft?: boolean }) {
  const user = getUser(), navigate = useNavigate();
  const kitchen = user?.role === 'KITCHEN', bar = user?.role === 'BAR';
  const admin = ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(user?.role || '');
  const configure = admin || (['RESTAURANT', 'BAR'].includes(user?.role || '') && user?.accessLevel === 'MANAGER');
  const [navOpen, setNavOpen] = useState(false), [collapsed, setCollapsed] = useState(false);
  const [navSearch, setNavSearch] = useState(''), [closedGroups, setClosedGroups] = useState<string[]>([]);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    Array.from(sidebar.current?.querySelectorAll<HTMLElement>('button,input') || []).find(e=>e.getClientRects().length)?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { setNavOpen(false); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href],summary') || []).filter(e => e.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    const resize = () => { if (window.innerWidth > 700) setNavOpen(false); };
    window.addEventListener('keydown', key); window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', key); window.removeEventListener('resize', resize); previous?.focus(); };
  }, [navOpen]);
  function leave(path: string) {
    if (busy || (hasDraft && !window.confirm('Leave this unsent cart? Orders saved in the device outbox remain for this account.'))) return;
    setNavOpen(false); navigate(path);
  }
  function logout() {
    if (busy || (hasDraft && !window.confirm('Log out and discard this unsent cart? Saved offline orders remain for this account to sync later.'))) return;
    clearAuth(); navigate('/login', { replace: true });
  }
  const item = (label: string, id: string, icon: LucideIcon, href?: string): Entry => ({label,id,icon,href});
  const groups: Group[] = kitchen ? [
    {id:'overview',label:'Overview',items:[item('Dashboard','dashboard',LayoutDashboard)]},
    {id:'menu',label:'Menu management',items:[item('Menu items','menu',UtensilsCrossed)]},
    {id:'preparation',label:'Kitchen operations',items:[item('Preparation tickets','tickets',ClipboardList)]},
  ] : [
    {id:'overview',label:'Overview',items:[item('Dashboard','dashboard',LayoutDashboard),...(admin?[item('Sales & staff reports','reports',ChartNoAxesCombined)]:[])]},
    {id:'operations',label:'Restaurant operations',items:[item('POS Register','menu',UtensilsCrossed),item('Table Management','tables',Armchair),...(can('view_pos_queue')?[item('Active Orders','orders',ClipboardList,'/pos-queues')]:[]),item("Today's orders & receipts",'history',ReceiptText)]},
    {id:'menu',label:'Menu management',items:[item('Categories','categories',Tags),...(configure?[item('Menu, modifiers & recipes','modifiers',SlidersHorizontal)]:[]),...(admin?[item('QR Digital Menu','qr',QrCode)]:[])]},
    {id:'preparation',label:'Kitchen & bar',items:can('view_pos_queue')?[...(!bar?[item('Kitchen Display','kitchen',ChefHat,'/pos-queues?station=KITCHEN')]:[]),item('Bar Orders','bar',Wine,'/pos-queues?station=BAR')]:[]},
    {id:'payments',label:'Payments & cashier',items:[...(canSellPos()?[item('Payments & split bills','billing',CreditCard),item('Cashier shifts & reconciliation','shifts',Wallet)]:[]),...(canOperate()?[item('Refunds & voids','refunds',Undo2)]:[])]},
  ];
  if (can('view_inventory')) groups.push({id:'inventory',label:'Inventory & food cost',items:[item(kitchen?'Kitchen inventory':'Ingredients & stock','inventory',Package,'/inventory')]});
  groups.push({id:'management',label:'Staff & management',items:[...(can('view_staff')?[item('Staff accounts','staff',Users,'/staff')]:[]),...(can('view_audit_logs')?[item('Audit Logs','audit',ShieldCheck,'/audit-logs')]:[]),...(configure?[item('POS Settings','settings',Settings)]:[]),item('My payslips','payslips',ReceiptText,'/my-payslips')]});
  const query = navSearch.trim().toLowerCase();
  const shown = groups.map(group => ({...group,items:group.items.filter(entry => !query || (group.label+' '+entry.label).toLowerCase().includes(query))})).filter(g=>g.items.length);
  const go = (entry: Entry) => { if (busy) return; if (entry.href) leave(entry.href); else { onNavigate(entry.id); setNavOpen(false); } };
  return <div className={'restaurant-pos rp-light '+(collapsed?'rp-nav-collapsed':'')}>
    {navOpen && <button className="rp-nav-backdrop" aria-label="Dismiss restaurant navigation" onClick={()=>setNavOpen(false)}/>}
    <aside id="restaurant-navigation" ref={sidebar} aria-label="Restaurant workspace navigation" role={navOpen?'dialog':undefined} aria-modal={navOpen||undefined} className={'rp-sidebar ' + (navOpen?'is-open':'')}>
      <div className="rp-brand"><ChefHat size={27}/><span>Anzak <b>POS</b></span><button className="rp-collapse-toggle" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} title={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>
      <button className="rp-drawer-close" onClick={()=>setNavOpen(false)}><X size={18}/>Close navigation</button>
      <label className="rp-sidebar-search"><Search size={15}/><input aria-label="Search POS navigation" placeholder="Find a feature…" value={navSearch} onChange={e=>setNavSearch(e.target.value)}/></label>
      <nav aria-label="Restaurant navigation">
        {!shown.length && <p className="rp-nav-empty" role="status">No matching features for your account.</p>}
        {shown.map(group=>{const expanded=collapsed||!!query||!closedGroups.includes(group.id);return <section key={group.id} className="rp-nav-section">
          <button type="button" className="rp-section-toggle" title={group.label} aria-expanded={expanded} aria-controls={'pos-nav-'+group.id} onClick={()=>setClosedGroups(v=>v.includes(group.id)?v.filter(id=>id!==group.id):[...v,group.id])}><span>{group.label}</span><ChevronDown size={14} className={expanded?'':'is-closed'}/></button>
          <div id={'pos-nav-'+group.id} hidden={!expanded && !collapsed}>{group.items.map(entry=><button type="button" key={entry.id} title={entry.label} aria-label={entry.label} disabled={busy} aria-current={active===entry.id?'page':undefined} className={'rp-nav-item '+(active===entry.id?'is-active':'')} onClick={()=>go(entry)}><entry.icon size={18}/><span>{entry.label}</span></button>)}</div>
        </section>})}
        {admin && !query && <details className="rp-planned"><summary>Planned modules · not available</summary><p>Waitlists, delivery tracking, promotions/coupons, purchasing and printer-device management require further implementation. They are not enabled here.</p></details>}
      </nav>
      <div className="rp-sidebar-footer">{can('view_reservations') && <button disabled={busy} onClick={()=>leave('/reservations')} title="Back to Reservations" className="rp-reservations-back"><ArrowLeft size={16}/><span>Back to Reservations</span></button>}<button type="button" className="rp-logout" title="Log out" disabled={busy} onClick={logout}><LogOut size={17}/><span>Log out</span></button><small>{user?.firstName} {user?.lastName}<br/>{(user?.role||'').replaceAll('_',' ')} · {(user?.accessLevel||'').replaceAll('_',' ')}</small></div>
    </aside>
    <div className="rp-main"><header className="rp-topbar">
      <button className="rp-mobile-toggle" aria-label={navOpen?'Close restaurant navigation':'Open restaurant navigation'} aria-controls="restaurant-navigation" aria-expanded={navOpen} onClick={()=>setNavOpen(v=>!v)}>{navOpen?<X size={22}/>:<Menu size={22}/>}</button>
      <div className="rp-page-title"><h1>{user?.propertyName||'Restaurant'} {kitchen?'· Kitchen Display':active==='dashboard'?'Dashboard':'POS'}</h1><p>{kitchen?'Food preparation, live tickets, and menus.':'Operations, orders, and metrics.'}</p></div>
             <div id="anzak-pos-queue-slot" className="anzak-queue-slot" aria-label="Order and print alerts" />
<div className="rp-user"><span className="rp-avatar">{user?.firstName?.[0]||'A'}{user?.lastName?.[0]||''}</span><span><strong>{user?.firstName} {user?.lastName}</strong><small>{(user?.accessLevel||user?.role||'').replaceAll('_',' ')}</small></span><span className="rp-app-badge">{kitchen?'KDS':'R-POS'}</span></div>
    </header><main className="rp-content">{kitchen && <label className="rp-ticket-search"><Search size={16}/><input aria-label="Search Kitchen tickets" placeholder="Search guest, table or dish…" value={search} onChange={e=>onSearch(e.target.value)}/></label>}{kitchen && can('view_inventory') && <div className="mb-3 flex justify-end"><button type="button" disabled={busy} onClick={()=>leave('/inventory?new=item')} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add inventory</button></div>}{!kitchen&&!canSellPos()&&<p role="status" className="mb-3 rounded border border-amber-200 bg-amber-50 p-3">View-only staff access. Your supervisor or manager can take orders and record payments.</p>}{children}</main></div>
  </div>;
}
