import Sidebar from './Sidebar';
import FinanceShell from './FinanceShell';
import { can, canOperate } from '../store/permissions';
import { getUser } from '../store/auth';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (['ACCOUNTS', 'DIRECTOR_OF_FINANCE'].includes(getUser()?.role || '') || (can('view_finance') && ['/expenses', '/billing', '/front-desk-cash'].includes(pathname))) return <FinanceShell>{children}</FinanceShell>;
  return (
    <div className="pms-layout">
      <Sidebar />
      <main className="pms-main">
        {!canOperate() && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{getUser()?.role === 'KITCHEN' ? 'Chef access: Kitchen preparation and menu editing. Payments, Bar items and other departments remain restricted.' : <>View-only staff access{can('create_reservations') ? ', except creating reservations, recording payments and running Night Audit' : can('night_audit') ? ', except running Night Audit' : ''}. Contact your supervisor or manager for other changes.</>}</p>}
        {children}
      </main>
    </div>
  );
}
