import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, BedDouble, CalendarDays, ChevronDown, ClipboardList, CreditCard, DollarSign, Mail,
  Globe, LayoutDashboard, LineChart, Moon, Package, Sparkles, Star, Tag, TrendingUp, User, Users,
  Wallet, Wrench, Building2, Landmark, Receipt, ShieldCheck, UtensilsCrossed, Menu, X, PanelLeftClose,
  PanelLeftOpen, LogOut, type LucideIcon,
} from 'lucide-react';
import { clearAuth, getUser } from '../store/auth';
import { authorizedNavigation, mainNavSelected, type MainNavEntry } from './main-navigation';
import './main-sidebar.css';

const icons: Record<string, LucideIcon> = { BarChart3, BedDouble, CalendarDays, ClipboardList, CreditCard, DollarSign, Mail, Globe, LayoutDashboard, LineChart, Moon, Package, Sparkles, Star, Tag, TrendingUp, User, Users, Wallet, Wrench, Building2, Landmark, Receipt, ShieldCheck, UtensilsCrossed };
export default function Sidebar() {
  const navigate = useNavigate(), location = useLocation(), user = getUser();
  const groups = authorizedNavigation(user?.role || '');
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem('anzak-main-sidebar-compact') === 'true'; } catch { return false; } });
  const [drawerLocation, setDrawerLocation] = useState<typeof location | null>(null);
  const open = drawerLocation === location;
  const [expanded, setExpanded] = useState<Record<string, { open: boolean; location: typeof location }>>({});
  const drawer = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const selected = (path: string) => mainNavSelected(path, location.pathname, location.search);
  const itemActive = (item: MainNavEntry): boolean => item.children ? item.children.some(child => selected(child.path)) : selected(item.path);
  const isExpanded = (id: string, active: boolean, initial = false) => {
    const saved = expanded[id];
    return saved ? saved.open || (active && saved.location !== location) : active || initial;
  };
  const toggle = (id: string, current: boolean) => setExpanded(previous => ({ ...previous, [id]: { open: !current, location } }));
  const toggleCompact = () => {
    setCompact(value => { try { localStorage.setItem('anzak-main-sidebar-compact', String(!value)); } catch { /* Still usable without browser storage. */ } return !value; });
  };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null, opener = trigger.current;
    const overflow = document.body.style.overflow;
    const main = document.querySelector<HTMLElement>('.pms-main'), wasInert = main?.inert;
    if (main) main.inert = true;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLButtonElement>('.pms-drawer-close')?.focus();
    const focusable = () => Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') || []).filter(node => node.getClientRects().length > 0);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawerLocation(null); }
      if (event.key !== 'Tab') return;
      const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const containFocus = (event: FocusEvent) => { if (!drawer.current?.contains(event.target as Node)) focusable()[0]?.focus(); };
    const desktop = window.matchMedia('(min-width: 761px)');
    const resize = () => { if (desktop.matches) setDrawerLocation(null); };
    window.addEventListener('keydown', keyboard);document.addEventListener('focusin', containFocus);desktop.addEventListener('change', resize);
    return () => {
      window.removeEventListener('keydown', keyboard);document.removeEventListener('focusin', containFocus);desktop.removeEventListener('change', resize);
      document.body.style.overflow = overflow;if (main) main.inert = wasInert || false;
      if (opener?.isConnected && opener.getClientRects().length) opener.focus(); else if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  const renderLink = (item: MainNavEntry, nested = false) => {
    const Icon = icons[item.icon] || LayoutDashboard, active = selected(item.path);
    return <Link key={item.path} to={item.path} aria-label={item.label} title={compact ? item.label : undefined} aria-current={active ? 'page' : undefined}
      className={`pms-nav-link${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}`} onClick={() => setDrawerLocation(null)}>
      <Icon size={18} strokeWidth={1.7} aria-hidden="true"/><span className="pms-nav-label">{item.label}</span>
    </Link>;
  };
  return <>
    <div className="pms-mobile-bar"><button ref={trigger} type="button" aria-label="Open hotel navigation" aria-expanded={open} aria-controls="pms-navigation" onClick={() => setDrawerLocation(location)}><Menu size={21}/></button><strong>Anzak Cloud</strong><small>Hotel operations</small></div>
    {open && <button type="button" tabIndex={-1} className="pms-nav-backdrop" aria-label="Dismiss hotel navigation" onClick={() => setDrawerLocation(null)}/>}
    <aside id="pms-navigation" ref={drawer} className={`pms-sidebar${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label="Hotel navigation">
      <header className="pms-nav-brand"><span className="pms-brand-mark" aria-hidden="true">ac</span><div className="pms-nav-label"><strong>Anzak Cloud</strong><small>HOTEL OPERATIONS</small></div>
        <button type="button" className="pms-drawer-close" aria-label="Close hotel navigation" onClick={() => setDrawerLocation(null)}><X size={19}/></button>
      </header>
      <button type="button" className="pms-collapse" aria-label={compact ? 'Expand hotel sidebar' : 'Collapse hotel sidebar'} title={compact ? 'Expand hotel sidebar' : undefined} onClick={toggleCompact}>
        {compact ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}<span className="pms-nav-label">Collapse navigation</span>
      </button>
      <nav className="pms-nav-scroll" aria-label="Hotel departments">{groups.map((group, index) => {
        const active = group.entries.some(itemActive), id = `pms-group-${index}`, show = isExpanded(group.label, active, ['Dashboard', 'Front Desk'].includes(group.label));
        return <section className={`pms-nav-group${active ? ' has-active' : ''}${show ? ' is-expanded' : ''}`} key={group.label}>
          <button type="button" className="pms-group-toggle" aria-expanded={show} aria-controls={id} onClick={() => toggle(group.label, show)}><span>{group.label}</span><ChevronDown size={13} aria-hidden="true"/></button>
          <div className="pms-group-links" id={id}>{group.entries.map(item => {
            if (!item.children) return renderLink(item);
            const childOpen = isExpanded(item.label, itemActive(item)), Icon = icons[item.icon];
            return <div className={`pms-nav-submenu${childOpen ? ' is-expanded' : ''}`} key={item.path}>
              <button type="button" className={`pms-submenu-toggle${itemActive(item) ? ' has-active' : ''}`} aria-expanded={childOpen} aria-controls="pms-rate-links" onClick={() => toggle(item.label, childOpen)}><Icon size={18} strokeWidth={1.7} aria-hidden="true"/><span>{item.label}</span><ChevronDown size={13} aria-hidden="true"/></button>
              <div className="pms-submenu-links" id="pms-rate-links">{item.children.map(child => renderLink(child, true))}</div>
            </div>;
          })}</div>
        </section>;
      })}</nav>
      <footer className="pms-nav-footer"><div className="pms-nav-person"><span className="pms-user-avatar" aria-hidden="true">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><div className="pms-nav-label"><strong>{user?.firstName} {user?.lastName}</strong><small>{user?.role?.replaceAll('_', ' ')}</small></div></div>
        <button type="button" aria-label="Logout" title={compact ? 'Logout' : undefined} onClick={() => { clearAuth();navigate('/login'); }}><LogOut size={17} aria-hidden="true"/><span className="pms-nav-label">Logout</span></button>
      </footer>
    </aside>
  </>;
}
