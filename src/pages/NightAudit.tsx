import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function NightAudit() {
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/night-audit/status'),
      api.get('/night-audit/history'),
    ])
      .then(([s, h]) => {
        setStatus(s.data);
        setHistory(h.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    if (!confirm('Are you sure you want to run the night audit? This will post room charges for all in-house guests.')) return;
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
          <h2 className="text-2xl font-bold text-white">Night Audit</h2>
          <p className="text-slate-400 text-sm mt-1">Daily closing process</p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {/* Today's Status */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Today — {status?.auditDate}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    {status?.alreadyRun ? (
                      <span className="px-3 py-1 bg-green-900 border border-green-700 text-green-300 text-sm rounded-lg">
                        ✓ Audit Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-900 border border-yellow-700 text-yellow-300 text-sm rounded-lg">
                        ⏳ Audit Pending
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-400 text-sm">In-House Guests</p>
                      <p className="text-2xl font-bold text-white">{status?.inHouseCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Due Out Today</p>
                      <p className="text-2xl font-bold text-orange-400">{status?.dueOutCount}</p>
                    </div>
                  </div>
                </div>

                {!status?.alreadyRun && (
                  <button
                    onClick={runAudit}
                    disabled={running}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    {running ? 'Running Audit...' : 'Run Night Audit'}
                  </button>
                )}
              </div>
            </div>

            {/* In-House Guests */}
            {status?.inHouseGuests?.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">In-House Guests</h3>
                <div className="space-y-3">
                  {status.inHouseGuests.map((res: any) => (
                    <div key={res.id} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                      <div>
                        <p className="text-white font-medium">
                          {res.guest?.firstName} {res.guest?.lastName}
                        </p>
                        <p className="text-slate-400 text-sm">
                          Room {res.room?.roomNumber} — {res.room?.roomType?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">
                          ${res.room?.roomType?.baseRate}/night
                        </p>
                        <p className={`text-sm ${res.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          Balance: ${res.balance}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit History */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Audit History</h3>
              {history.length === 0 ? (
                <p className="text-slate-400 text-sm">No audit history yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((audit: any) => (
                    <div key={audit.id} className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0">
                      <div>
                        <p className="text-white font-medium">
                          {new Date(audit.auditDate).toLocaleDateString('en-US', {
                            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {audit.inHouseCount} guests · {audit.roomChargesPosted} charges posted
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">${Number(audit.totalRoomRevenue).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs">Room Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}