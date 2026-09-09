import { useEffect, useState } from 'react';
import { getDashboard } from '../api/reports';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboard(),
      api.get('/reports/advanced'),
    ])
      .then(([dash, adv]) => {
        setData(dash);
        setAdvanced(adv.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Arrivals Today', value: data?.arrivalsToday ?? 0, color: 'bg-blue-500', icon: '✈️' },
    { label: 'Departures', value: data?.departuresToday ?? 0, color: 'bg-orange-500', icon: '🚪' },
    { label: 'In House', value: data?.inHouse ?? 0, color: 'bg-green-500', icon: '🏨' },
    { label: 'Available Rooms', value: data?.occupancy?.vacant ?? 0, color: 'bg-purple-500', icon: '🛏️' },
  ];

  const chartData = advanced?.dailyTrend?.slice(-14).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: d.revenue,
  })) ?? [];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                </div>
                <div className={`${card.color} w-10 h-10 rounded-xl flex items-center justify-center text-lg`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue and Occupancy Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Revenue Card */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm mb-1">Today's Revenue</p>
            <p className="text-3xl font-bold text-green-600">${data?.todayRevenue?.toLocaleString() ?? '0'}</p>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-slate-500 text-sm">Outstanding Balance</p>
              <p className="text-xl font-bold text-red-500">${data?.outstandingBalance?.toLocaleString() ?? '0'}</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm mb-3">Key Metrics (30 days)</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">ADR</span>
                <span className="font-bold text-slate-800">${advanced?.kpis?.adr ?? '0'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">RevPAR</span>
                <span className="font-bold text-blue-600">${advanced?.kpis?.revpar ?? '0'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Occupancy</span>
                <span className="font-bold text-green-600">{data?.occupancy?.occupancyRate ?? '0%'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Rooms Sold</span>
                <span className="font-bold text-slate-800">{advanced?.kpis?.roomsSold ?? '0'}</span>
              </div>
            </div>
          </div>

          {/* Room Status */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm mb-3">Room Status</p>
            <div className="space-y-2">
              {[
                { label: 'Occupied', value: data?.occupancy?.occupied, color: 'bg-green-500' },
                { label: 'Vacant', value: data?.occupancy?.vacant, color: 'bg-blue-500' },
                { label: 'Reserved', value: data?.occupancy?.reserved, color: 'bg-yellow-500' },
                { label: 'Dirty', value: data?.occupancy?.dirty, color: 'bg-red-500' },
                { label: 'Blocked', value: data?.occupancy?.blocked, color: 'bg-slate-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-slate-600 text-sm flex-1">{item.label}</span>
                  <span className="font-bold text-slate-800">{item.value ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-slate-800 font-semibold mb-4">Revenue — Last 14 Days</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  formatter={(value: any) => [`$${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              No revenue data yet
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}