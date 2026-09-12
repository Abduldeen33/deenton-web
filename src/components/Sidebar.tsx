import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuth, getUser } from '../store/auth';
import { can } from '../store/permissions';

const allMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠', permission: 'view_dashboard' as const },
  { path: '/rooms', label: 'Rooms', icon: '🛏️', permission: 'view_rooms' as const },
  { path: '/reservations', label: 'Reservations', icon: '📋', permission: 'view_reservations' as const },
  { path: '/billing', label: 'Billing', icon: '💳', permission: 'view_billing' as const },
  { path: '/guests', label: 'Guests', icon: '👤', permission: 'view_guests' as const },
  { path: '/staff', label: 'Staff', icon: '👥', permission: 'view_staff' as const },
  { path: '/housekeeping', label: 'Housekeeping', icon: '🧹', permission: 'update_housekeeping' as const },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧', permission: 'view_maintenance' as const },
  { path: '/inventory', label: 'Inventory', icon: '📦', permission: 'view_expenses' as const },
  { path: '/rates', label: 'Rates', icon: '💰', permission: 'view_rates' as const },
  { path: '/expenses', label: 'Expenses', icon: '💸', permission: 'view_expenses' as const },
  { path: '/night-audit', label: 'Night Audit', icon: '🌙', permission: 'night_audit' as const },
  { path: '/reports', label: 'Reports', icon: '📊', permission: 'view_reports' as const },
  { path: '/audit-logs', label: 'Audit Logs', icon: '📝', permission: 'view_audit_logs' as const },
];
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const menuItems = allMenuItems.filter(item => can(item.permission));

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="w-60 min-h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Deenton</h1>
            <p className="text-slate-400 text-xs">{user?.propertyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-400">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm transition-colors">
          Logout
        </button>
      </div>
    </div>
  );
}