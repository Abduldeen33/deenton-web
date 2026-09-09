import { useEffect, useState } from 'react';
import { getReservations, checkIn, checkOut, createReservation } from '../api/reservations';
import { getRooms } from '../api/rooms';
import Layout from '../components/Layout';

const statusConfig: any = {
  RESERVED: { label: 'Confirmed Reservation', color: 'bg-green-100 text-green-700 border border-green-200' },
  ARRIVED: { label: 'Arrived', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  STAYOVER: { label: 'Stayover', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  DUE_OUT: { label: 'Due Out', color: 'bg-orange-100 text-orange-700 border border-orange-200' },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-slate-100 text-slate-600 border border-slate-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border border-red-200' },
  NO_SHOW: { label: 'No Show', color: 'bg-red-100 text-red-700 border border-red-200' },
};

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    guestFirstName: '', guestLastName: '', guestPhone: '',
    guestNationality: '', guestIdType: '', guestIdNumber: '',
    roomId: '', roomTypeId: '', arrivalDate: '', departureDate: '',
    adults: 1, children: 0, mealPlan: 'BED_BREAKFAST',
    reservationType: 'REGULAR', notes: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([getReservations(), getRooms()])
      .then(([res, rms]) => {
        setReservations(res);
        setRooms(rms.filter((r: any) => r.status === 'VACANT'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tabs = [
    { key: 'ALL', label: 'Reservations', count: reservations.length },
    {
      key: 'ARRIVALS', label: 'Arrivals',
      count: reservations.filter(r => {
        const arr = new Date(r.arrivalDate);
        arr.setHours(0,0,0,0);
        return arr.getTime() === today.getTime() && ['RESERVED','ARRIVED'].includes(r.status);
      }).length
    },
    {
      key: 'DEPARTURES', label: 'Departures',
      count: reservations.filter(r => {
        const dep = new Date(r.departureDate);
        dep.setHours(0,0,0,0);
        return dep.getTime() === today.getTime() && ['ARRIVED','STAYOVER','DUE_OUT'].includes(r.status);
      }).length
    },
    {
      key: 'IN_HOUSE', label: 'In-house',
      count: reservations.filter(r => ['ARRIVED','STAYOVER'].includes(r.status)).length
    },
  ];

  const filtered = reservations.filter(r => {
    const matchSearch = search === '' ||
      `${r.guest?.firstName} ${r.guest?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      r.resNumber?.includes(search);

    if (!matchSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_HOUSE') return ['ARRIVED','STAYOVER'].includes(r.status);
    if (activeTab === 'ARRIVALS') {
      const arr = new Date(r.arrivalDate);
      arr.setHours(0,0,0,0);
      return arr.getTime() === today.getTime() && ['RESERVED','ARRIVED'].includes(r.status);
    }
    if (activeTab === 'DEPARTURES') {
      const dep = new Date(r.departureDate);
      dep.setHours(0,0,0,0);
      return dep.getTime() === today.getTime() && ['ARRIVED','STAYOVER','DUE_OUT'].includes(r.status);
    }
    return true;
  });

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    try { await checkIn(id); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Check-in failed'); }
    finally { setActionLoading(null); }
  };

  const handleCheckOut = async (id: string) => {
    setActionLoading(id);
    try { await checkOut(id); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Check-out failed'); }
    finally { setActionLoading(null); }
  };

  const handleRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setForm({ ...form, roomId, roomTypeId: room?.roomTypeId ?? '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await createReservation(form);
      setShowForm(false);
      setForm({
        guestFirstName: '', guestLastName: '', guestPhone: '',
        guestNationality: '', guestIdType: '', guestIdNumber: '',
        roomId: '', roomTypeId: '', arrivalDate: '', departureDate: '',
        adults: 1, children: 0, mealPlan: 'BED_BREAKFAST',
        reservationType: 'REGULAR', notes: '',
      });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${
                      activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reservations, guests..."
                className="w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400"
              />

              {/* Action Buttons */}
              <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                🖨️ Print GR
              </button>
              <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                📤 Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + New Reservation
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Guest Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Res No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Arrival</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Departure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Details</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total ($)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid ($)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">No reservations found</td>
                  </tr>
                ) : (
                  filtered.map((res, index) => (
                    <tr key={res.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-slate-800 font-medium text-sm">
                            {res.guest?.title} {res.guest?.firstName} {res.guest?.lastName}
                          </p>
                          <p className="text-slate-400 text-xs">
                            👤 {res.adults} 👶 {res.children}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800 text-sm font-medium">{res.resNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-sm">{formatDateTime(res.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-sm">{formatDate(res.arrivalDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-sm">{formatDate(res.departureDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800 text-sm">{res.room?.roomNumber} — {res.room?.roomType?.name}</p>
                        <p className="text-slate-400 text-xs">{res.mealPlan?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig[res.status]?.color}`}>
                          {statusConfig[res.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-slate-800 text-sm font-medium">{Number(res.totalAmount).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-slate-800 text-sm font-medium">{Number(res.paidAmount).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {res.status === 'RESERVED' && (
                            <button
                              onClick={() => handleCheckIn(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check In'}
                            </button>
                          )}
                          {['ARRIVED','STAYOVER','DUE_OUT'].includes(res.status) && (
                            <button
                              onClick={() => handleCheckOut(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check Out'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Reservation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">New Reservation</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">First Name *</label>
                  <input required value={form.guestFirstName} onChange={(e) => setForm({ ...form, guestFirstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                  <input required value={form.guestLastName} onChange={(e) => setForm({ ...form, guestLastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                  <input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
                  <input value={form.guestNationality} onChange={(e) => setForm({ ...form, guestNationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Room *</label>
                <select required value={form.roomId} onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Select vacant room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.roomNumber} — {room.roomType?.name} (${room.roomType?.baseRate}/night)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Arrival Date *</label>
                  <input required type="date" value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Departure Date *</label>
                  <input required type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Adults</label>
                  <input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Children</label>
                  <input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Meal Plan</label>
                  <select value={form.mealPlan} onChange={(e) => setForm({ ...form, mealPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                    <option value="BED_BREAKFAST">Bed & Breakfast</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="FULL_BOARD">Full Board</option>
                    <option value="ROOM_ONLY">Room Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Reservation Type</label>
                <select value={form.reservationType} onChange={(e) => setForm({ ...form, reservationType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                  <option value="REGULAR">Regular</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
                  {formLoading ? 'Creating...' : 'Create Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}