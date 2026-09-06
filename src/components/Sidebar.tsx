import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuth, getUser } from '../store/auth';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/rooms', label: 'Rooms', icon: '🛏️' },
  { path: '/reservations', label: 'Reservations', icon: '📋' },
  { path: '/guests', label: 'Guests', icon: '👤' },
  { path: '/staff', label: 'Staff', icon: '👥' },
  { path: '/housekeeping', label: 'Housekeeping', icon: '🧹' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/rates', label: 'Rates', icon: '💰' },
  { path: '/expenses', label: 'Expenses', icon: '💸' },
  { path: '/night-audit', label: 'Night Audit', icon: '🌙' },
  { path: '/reports', label: 'Reports', icon: '📊' },
  { path: '/audit-logs', label: 'Audit Logs', icon: '📝' },
];
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="w-64 min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">Deenton</h1>
        <p className="text-slate-400 text-xs mt-1">{user?.propertyName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.firstName?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-400">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}