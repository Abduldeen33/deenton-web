import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Reservations from './pages/Reservations';
import Guests from './pages/Guests';
import Staff from './pages/Staff';
import Housekeeping from './pages/Housekeeping';
import MaintenancePage from './pages/MaintenancePage';
import NightAudit from './pages/NightAudit';
import Rates from './pages/Rates';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('deenton_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/rooms" element={<PrivateRoute><Rooms /></PrivateRoute>} />
        <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
        <Route path="/guests" element={<PrivateRoute><Guests /></PrivateRoute>} />
        <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
        <Route path="/housekeeping" element={<PrivateRoute><Housekeeping /></PrivateRoute>} />
        <Route path="/maintenance" element={<PrivateRoute><MaintenancePage /></PrivateRoute>} />
        <Route path="/rates" element={<PrivateRoute><Rates /></PrivateRoute>} />
        <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
        <Route path="/night-audit" element={<PrivateRoute><NightAudit /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/audit-logs" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;