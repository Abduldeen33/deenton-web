import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesReports() {
  const [activeTab, setActiveTab] = useState('DAILY');
  const [dailyData, setDailyData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [topRooms, setTopRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const [daily, weekly, monthly, rooms] = await Promise.all([
        api.get('/sales-reports/daily', { params: { date: selectedDate } }),
        api.get('/sales-reports/weekly'),
        api.get('/sales-reports/monthly'),
        api.get('/sales-reports/top-rooms'),
      ]);
      setDailyData(daily.data);
      setWeeklyData(weekly.data);
      setMonthlyData(monthly.data);
      setTopRooms(rooms.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedDate]);

  const formatCurrency = (amount: number) => `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const methodLabels: any = {
    CASH: 'Cash',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    ORANGE_MONEY: 'Orange Money',
    AFRIMONEY: 'Afrimoney',
    MOBILE_MONEY: 'Mobile Money',
    COMPLIMENTARY: 'Complimentary',
  };

  const chargeLabels: any = {
    ACCOMMODATION: 'Accommodation',
    RESTAURANT: 'Restaurant',
    LAUNDRY: 'Laundry',
    MINIBAR: 'Minibar',
    SERVICE: 'Service',
    TAX: 'Tax',
    OTHER: 'Other',
  };

  return (
    <Layout>
      <div className="sales-reports-pms min-h-full bg-[#f8f8f6] p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Sales Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Revenue breakdown and sales analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['DAILY', 'WEEKLY', 'MONTHLY'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <>
            {/* Daily Report */}
            {activeTab === 'DAILY' && dailyData && (
              <div className="space-y-6">
                {/* Date Picker */}
                <div className="flex items-center gap-3">
                  <label className="text-slate-600 text-sm font-medium">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(dailyData.summary.totalRevenue)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-slate-800">{dailyData.summary.totalTransactions}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Check-ins</p>
                    <p className="text-2xl font-bold text-blue-600">{dailyData.summary.checkIns}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Check-outs</p>
                    <p className="text-2xl font-bold text-orange-600">{dailyData.summary.checkOuts}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Revenue by Category */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-slate-800 font-semibold mb-4">Revenue by Category</h3>
                    {Object.keys(dailyData.byChargeType).length === 0 ? (
                      <p className="text-slate-400 text-sm">No charges posted today</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(dailyData.byChargeType).map(([type, amount]: any) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">{chargeLabels[type] || type}</span>
                            <span className="text-slate-800 font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Revenue by Payment Method */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-slate-800 font-semibold mb-4">By Payment Method</h3>
                    {Object.keys(dailyData.byMethod).length === 0 ? (
                      <p className="text-slate-400 text-sm">No payments today</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(dailyData.byMethod).map(([method, amount]: any) => (
                          <div key={method} className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">{methodLabels[method] || method}</span>
                            <span className="text-slate-800 font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transactions Table */}
                {dailyData.payments.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="text-slate-800 font-semibold">Transactions</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Guest</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Room</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Res #</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Method</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.payments.map((p: any, i: number) => (
                          <tr key={p.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-4 py-3 text-slate-800 text-sm">{p.guest}</td>
                            <td className="px-4 py-3 text-slate-600 text-sm">{p.room}</td>
                            <td className="px-4 py-3 text-slate-600 text-sm">#{p.resNumber}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{methodLabels[p.method] || p.method}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-800 font-bold text-sm">{formatCurrency(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Weekly Report */}
            {activeTab === 'WEEKLY' && weeklyData && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-slate-800 font-semibold">Week of {weeklyData.weekStart}</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(weeklyData.totalRevenue)}</p>
                  </div>
                  {weeklyData.bestDay && (
                    <p className="text-slate-500 text-sm">Best day: <span className="text-slate-700 font-medium">{weeklyData.bestDay.dayName} — {formatCurrency(weeklyData.bestDay.revenue)}</span></p>
                  )}
                </div>

                {/* Weekly Bar Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-slate-800 font-semibold mb-4">Daily Revenue This Week</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="dayName" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}
                        formatter={(value: any) => [`$${value}`, 'Revenue']}
                      />
                      <Bar dataKey="revenue" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="accommodation" name="Accommodation" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="restaurant" name="Restaurant" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Day</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Accommodation</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Restaurant</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.dailyData.map((day: any, i: number) => (
                        <tr key={day.date} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3 text-slate-800 font-medium text-sm">{day.dayName}</td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{day.date}</td>
                          <td className="px-4 py-3 text-right text-slate-700 text-sm">{formatCurrency(day.accommodation)}</td>
                          <td className="px-4 py-3 text-right text-slate-700 text-sm">{formatCurrency(day.restaurant)}</td>
                          <td className="px-4 py-3 text-right text-slate-800 font-bold text-sm">{formatCurrency(day.revenue)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 text-sm">{day.transactions}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan={4} className="px-4 py-3 text-blue-800 font-bold text-sm">Weekly Total</td>
                        <td className="px-4 py-3 text-right text-blue-800 font-bold">{formatCurrency(weeklyData.totalRevenue)}</td>
                        <td className="px-4 py-3 text-right text-blue-700 text-sm">
                          {weeklyData.dailyData.reduce((s: number, d: any) => s + d.transactions, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Monthly Report */}
            {activeTab === 'MONTHLY' && monthlyData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.summary.totalRevenue)}</p>
                    <p className="text-slate-400 text-xs mt-1">{monthlyData.month}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">RevPAR</p>
                    <p className="text-2xl font-bold text-blue-600">${monthlyData.summary.revpar}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">ADR</p>
                    <p className="text-2xl font-bold text-slate-800">${monthlyData.summary.adr}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Completed Stays</p>
                    <p className="text-2xl font-bold text-orange-600">{monthlyData.summary.completedStays}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-slate-800 font-semibold mb-4">Revenue by Category</h3>
                    {Object.keys(monthlyData.byChargeType).length === 0 ? (
                      <p className="text-slate-400 text-sm">No data this month</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(monthlyData.byChargeType).map(([type, amount]: any) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">{chargeLabels[type] || type}</span>
                            <span className="text-slate-800 font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-slate-800 font-semibold mb-4">By Payment Method</h3>
                    {Object.keys(monthlyData.byMethod).length === 0 ? (
                      <p className="text-slate-400 text-sm">No payments this month</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(monthlyData.byMethod).map(([method, amount]: any) => (
                          <div key={method} className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">{methodLabels[method] || method}</span>
                            <span className="text-slate-800 font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Rooms */}
                {topRooms.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100">
                      <h3 className="text-slate-800 font-semibold">Top Performing Room Types</h3>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Room Type</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stays</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Base Rate</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topRooms.map((room, i) => (
                          <tr key={room.name} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-4 py-3 text-slate-800 font-medium text-sm">{room.name}</td>
                            <td className="px-4 py-3 text-right text-slate-600 text-sm">{room.stays}</td>
                            <td className="px-4 py-3 text-right text-slate-600 text-sm">${room.baseRate}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-bold text-sm">{formatCurrency(room.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
