import { useState, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, BedDouble, CalendarDays, ChevronDown, ClipboardList, CreditCard, DollarSign, Mail,
  Globe, LayoutDashboard, LineChart, Moon, Package, Sparkles, Star, Tag,
  TrendingUp, User, Users, Wallet, Wrench,
} from 'lucide-react';
import { clearAuth, getUser } from '../store/auth';
import { can } from '../store/permissions';

const allMenuItems = [
  { path: '/pos-queues', label: 'Order queues', icon: '', permission: 'view_pos_queue' as const },
  { path: '/ai-assistant', label: 'AI Assistant', icon: '', permission: 'view_reports' as const },
  { path: '/marketing', label: 'Automated Marketing', icon: '', permission: 'view_marketing' as const },
  { path: '/pos', label: 'Restaurant POS', icon: '', permission: 'use_pos' as const },
  { path: '/dashboard', label: 'Dashboard', icon: '🏠', permission: 'view_dashboard' as const },
  { path: '/rooms', label: 'Rooms', icon: '🛏️', permission: 'view_rooms' as const },
  { path: '/reservations', label: 'Reservations', icon: '📋', permission: 'view_reservations' as const },
  { path: '/front-desk-cash', label: 'Cash & House Accounts', icon: '', permission: 'view_billing' as const },
  { path: '/billing', label: 'Billing', icon: '', permission: 'view_billing' as const },
  { path: '/guests', label: 'Guests', icon: '👤', permission: 'view_guests' as const },
  { path: '/staff', label: 'Staff', icon: '👥', permission: 'view_staff' as const },
  { path: '/housekeeping', label: 'Housekeeping', icon: '🧹', permission: 'view_housekeeping' as const },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧', permission: 'view_maintenance' as const },
  { path: '/inventory', label: 'Inventory', icon: '📦', permission: 'view_inventory' as const },
  { path: '/rates', label: 'Rates', icon: '💰', permission: 'view_rates' as const },
  { path: '/expenses', label: 'Expenses', icon: '💸', permission: 'view_expenses' as const },
  { path: '/sales-reports', label: 'Sales Reports', icon: '📈', permission: 'view_reports' as const },
  { path: '/revenue-management', label: 'Predictive Analytics', icon: '💹', permission: 'view_reports' as const },
  { path: '/channel-manager', label: 'Channels', icon: '🌐', permission: 'view_channels' as const },
  { path: '/loyalty', label: 'Loyalty', icon: '⭐', permission: 'view_guests' as const },
  { path: '/night-audit', label: 'Night Audit', icon: '🌙', permission: 'view_night_audit' as const },
  { path: '/reports', label: 'Reports', icon: '📊', permission: 'view_reports' as const },
  { path: '/audit-logs', label: 'Audit Logs', icon: '📝', permission: 'view_audit_logs' as const },
];

const sidebarIcons: Record<string, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/rooms': BedDouble,
  '/reservations': CalendarDays,
  '/billing': CreditCard,
  '/front-desk-cash': Wallet,
  '/guests': User,
  '/staff': Users,
  '/housekeeping': Sparkles,
  '/maintenance': Wrench,
  '/inventory': Package,
  '/expenses': Wallet,
  '/sales-reports': LineChart,
  '/revenue-management': TrendingUp,
  '/ai-assistant': Sparkles,
  '/marketing': Mail,
  '/pos': CreditCard,
  '/pos-queues': ClipboardList,
  '/channel-manager': Globe,
  '/loyalty': Star,
  '/night-audit': Moon,
  '/reports': BarChart3,
  '/audit-logs': ClipboardList,
};
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [ratesOpen, setRatesOpen] = useState(location.pathname === '/rates');

  const menuItems = allMenuItems.filter(item => can(item.permission));

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navigationClass = (active: boolean, nested = false) => `flex w-full items-center gap-3 border-l-2 py-2.5 text-left text-sm transition-colors ${
    nested ? 'pl-12 pr-4' : 'px-4'
  } ${active
    ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]'
    : 'border-transparent font-normal text-[#30313b] hover:bg-[#f5f5f8]'
  }`;

  return (
    <div className="flex min-h-screen w-60 flex-col border-r border-[#e0e1e6] bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#e0e1e6] px-5 py-4">
        <button title="Close navigation" className="text-2xl font-light leading-none text-[#30313b]">×</button>
        <div>
          <h1 className="text-[14px] font-semibold text-[#262832]">Anzak Cloud</h1>
          <p className="mt-0.5 text-[10px] text-[#8a8c96]">Hotel operations</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {['SUPER_ADMIN', 'CEO'].includes(user?.role || '') && <button onClick={() => navigate('/super-admin')} className={navigationClass(location.pathname === '/super-admin')}><Globe size={18} strokeWidth={1.8} /><span>All hotels</span></button>}
        {can('view_dashboard') && <button onClick={() => navigate('/dashboard')} className={navigationClass(location.pathname === '/dashboard')}><LayoutDashboard size={18} strokeWidth={1.8} /><span>Stay View</span></button>}
        {can('view_rooms') && <button onClick={() => navigate('/rooms')} className={navigationClass(location.pathname === '/rooms')}><BedDouble size={18} strokeWidth={1.8} /><span>Room View</span></button>}
        {can('view_reservations') && <button onClick={() => navigate('/reservations')} className={navigationClass(location.pathname === '/reservations')}><CalendarDays size={18} strokeWidth={1.8} /><span>Reservations</span></button>}
        {can('view_rates') && <div>
          <button onClick={() => { setRatesOpen(!ratesOpen); navigate('/rates'); }} className={navigationClass(location.pathname === '/rates')}><Tag size={18} strokeWidth={1.8} /><span className="flex-1">Rates &amp; Availability</span><ChevronDown size={16} className={`transition-transform ${ratesOpen ? 'rotate-180' : ''}`} /></button>
          {ratesOpen && <div className="py-1">
            <button onClick={() => navigate('/rates')} className={navigationClass(location.pathname === '/rates' && !location.search, true)}><DollarSign size={17} strokeWidth={1.8} /><span>Rates</span></button>
            <button onClick={() => navigate('/rates?view=packages')} className={navigationClass(location.search === '?view=packages', true)}><Package size={17} strokeWidth={1.8} /><span>Packages &amp; Promotions</span></button>
            <button onClick={() => navigate('/rates?view=threshold')} className={navigationClass(location.search === '?view=threshold', true)}><DollarSign size={17} strokeWidth={1.8} /><span>Rate Threshold</span></button>
          </div>}
        </div>}
        <div className="my-3 border-t border-[#e6e7ec]" />
        {menuItems.filter((item) => !['/dashboard', '/rooms', '/reservations', '/rates'].includes(item.path)).map((item) => {
          const Icon = sidebarIcons[item.path] ?? LayoutDashboard;
          return <button key={item.path} onClick={() => navigate(item.path)} className={navigationClass(location.pathname === item.path)}><Icon size={18} strokeWidth={1.8} /><span>{item.path === '/pos-queues' && user?.role === 'ACCOUNTS' ? 'POS payments' : item.label}</span></button>;
        })}
        <div className="hidden">
        <button onClick={() => navigate('/dashboard')} className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${location.pathname === '/dashboard' ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]' : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'}`}><span className="w-5 text-center text-base">▤</span><span>Stay View</span></button>
        {can('view_rooms') && <button onClick={() => navigate('/rooms')} className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${location.pathname === '/rooms' ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]' : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'}`}><span className="w-5 text-center text-base">▦</span><span>Room View</span></button>}
        {can('view_reservations') && <button onClick={() => navigate('/reservations')} className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${location.pathname === '/reservations' ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]' : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'}`}><span className="w-5 text-center text-base">□</span><span>Reservations</span></button>}
        {can('view_rates') && (
          <div className="mt-1">
            <button onClick={() => { setRatesOpen(!ratesOpen); navigate('/rates'); }} className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${location.pathname === '/rates' ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]' : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'}`}><span className="w-5 text-center text-base">⌘</span><span className="flex-1">Rates &amp; Availability</span><span className="text-xs">{ratesOpen ? '⌃' : '⌄'}</span></button>
            {ratesOpen && <div className="ml-8 border-l border-[#e3e4e8] py-1"><button onClick={() => navigate('/rates')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>$</span>Rates</button><button onClick={() => navigate('/rates')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>◇</span>Packages &amp; Promotions</button><button onClick={() => navigate('/rates?view=threshold')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>$</span>Rate Threshold</button></div>}
          </div>
        )}
        <div className="my-3 border-t border-[#eeeeF1]" />
        {menuItems.filter((item) => !['/dashboard', '/rooms', '/reservations', '/rates'].includes(item.path)).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = sidebarIcons[item.path] ?? LayoutDashboard;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]'
                  : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'
              }`}
            >
              <span className="flex w-5 justify-center"><Icon size={18} strokeWidth={1.8} /></span>
              <span>{item.path === '/dashboard' ? 'Stay View' : item.path === '/rooms' ? 'Room View' : item.label}</span>
            </button>
          );
        })}
        {false && can('view_rates') && (
          <div className="mt-1">
            <button onClick={() => { setRatesOpen(!ratesOpen); navigate('/rates'); }} className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${location.pathname === '/rates' ? 'border-[#6d63d9] bg-[#f0efff] font-semibold text-[#4d45b7]' : 'border-transparent text-[#3e404a] hover:bg-[#f5f5f8]'}`}>
              <span className="w-5 text-center text-base">⌘</span><span className="flex-1">Rates &amp; Availability</span><span className="text-xs">{ratesOpen ? '⌃' : '⌄'}</span>
            </button>
            {ratesOpen && <div className="ml-8 border-l border-[#e3e4e8] py-1">
              <button onClick={() => navigate('/rates')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>$</span>Rates</button>
              <button onClick={() => navigate('/rates')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>◇</span>Packages &amp; Promotions</button>
              <button onClick={() => navigate('/rates?view=threshold')} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#4f515c] hover:text-[#30313b]"><span>$</span>Rate Threshold</button>
            </div>}
          </div>
        )}
        </div>
      </nav>

      <div className="border-t border-[#e0e1e6] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d63d9] text-xs font-bold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-[#30313b]">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#8a8c96]">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full border border-[#dcdde3] px-3 py-2 text-sm text-[#575a66] transition-colors hover:bg-[#f5f5f8]">
          Logout
        </button>
      </div>
    </div>
  );
}
