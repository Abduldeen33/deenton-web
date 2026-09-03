import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Reports() {
  const [occupancy, setOccupancy] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/occupancy'),
      api.get('/reports/daily-revenue'),
      api.get('/reports/outstanding'),
    ])
      .then(([occ, rev, out]) => {
        setOccupancy(occ.data);
        setRevenue(rev.data);
        setOutstanding(out.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Reports</h2>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading reports...</p>
        ) : (
          <div className="space-y-6">
            {/* Occupancy Report */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Occupancy Report</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{occupancy?.totalRooms}</p>
                  <p className="text-slate-400 text-sm">Total Rooms</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{occupancy?.occupied}</p>
                  <p className="text-slate-400 text-sm">Occupied</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-300">{occupancy?.vacant}</p>
                  <p className="text-slate-400 text-sm">Vacant</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">{occupancy?.occupancyRate}</p>
                  <p className="text-slate-400 text-sm">Occupancy Rate</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-400">{occupancy?.reserved}</p>
                  <p className="text-slate-400 text-sm">Reserved</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">{occupancy?.blocked}</p>
                  <p className="text-slate-400 text-sm">Blocked</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-400">{occupancy?.dirty}</p>
                  <p className="text-slate-400 text-sm">Dirty</p>
                </div>
              </div>
            </div>

            {/* Daily Revenue */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Today's Revenue</h3>
              <div className="flex items-center justify-between mb-4">
                <p className="text-4xl font-bold text-green-400">
                  ${revenue?.totalRevenue?.toLocaleString() ?? '0'}
                </p>
                <p className="text-slate-400 text-sm">{revenue?.count ?? 0} payments</p>
              </div>
              {revenue?.byMethod && Object.keys(revenue.byMethod).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-slate-400 text-sm font-medium">By Payment Method:</p>
                  {Object.entries(revenue.byMethod).map(([method, amount]: any) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">{method.replace('_', ' ')}</span>
                      <span className="text-white font-medium">${amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No payments recorded today</p>
              )}
            </div>

            {/* Outstanding Balances */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Outstanding Balances</h3>
                <span className="text-red-400 font-bold text-xl">
                  ${outstanding?.total?.toLocaleString() ?? '0'}
                </span>
              </div>
              {outstanding?.reservations?.length === 0 ? (
                <p className="text-green-400 text-sm">No outstanding balances</p>
              ) : (
                <div className="space-y-3">
                  {outstanding?.reservations?.map((res: any) => (
                    <div key={res.id} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {res.guest?.firstName} {res.guest?.lastName}
                        </p>
                        <p className="text-slate-400 text-xs">
                          Room {res.room?.roomNumber} • #{res.resNumber} • {res.status}
                        </p>
                      </div>
                      <p className="text-red-400 font-bold">${res.balance}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}