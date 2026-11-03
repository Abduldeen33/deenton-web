import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Wallet,
  Receipt,
  Landmark,
  Package,
  LogOut,
  Menu,
  X,
  Moon,
  UtensilsCrossed,
  ChevronDown,
  Plus,
  Search,
  Bell,
  Users,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { can, canOperate, type Permission } from '../store/permissions';
import { clearAuth, getUser } from '../store/auth';
import './finance.css';
import './finance-workspace.css';
import { canReviewFinance } from './finance-access';

type Entry = {
  path: string;
  label: string;
  permission: Permission;
  icon: LucideIcon;
};
type Group = { title: string; entries: Entry[] };
export default function FinanceShell({
  children,
  controls,
  notices = [],
}: {
  children: ReactNode;
  controls?: ReactNode;
  notices?: string[];
}) {
  const user = getUser(),
    navigate = useNavigate(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [compact, setCompact] = useState(false),
    [closed, setClosed] = useState<string[]>([]),
    [query, setQuery] = useState('');
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLElement>('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const nodes = Array.from(
          drawer.current?.querySelectorAll<HTMLElement>(
            'button,a[href],summary',
          ) || [],
        ).filter((e) => e.getClientRects().length),
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 701px)');
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', resize);
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', close);
      desktop.removeEventListener('change', resize);
      before?.focus();
    };
  }, [open]);
  const entry = (
    path: string,
    label: string,
    permission: Permission,
    icon: LucideIcon,
  ): Entry => ({ path, label, permission, icon });
  const groups: Group[] = [
    {
      title: 'Dashboard',
      entries: [
        entry(
          '/finance',
          'Home & financial overview',
          'view_finance',
          BarChart3,
        ),
      ],
    },
    {
      title: 'Sales',
      entries: [
        entry('/finance?tab=invoices', 'Invoices', 'view_finance', Receipt),
        entry('/guests', 'Customers / guests', 'view_guests', Users),
        entry(
          '/finance?tab=guests',
          'Guest receivables',
          'view_finance',
          Wallet,
        ),
        entry(
          '/front-desk-cash?tab=corporate',
          'Corporate / Conference',
          'view_billing',
          Landmark,
        ),
        entry(
          '/finance?tab=payments',
          'Payments received',
          'view_finance',
          CreditCardIcon,
        ),
      ],
    },
    {
      title: 'Expenses',
      entries: [
        entry('/expenses', 'Expenses & reporting', 'view_expenses', Receipt),
        entry('/inventory', 'Inventory & stock', 'view_inventory', Package),
      ],
    },
    {
      title: 'Payroll & employees',
      entries: [
        entry('/hr', 'Staff salaries & payments', 'view_hr', Users),
        entry('/my-payslips', 'My payslips', 'view_my_payslips', Receipt),
      ],
    },
    {
      title: 'Banking',
      entries: [
        entry(
          '/finance?tab=activity',
          'Cash collections & activity',
          'view_finance',
          Wallet,
        ),
      ],
    },
    {
      title: 'Accounting',
      entries: canReviewFinance()
        ? [
            entry(
              '/finance?tab=reconciliation',
              'Reconciliation review',
              'view_finance',
              BookOpen,
            ),
          ]
        : [],
    },
    {
      title: 'Hotel operations',
      entries: [
        entry('/billing', 'Guest billing & payments', 'view_billing', Receipt),
        entry(
          '/service-payments',
          'Front Desk services',
          'view_service_payments',
          Wallet,
        ),
        entry(
          '/pos-queues',
          'POS settlements',
          'view_pos_queue',
          UtensilsCrossed,
        ),
        entry('/night-audit', 'Night audit', 'view_night_audit', Moon),
        entry(
          '/front-desk-cash?tab=accounts',
          'Cash & house accounts',
          'view_billing',
          Landmark,
        ),
      ],
    },
    {
      title: 'Reports',
      entries: [
        entry(
          '/reports',
          'Operational hotel reports',
          'view_reports',
          BarChart3,
        ),
        entry('/audit-logs', 'Audit Logs', 'view_audit_logs', ShieldCheck),
      ],
    },
    {
      title: 'Settings',
      entries: [entry('/staff', 'User permissions', 'manage_staff', Settings)],
    },
  ];
  const selected = (path: string) => {
    const url = new URL(path, window.location.origin);
    if (location.pathname.replace(/\/$/, '') !== url.pathname) return false;
    const tab = new URLSearchParams(location.search).get('tab');
    if (url.pathname === '/finance') {
      const available = [
        'overview',
        'activity',
        'guests',
        'invoices',
        'payments',
        ...(canReviewFinance() ? ['reconciliation'] : []),
      ];
      const current = tab && available.includes(tab) ? tab : 'overview';
      return current === (url.searchParams.get('tab') || 'overview');
    }
     if (url.pathname === '/front-desk-cash') {
  const currentTab = tab || 'cash';
  const linkTab = url.searchParams.get('tab') || 'cash';

       return currentTab === linkTab;
    }
      return false;
    };
  const workspaceLink = (path: string) => {
    const url = new URL(path, window.location.origin);
    if (url.pathname === '/finance' && location.pathname === '/finance') {
      const current = new URLSearchParams(location.search);
      for (const name of ['from', 'to', 'currency'])
        if (current.has(name)) url.searchParams.set(name, current.get(name)!);
    }
    return url.pathname + url.search;
  };
  const navigateSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(
      workspaceLink('/finance?tab=activity&q=' + encodeURIComponent(query)),
    );
  };
  return (
    <div
      className={
        'finance-shell fw-modern' + (compact ? ' fw-nav-collapsed' : '')
      }
    >
      {open && (
        <button
          className="fw-backdrop"
          aria-label="Dismiss finance navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="finance-navigation"
        ref={drawer}
        className={'finance-nav ' + (open ? 'is-open' : '')}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label="Finance workspace navigation"
      >
        <button className="fw-close" onClick={() => setOpen(false)}>
          <X size={18} />
          Close navigation
        </button>
        <div className="finance-brand">
          <span>ac</span>
          <div>
            Anzak Cloud<small>FINANCE WORKSPACE</small>
          </div>
        </div>
        <button
          className="fw-collapse"
          aria-label="Collapse finance sidebar"
          onClick={() => setCompact(true)}
        >
          <ArrowLeft size={14} />
          Collapse sidebar
        </button>
        <nav aria-label="Finance navigation">
          {groups.map((group) => {
            const entries = group.entries.filter((e) => can(e.permission));
            if (!entries.length) return null;
            const expanded = !closed.includes(group.title);
            return (
              <section key={group.title}>
                <button
                  className="fw-group-toggle"
                  aria-expanded={expanded}
                  aria-controls={
                    'finance-group-' + group.title.replaceAll(' ', '-')
                  }
                  onClick={() =>
                    setClosed((v) =>
                      v.includes(group.title)
                        ? v.filter((t) => t !== group.title)
                        : [...v, group.title],
                    )
                  }
                >
                  {group.title}
                  <ChevronDown size={13} className={expanded ? '' : 'closed'} />
                </button>
                <div
                  hidden={!expanded}
                  id={'finance-group-' + group.title.replaceAll(' ', '-')}
                >
                  {entries.map((e) => (
                    <Link
                      key={e.path}
                      to={workspaceLink(e.path)}
                      aria-current={selected(e.path) ? 'page' : undefined}
                      className={selected(e.path) ? 'active' : ''}
                      onClick={() => setOpen(false)}
                    >
                      <e.icon size={16} />
                      <span>{e.label}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </nav>
        <div className="finance-nav-footer">
          {can('view_reservations') && (
            <Link to="/reservations">
              <ArrowLeft size={15} />
              Back to Reservations
            </Link>
          )}
          <small>
            {(user?.role || '').replaceAll('_', ' ')} ·{' '}
            {(user?.accessLevel || '').replaceAll('_', ' ')}
          </small>
          <button
            onClick={() => {
              clearAuth();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
      <div className="finance-body">
        <header className="finance-topbar">
          <div className="fw-hotel">
            <button
              className="fw-expand"
              aria-label="Expand finance sidebar"
              onClick={() => setCompact(false)}
            >
              <Menu size={19} />
            </button>
            <button
              className="finance-menu"
              aria-label="Toggle finance navigation"
              aria-expanded={open}
              aria-controls="finance-navigation"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <div>
              <strong>{user?.propertyName || 'Hotel finance'}</strong>
              <small>Finance workspace · authorized hotel</small>
            </div>
          </div>
          <form className="fw-global-search" onSubmit={navigateSearch}>
            <Search size={16} />
            <input
              aria-label="Search finance transactions"
              placeholder="Search recorded cash & expenses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <div className="fw-header-actions">
            <details className="fw-menu">
              <summary aria-label="Workspace notices">
                <Bell size={18} />
                {notices.length > 0 && (
                  <span className="fw-notice-count">{notices.length}</span>
                )}
              </summary>
              <div className="fw-popover">
                <strong>Workspace notices</strong>
                {notices.length ? (
                  notices.map((note) => <p key={note}>{note}</p>)
                ) : (
                  <p>
                    No notices supplied by this view. This is not a live
                    bank-alert feed.
                  </p>
                )}
                {canReviewFinance() && (
                  <Link to="/finance?tab=reconciliation">
                    Run reconciliation checks
                  </Link>
                )}
              </div>
            </details>
            <details className="fw-menu">
              <summary className="fw-quick-create">
                <Plus size={16} />
                Quick Create
              </summary>
              <div className="fw-popover" aria-label="Quick Create actions">
                {can('view_billing') && canOperate() && (
                  <Link
                    to="/front-desk-cash?tab=corporate"
                    title="Select a company account, then post an invoice charge"
                  >
                    New Invoice
                  </Link>
                )}
                {can('record_payments') && (
                  <Link
                    to="/billing"
                    title="Select the guest folio, then record payment"
                  >
                    Record Payment
                  </Link>
                )}
                {can('manage_expenses') && (
                  <Link to="/expenses?new=1">New Expense</Link>
                )}
              </div>
            </details>
            <details className="fw-menu">
              <summary className="finance-profile">
                <span className="fw-avatar">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
                <span>
                  {user?.firstName} {user?.lastName}
                  <small>{(user?.role || '').replaceAll('_', ' ')}</small>
                </span>
              </summary>
              <div className="fw-popover">
                <p>{user?.email}</p>
                <p>{(user?.accessLevel || '').replaceAll('_', ' ')}</p>
              </div>
            </details>
          </div>
        </header>
        {controls && <div className="fw-period-bar">{controls}</div>}
        {!canOperate() && (
          <p className="finance-notice">
            Junior cashier access: record payments and print receipts. Expense
            entry, refunds, voids, reconciliation review and inventory remain
            restricted.
          </p>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
const CreditCardIcon = Wallet;
