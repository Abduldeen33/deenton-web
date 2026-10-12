import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function ChannelManager() {
  const [stats, setStats] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('deenton_token');
    try {
      if (!token) throw new Error('Please sign in again to view channel data.');
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.propertyId) throw new Error('Your user account is not linked to a property.');
      const id = payload.propertyId as string;
      setPropertyId(id);
      Promise.all([
        api.get(`/channel-manager/${id}/stats`),
        api.get(`/channel-manager/${id}/availability-summary`, { params: { days: 14 } }),
      ])
        .then(([s, a]) => {
          setStats(s.data);
          setAvailability(a.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Channel Manager</h2>
          <p className="text-slate-500 text-sm mt-1">Manage distribution channels and availability</p>
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <div className="space-y-6">
            {/* Booking Source Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Total Reservations</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Direct Bookings</p>
                  <p className="text-3xl font-bold text-green-600">{stats.direct}</p>
                  <p className="text-slate-400 text-xs">{stats.directPercentage}% of total</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Other Channels</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.ota}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Direct Revenue</p>
                  <p className="text-3xl font-bold text-green-600">${stats.directRevenue?.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* iCal Export */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-2">Reservation Calendar Feed</h3>
              <p className="text-slate-500 text-sm mb-4">Copy this iCal feed URL into a channel that supports calendar subscriptions. This exports reservations; it does not import OTA bookings or synchronize rates.</p>
              <div className="flex gap-3">
                <input
                  value={propertyId ? `${window.location.origin}/api/channel-manager/${propertyId}/ical` : ''}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/channel-manager/${propertyId}/ical`);
                    alert('iCal URL copied!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                  Copy URL
                </button>
                <a href={`/api/channel-manager/${propertyId}/ical`} download="anzak-cloud-calendar.ics"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg">
                  Download
                </a>
              </div>
            </div>

            {/* Availability Grid */}
            {availability && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-slate-800 font-semibold">14-Day Availability</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Available</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Booked</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.availability?.map((day: any, i: number) => (
                      <tr key={day.date} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 text-slate-700 text-sm">{day.date}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-bold text-sm">{day.availableRooms}</td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">{day.bookedRooms}</td>
                        <td className="px-4 py-3 text-right text-slate-500 text-sm">{day.totalRooms}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-sm ${
                            day.occupancyRate >= 80 ? 'text-red-600' :
                            day.occupancyRate >= 50 ? 'text-yellow-600' : 'text-green-600'
                          }`}>{day.occupancyRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Room Type Availability */}
            {availability?.byRoomType && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-slate-800 font-semibold">Current Availability by Room Type</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Room Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Base Rate</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Booked</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.byRoomType.map((rt: any, i: number) => (
                      <tr key={rt.roomTypeId} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 text-slate-800 font-medium text-sm">{rt.name}</td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">${rt.baseRate}</td>
                        <td className="px-4 py-3 text-right text-slate-500 text-sm">{rt.total}</td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">{rt.booked}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-sm ${rt.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {rt.available}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
