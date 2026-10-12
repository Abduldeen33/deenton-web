import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const demandColors: any = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

const actionColors: any = {
  INCREASE: 'text-red-600',
  DECREASE: 'text-green-600',
  MAINTAIN: 'text-slate-600',
};

const actionIcons: any = {
  INCREASE: '↑',
  DECREASE: '↓',
  MAINTAIN: '→',
};

const priorityColors: any = {
  HIGH: 'bg-red-50 border-red-200',
  MEDIUM: 'bg-yellow-50 border-yellow-200',
  LOW: 'bg-blue-50 border-blue-200',
};

export default function RevenueManagement() {
  const [forecast, setForecast] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ANALYTICS');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/revenue-management/forecast', { params: { days: 14 } }),
      api.get('/revenue-management/pricing'),
      api.get('/revenue-management/opportunities'),
      api.get('/revenue-management/analytics'),
    ])
      .then(([f, p, o, a]) => {
        setForecast(f.data);
        setPricing(p.data);
        setOpportunities(o.data);
        setAnalytics(a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Predictive Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Forward occupancy, booking pace, pricing recommendations and revenue opportunities</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['ANALYTICS', 'PRICING', 'FORECAST', 'OPPORTUNITIES'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {activeTab === 'ANALYTICS' && analytics && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-slate-500 text-xs font-medium uppercase tracking-wide">14-day forecast</p><p className="text-3xl font-bold text-slate-800 mt-2">{analytics.summary.averageForecastOccupancy}%</p><p className="text-slate-400 text-xs mt-1">Average occupancy on the books</p></div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Future booking value</p><p className="text-3xl font-bold text-emerald-600 mt-2">{analytics.currency} {analytics.summary.projectedBookingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className="text-slate-400 text-xs mt-1">Confirmed arrivals in the next 30 days</p></div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Weekly booking pickup</p><p className={`text-3xl font-bold mt-2 ${analytics.summary.bookingPickup.changePercent >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{analytics.summary.bookingPickup.changePercent >= 0 ? '+' : ''}{analytics.summary.bookingPickup.changePercent}%</p><p className="text-slate-400 text-xs mt-1">{analytics.summary.bookingPickup.currentWeek} bookings this week vs {analytics.summary.bookingPickup.previousWeek}</p></div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Sellable rooms</p><p className="text-3xl font-bold text-slate-800 mt-2">{analytics.summary.totalSellableRooms}</p><p className="text-slate-400 text-xs mt-1">Excludes rooms currently blocked</p></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="mb-4"><h3 className="text-slate-800 font-semibold">Occupancy trend and forecast</h3><p className="text-slate-400 text-xs mt-1">Actual occupancy for the last 14 days followed by the next 14-day forecast.</p></div>
                  <ResponsiveContainer width="100%" height={270}><LineChart data={analytics.occupancyTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={3} /><YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip formatter={(value: any) => [`${value}%`, '']} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="actualOccupancy" name="Actual occupancy" stroke="#4f46e5" strokeWidth={2.5} dot={false} connectNulls /><Line type="monotone" dataKey="forecastOccupancy" name="Forecast occupancy" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls /></LineChart></ResponsiveContainer>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="px-5 py-4 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Predictive alerts</h3><p className="text-slate-400 text-xs mt-1">Signals generated from your reservations and booking pace.</p></div>{analytics.insights.length ? <div className="divide-y divide-slate-100">{analytics.insights.map((insight: any, index: number) => <div key={index} className="px-5 py-4 flex gap-3"><span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${insight.severity === 'HIGH' ? 'bg-rose-500' : insight.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-sky-500'}`} /><div><p className="text-sm font-semibold text-slate-800">{insight.title}</p><p className="text-sm text-slate-500 mt-1">{insight.detail}</p></div></div>)}</div> : <p className="px-5 py-8 text-center text-sm text-slate-400">No predictive alerts at the moment.</p>}</div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'PRICING' && pricing && (
              <div className="space-y-6">
                {/* Current Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Current Occupancy</p>
                    <p className="text-3xl font-bold text-slate-800">{pricing.currentOccupancy}%</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Avg Daily Revenue (7d)</p>
                    <p className="text-3xl font-bold text-green-600">${pricing.avgDailyRevenue}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Demand Level</p>
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold border ${demandColors[pricing.demandLevel]}`}>
                      {pricing.demandLevel}
                    </span>
                  </div>
                </div>

                {/* Pricing Recommendations */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="text-slate-800 font-semibold">Pricing Recommendations</h3>
                    <p className="text-slate-400 text-xs mt-1">Based on current occupancy and demand</p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Room Type</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Current Rate</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Suggested Rate</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Change</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing.recommendations.map((rec: any, i: number) => (
                        <tr key={rec.roomTypeId} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3">
                            <p className="text-slate-800 font-medium text-sm">{rec.roomTypeName}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 text-sm">${rec.currentRate}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold text-sm ${actionColors[rec.action]}`}>
                              ${rec.suggestedRate}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${actionColors[rec.action]}`}>
                              {actionIcons[rec.action]} {rec.action !== 'MAINTAIN' ? `$${rec.adjustment}` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs max-w-xs">{rec.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Forecast Tab */}
            {activeTab === 'FORECAST' && (
              <div className="space-y-6">
                {/* Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-slate-800 font-semibold mb-4">14-Day Occupancy Forecast</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                        formatter={(value: any) => [`${value}%`, 'Occupancy']}
                      />
                      <Bar dataKey="occupancyRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Forecast Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Day</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Occupied</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Occupancy</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Demand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map((day, i) => (
                        <tr key={day.date} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3 text-slate-600 text-sm">{day.date}</td>
                          <td className="px-4 py-3 text-slate-800 font-medium text-sm">{day.dayName}</td>
                          <td className="px-4 py-3 text-right text-slate-700 text-sm">{day.occupiedRooms}</td>
                          <td className="px-4 py-3 text-right text-slate-500 text-sm">{day.totalRooms}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-bold text-sm ${
                                day.occupancyRate >= 80
                                  ? 'text-red-600'
                                  : day.occupancyRate >= 50
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                              }`}
                            >
                              {day.occupancyRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${demandColors[day.demand]}`}>
                              {day.demand}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Opportunities Tab */}
            {activeTab === 'OPPORTUNITIES' && opportunities && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Vacant Rooms</p>
                    <p className="text-3xl font-bold text-orange-500">{opportunities.vacantRooms}</p>
                    <p className="text-slate-400 text-xs">of {opportunities.totalRooms} total</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Upcoming Arrivals</p>
                    <p className="text-3xl font-bold text-blue-600">{opportunities.upcomingArrivals}</p>
                    <p className="text-slate-400 text-xs">next 7 days</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Outstanding</p>
                    <p className="text-3xl font-bold text-red-500">${opportunities.outstandingBalance?.toFixed(2)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Long Stay Guests</p>
                    <p className="text-3xl font-bold text-green-600">{opportunities.longStayGuests}</p>
                  </div>
                </div>

                {/* Opportunities List */}
                <div className="space-y-3">
                  {opportunities.opportunities?.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                      <p className="text-green-700 font-medium">No immediate revenue opportunities detected</p>
                      <p className="text-green-600 text-sm mt-1">Hotel is performing well</p>
                    </div>
                  ) : (
                    opportunities.opportunities?.map((opp: any, i: number) => (
                      <div key={i} className={`border rounded-xl p-5 ${priorityColors[opp.priority]}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${demandColors[opp.priority]}`}>
                                {opp.priority}
                              </span>
                            </div>
                            <p className="text-slate-800 font-semibold">{opp.title}</p>
                            <p className="text-slate-600 text-sm mt-1">{opp.description}</p>
                          </div>
                          {opp.potentialRevenue && (
                            <div className="text-right ml-4">
                              <p className="text-slate-400 text-xs">Potential</p>
                              <p className="text-green-600 font-bold">${opp.potentialRevenue.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
