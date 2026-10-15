import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Rooms from './pages/Rooms';
import ServicePayments from './pages/ServicePayments';
import Reservations from './pages/Reservations';
import FrontDeskFinance from './pages/FrontDeskFinance';
import Billing from './pages/Billing';
import Guests from './pages/Guests';
import Staff from './pages/Staff';
import Housekeeping from './pages/Housekeeping';
import MaintenancePage from './pages/MaintenancePage';
import NightAudit from './pages/NightAudit';
import Rates from './pages/Rates';
import Expenses from './pages/Expenses';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import SalesReports from './pages/SalesReports';
import RevenueManagement from './pages/RevenueManagement';
import AuditLogs from './pages/AuditLogs';
import SuperAdmin from './pages/SuperAdmin';
import GuestPortal from './pages/GuestPortal';
import BookingEngine from './pages/BookingEngine';
import ChannelManager from './pages/ChannelManager';
import Loyalty from './pages/Loyalty';
import Growth from './pages/Growth';
import GrowthFeaturePage from './pages/GrowthFeaturePage';
import AiAssistant from './pages/AiAssistant';
import Marketing from './pages/Marketing';
import OrderQueues from './pages/OrderQueues';
import PosQueueProvider from './components/PosQueueProvider';
import Pos from './pages/Pos';
import PublicMenu from './pages/PublicMenu';
import { getUser } from './store/auth';
import { can, type Permission } from './store/permissions';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const token = localStorage.getItem('deenton_token');
  if (!token) return <Navigate to="/login" replace />;
  const role = getUser()?.role;
  if (pathname === '/dashboard' && ['ACCOUNTS', 'DIRECTOR_OF_FINANCE'].includes(role || '')) return <Navigate to="/finance" replace />;
  if (pathname === '/finance' && !can('view_finance')) return <div className="p-6">Finance access restricted. <a href="/dashboard">Return to dashboard</a></div>;
  if (role === 'KITCHEN' && pathname === '/workspace') return <Navigate to="/pos-queues" replace />;
  if (role === 'KITCHEN' && !can('view_pos_queue') && pathname !== '/workspace') return <Navigate to="/workspace" replace />;
  if (pathname === '/housekeeping' && !can('view_housekeeping')) return <div className="p-6">Access restricted. <a href="/dashboard">Return to dashboard</a></div>;
  const pagePermission: Record<string, Permission> = { '/service-payments': 'view_service_payments', '/dashboard': 'view_dashboard', '/audit-logs': 'view_audit_logs', '/night-audit': 'view_night_audit', '/marketing': 'view_marketing', '/channel-manager': 'view_channels', '/ai-assistant': 'view_reports', '/inventory': 'view_inventory', '/staff': 'view_staff', '/rooms': 'view_rooms', '/reservations': 'view_reservations', '/billing': 'view_billing', '/front-desk-cash': 'view_billing', '/guests': 'view_guests', '/loyalty': 'view_guests', '/rates': 'view_rates', '/expenses': 'view_expenses', '/reports': 'view_reports', '/sales-reports': 'view_reports', '/revenue-management': 'view_reports', '/maintenance': 'view_maintenance', '/pos': 'use_pos', '/pos-queues': 'view_pos_queue' };
  if (pagePermission[pathname] && !can(pagePermission[pathname])) return <div className="p-6"><h1>Access restricted</h1><p>This page is not available for your department/access level.</p><a href={can('view_dashboard') ? '/dashboard' : can('use_pos') ? '/pos' : can('view_pos_queue') ? '/pos-queues' : '/workspace'}>Return to your workspace</a></div>;
  if (role === 'KITCHEN' && !['/pos-queues', '/inventory', '/workspace'].includes(pathname)) return <Navigate to="/pos-queues" replace />;
  if (role === 'BAR' && !['/pos-queues', '/pos', '/inventory'].includes(pathname)) return <Navigate to="/pos-queues" replace />;
  if (['GENERAL_MANAGER', 'ASSISTANT_GENERAL_MANAGER', 'PURCHASE_MANAGER', 'STOREKEEPING_MANAGER'].includes(role || '') && pathname !== '/inventory' && !(role === 'GENERAL_MANAGER' && pathname === '/service-payments')) return <Navigate to="/inventory" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('deenton_token');
  if (!token) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!['SUPER_ADMIN', 'CEO'].includes(user?.role || '')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <PosQueueProvider><Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/menu/:propertyCode" element={<PublicMenu />} />
        <Route path="/my-reservation" element={<GuestPortal />} />
        <Route path="/book/:propertyCode" element={<BookingEngine />} />
        <Route path="/book" element={<BookingEngine />} />
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/finance" element={<PrivateRoute><Finance /></PrivateRoute>} />
        <Route path="/workspace" element={<PrivateRoute><Layout><section className="p-6"><h1 className="text-lg font-semibold">Staff workspace</h1><p className="mt-2 text-sm text-slate-600">Your staff account has limited, view-only access. Order queues and inventory require an authorized supervisor or manager. Contact your manager if your assigned access level is incorrect.</p></section></Layout></PrivateRoute>} />
        <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
        <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
        <Route path="/front-desk-cash" element={<PrivateRoute><FrontDeskFinance /></PrivateRoute>} />
        <Route path="/service-payments" element={<PrivateRoute><ServicePayments /></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="/guests" element={<PrivateRoute><Guests /></PrivateRoute>} />
        <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
        <Route path="/housekeeping" element={<PrivateRoute><Housekeeping /></PrivateRoute>} />
        <Route path="/maintenance" element={<PrivateRoute><MaintenancePage /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
        <Route path="/rates" element={<PrivateRoute><Rates /></PrivateRoute>} />
        <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
        <Route path="/night-audit" element={<PrivateRoute><NightAudit /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/sales-reports" element={<PrivateRoute><SalesReports /></PrivateRoute>} />
        <Route path="/revenue-management" element={<PrivateRoute><RevenueManagement /></PrivateRoute>} />
        <Route path="/channel-manager" element={<PrivateRoute><ChannelManager /></PrivateRoute>} />
        <Route path="/loyalty" element={<PrivateRoute><Loyalty /></PrivateRoute>} />
        <Route path="/growth" element={<PrivateRoute><Growth /></PrivateRoute>} />
        <Route path="/growth/:slug" element={<PrivateRoute><GrowthFeaturePage /></PrivateRoute>} />
        <Route path="/ai-assistant" element={<PrivateRoute><AiAssistant /></PrivateRoute>} />
        <Route path="/marketing" element={<PrivateRoute><Marketing /></PrivateRoute>} />
        <Route path="/pos-queues" element={<PrivateRoute><OrderQueues /></PrivateRoute>} />
        <Route path="/pos" element={<PrivateRoute><Pos /></PrivateRoute>} />
        <Route path="/audit-logs" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes></PosQueueProvider>
    </BrowserRouter>
  );
}

export default App;
