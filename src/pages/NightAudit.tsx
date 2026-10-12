import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

export default function NightAudit() {
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/night-audit/status'), api.get('/night-audit/history')])
      .then(([s, h]) => { setStatus(s.data); setHistory(h.data); })
      .catch((err) => { setStatus(null); setError(err.response?.data?.message || 'Unable to check night audit. Please retry.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    if (!can('night_audit') || running || !status) return;
    if (!confirm('Run night audit? This will post room charges for all in-house guests.')) return;
    setRunning(true);
    try {
      await api.post('/night-audit/run');
      alert('Night audit completed successfully.');
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Night audit failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Night Audit</h2>
          <p className="text-slate-500 text-sm mt-1">Daily closing process</p>
          <p className="mt-2 text-sm text-amber-800">New reservations are locked until today's night audit is completed.</p>
          {!can('night_audit') && <p className="mt-2 text-sm text-slate-600">View-only access. An authorized audit operator must run the audit.</p>}
          <button onClick={load} disabled={loading || running} className="mt-2 rounded border px-3 py-1 text-sm">Refresh audit status</button>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Today — {status?.auditDate}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    {status?.alreadyRun ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 text-sm rounded-lg font-medium">
                        ✓ Audit Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 border border-yellow-200 text-sm rounded-lg font-medium">
                        ⏳ Audit Pending
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-500 text-sm">In-House Guests</p>
                      <p className="text-2xl font-bold text-slate-800">{status?.inHouseCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Due Out Today</p>
                      <p className="text-2xl font-bold text-orange-600">{status?.dueOutCount}</p>
                    </div>
                  </div>
                </div>
                {!!status && !status.alreadyRun && can('night_audit') && (
                  <button onClick={runAudit} disabled={running}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl">
                    {running ? 'Running...' : 'Run Night Audit'}
                  </button>
                )}
              </div>
            </div>

            {status?.inHouseGuests?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-slate-800 font-semibold">In-House Guests</h3>
                </div>
                {status.inHouseGuests.map((res: any, i: number) => (
                  <div key={res.id} className={`flex justify-between items-center p-4 ${i < status.inHouseGuests.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <p className="text-slate-800 font-medium">{res.guest?.firstName} {res.guest?.lastName}</p>
                      <p className="text-slate-500 text-sm">Room {res.room?.roomNumber} — {res.room?.roomType?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-800 font-medium">${res.room?.roomType?.baseRate}/night</p>
                      <p className={`text-sm font-bold ${Number(res.balance) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        Balance: ${res.balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-slate-800 font-semibold">Audit History</h3>
              </div>
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No audit history yet</div>
              ) : (
                history.map((audit: any, i: number) => (
                  <div key={audit.id} className={`flex justify-between items-center p-4 ${i < history.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <p className="text-slate-800 font-medium">
                        {new Date(audit.auditDate).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-500 text-sm">{audit.inHouseCount} guests · {audit.roomChargesPosted} charges posted</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold">${Number(audit.totalRoomRevenue).toLocaleString()}</p>
                      <p className="text-slate-400 text-xs">Room Revenue</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
