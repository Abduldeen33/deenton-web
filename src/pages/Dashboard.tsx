import PosStaffSales from '../components/PosStaffSales';
import { useEffect, useState } from 'react';
import { getDashboard } from '../api/reports';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { can } from '../store/permissions';

export default function Dashboard() {
  const inventoryShortcut=can('view_inventory') ? <Link to="/inventory?new=item" className="inline-flex rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Add inventory</Link> : null;
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
        {inventoryShortcut && <div className="p-4">{inventoryShortcut}</div>}
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Arrivals Today', value: data?.arrivalsToday ?? 0, color: 'bg-gradient-to-br from-blue-500 to-blue-600', icon: '✈️', accent: 'text-blue-600 bg-blue-50' },
    { label: 'Departures', value: data?.departuresToday ?? 0, color: 'bg-gradient-to-br from-amber-500 to-orange-500', icon: '🚪', accent: 'text-amber-600 bg-amber-50' },
    { label: 'In House', value: data?.inHouse ?? 0, color: 'bg-gradient-to-br from-emerald-500 to-green-600', icon: '🏨', accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Available Rooms', value: data?.occupancy?.vacant ?? 0, color: 'bg-gradient-to-br from-violet-500 to-purple-600', icon: '🛏️', accent: 'text-violet-600 bg-violet-50' },
  ];

  const chartData = advanced?.dailyTrend?.slice(-14).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: d.revenue,
  })) ?? [];

  const roomStatusData = data?.roomStatusBreakdown?.length
    ? data.roomStatusBreakdown
    : [
        { name: 'Occupied', value: data?.occupancy?.occupied ?? 0, color: '#22c55e' },
        { name: 'Vacant', value: data?.occupancy?.vacant ?? 0, color: '#3b82f6' },
        { name: 'Reserved', value: data?.occupancy?.reserved ?? 0, color: '#f59e0b' },
        { name: 'Dirty', value: data?.occupancy?.dirty ?? 0, color: '#ef4444' },
        { name: 'Blocked', value: data?.occupancy?.blocked ?? 0, color: '#94a3b8' },
      ];

  const paymentMethodData = data?.revenueByPaymentMethod?.length
    ? data.revenueByPaymentMethod
    : [{ name: 'No payments', value: 0, color: '#cbd5e1' }];

  const guestMixData = data?.guestMixBreakdown?.length
    ? data.guestMixBreakdown
    : [{ name: 'Adults', value: data?.guestMetrics?.adults ?? 0, color: '#3b82f6' }, { name: 'Children', value: data?.guestMetrics?.children ?? 0, color: '#f59e0b' }];

  return (
    <Layout>
      <div className="min-h-screen bg-[#f5f6fb] p-3 md:p-4 xl:p-5">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-[#e1e3ec] bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d63d9]">Anzak Cloud · Operations overview</p>
            <h2 className="mt-1 text-lg font-bold text-[#2d3142]">Dashboard</h2>
          </div>
          {inventoryShortcut}
          <div className="border border-[#e1e3ec] bg-[#fafaff] px-3 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Today</p>
            <p className="text-sm font-semibold text-slate-800">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className={`${card.color} p-3 text-white shadow-sm transition-transform hover:-translate-y-0.5`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/80">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold leading-none">{card.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center border border-white/30 bg-white/10 text-lg">
                  {card.icon}
                </div>
              </div>
              <p className="mt-3 text-[10px] text-white/75">Live operations count</p>
            </div>
          ))}
        </div>

        {/* Revenue and Occupancy Row */}
        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Revenue Card */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Today's revenue</p>
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Strong</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700">${data?.todayRevenue?.toLocaleString() ?? '0'}</p>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Outstanding</p>
              <p className="mt-2 text-xl font-bold text-red-600">${data?.outstandingBalance?.toLocaleString() ?? '0'}</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Key metrics</p>
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-[10px] font-semibold">30d</span>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">ADR</span>
                <span className="font-bold text-slate-900">${advanced?.kpis?.adr ?? '0'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">RevPAR</span>
                <span className="font-bold text-blue-700">${advanced?.kpis?.revpar ?? '0'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Occupancy</span>
                <span className="font-bold text-emerald-700">{data?.occupancy?.occupancyRate ?? '0%'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Rooms Sold</span>
                <span className="font-bold text-slate-800">{advanced?.kpis?.roomsSold ?? '0'}</span>
              </div>
            </div>
          </div>

          {/* Room Status */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Room status</p>
            <div className="mt-3 space-y-2">
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

        <div className="mb-2 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {/* Revenue Chart */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm xl:col-span-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Revenue — Last 14 Days</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Trend</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    formatter={(value: any) => [`$${value}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#6d63d9" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No revenue data yet
              </div>
            )}
          </div>

          {/* Room Status Pie Chart */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Room Status</h3>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mt-1">Total rooms: {roomStatusData.reduce((sum: number, item: any) => sum + Number(item.value ?? 0), 0)}</p>
            </div>
            {roomStatusData.some((item: any) => item.value > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-3 items-center">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {roomStatusData.map((entry: any) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value, 'Rooms']}
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {roomStatusData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No room status data
              </div>
            )}
          </div>

          {/* Revenue by Payment Method Pie Chart */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Revenue by Payment</h3>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mt-1">Total revenue: ${paymentMethodData.reduce((sum: number, item: any) => sum + Number(item.value ?? 0), 0).toLocaleString()}</p>
            </div>
            {paymentMethodData.some((item: any) => item.value > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 items-center">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {paymentMethodData.map((entry: any) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`$${value}`, 'Revenue']}
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {paymentMethodData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">${Number(item.value).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No payment revenue yet
              </div>
            )}
          </div>

          {/* Guest Mix Pie Chart */}
          <div className="border border-[#e1e3ec] bg-white p-4 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Guest Mix</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{data?.guestMetrics?.totalGuests ?? guestMixData.reduce((sum: number, item: any) => sum + Number(item.value ?? 0), 0)} guests total</span>
            </div>
            {guestMixData.some((item: any) => item.value > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-3 items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={guestMixData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {guestMixData.map((entry: any) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value, 'Guests']}
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {guestMixData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No guest mix data
              </div>
            )}
          </div>
        </div>
        <PosStaffSales />
      </div>
    </Layout>
  );
}
