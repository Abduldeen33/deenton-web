import Sidebar from './Sidebar';
import { can, canOperate } from '../store/permissions';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {!canOperate() && <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">View-only staff access{can('create_reservations') ? ', except creating reservations, recording payments and running Night Audit' : can('night_audit') ? ', except running Night Audit' : ''}. Contact your supervisor or manager for other changes.</p>}
        {children}
      </main>
    </div>
  );
}
