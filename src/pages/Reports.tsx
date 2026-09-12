import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Reports() {
  const [occupancy, setOccupancy] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [outstanding, setOutstanding] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/occupancy'),
      api.get('/reports/daily-revenue'),
      api.get('/reports/outstanding'),
      api.get('/reports/advanced'),
    ])
      .then(([occ, rev, out, adv]) => {
        setOccupancy(occ.data);
        setRevenue(rev.data);
        setOutstanding(out.data);
        setAdvanced(adv.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading reports...</p>
        ) : (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-400 text-xs mb-1">ADR</p>
                <p className="text-2xl font-bold text-white">${advanced?.kpis?.adr ?? '0'}</p>
                <p className="text-slate-500 text-xs mt-1">Avg Daily Rate</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-400 text-xs mb-1">RevPAR</p>
                <p className="text-2xl font-bold text-blue-400">${advanced?.kpis?.revpar ?? '0'}</p>
                <p className="text-slate-500 text-xs mt-1">Rev Per Available Room</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-400 text-xs mb-1">Occupancy</p>
                <p className="text-2xl font-bold text-green-400">{occupancy?.occupancyRate ?? '0%'}</p>
                <p className="text-slate-500 text-xs mt-1">Current occupancy</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-400 text-xs mb-1">Rooms Sold</p>
                <p className="text-2xl font-bold text-yellow-400">{advanced?.kpis?.roomsSold ?? '0'}</p>
                <p className="text-slate-500 text-xs mt-1">Last 30 days</p>
              </div>
            </div>

            {/* Monthly Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Monthly Revenue</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">This Month</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${advanced?.monthly?.thisMonth?.toLocaleString() ?? '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Last Month</p>
                    <p className="text-2xl font-bold text-slate-300">
                      ${advanced?.monthly?.lastMonth?.toLocaleString() ?? '0'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">Month on Month Growth</p>
                  <p className={`text-xl font-bold ${advanced?.monthly?.growing ? 'text-green-400' : 'text-red-400'}`}>
                    {advanced?.monthly?.growing ? '▲' : '▼'} {advanced?.monthly?.growth}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Today's Revenue</h3>
                <p className="text-3xl font-bold text-green-400 mb-3">
                  ${revenue?.totalRevenue?.toLocaleString() ?? '0'}
                </p>
                <p className="text-slate-400 text-sm">{revenue?.count ?? 0} payments received</p>
                {revenue?.byMethod && Object.keys(revenue.byMethod).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                    {Object.entries(revenue.byMethod).map(([method, amount]: any) => (
                      <div key={method} className="flex justify-between text-sm">
                        <span className="text-slate-400">{method.replace('_', ' ')}</span>
                        <span className="text-white font-medium">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Revenue Trend */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Revenue Trend — Last 30 Days</h3>
              {advanced?.dailyTrend && (
                <div className="flex items-end gap-1 h-32">
                  {advanced.dailyTrend.map((day: any, i: number) => {
                    const maxRevenue = Math.max(...advanced.dailyTrend.map((d: any) => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${day.date}: $${day.revenue}`}
                      >
                        <div
                          className="w-full bg-blue-600 rounded-sm transition-all"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-xs mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Revenue by Room Type */}
            {advanced?.byRoomType && Object.keys(advanced.byRoomType).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Revenue by Room Type</h3>
                <div className="space-y-3">
                  {Object.entries(advanced.byRoomType)
                    .sort(([, a]: any, [, b]: any) => b.revenue - a.revenue)
                    .map(([type, data]: any) => (
                      <div key={type} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                        <div>
                          <p className="text-white text-sm font-medium">{type}</p>
                          <p className="text-slate-400 text-xs">{data.stays} stays · Base rate: ${data.baseRate}</p>
                        </div>
                        <p className="text-green-400 font-bold">${data.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Occupancy Report */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Occupancy Report</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{occupancy?.totalRooms}</p>
                  <p className="text-slate-400 text-xs">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{occupancy?.occupied}</p>
                  <p className="text-slate-400 text-xs">Occupied</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-300">{occupancy?.vacant}</p>
                  <p className="text-slate-400 text-xs">Vacant</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{occupancy?.reserved}</p>
                  <p className="text-slate-400 text-xs">Reserved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{occupancy?.blocked}</p>
                  <p className="text-slate-400 text-xs">Blocked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{occupancy?.dirty}</p>
                  <p className="text-slate-400 text-xs">Dirty</p>
                </div>
              </div>
            </div>

            {/* Outstanding Balances */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold">Outstanding Balances</h3>
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
                          Room {res.room?.roomNumber} · #{res.resNumber} · {res.status}
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
