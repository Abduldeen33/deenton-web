import { useEffect, useState } from 'react';
import { getReservations, checkIn, checkOut, createReservation } from '../api/reservations';
import { getRooms, getRoomTypes } from '../api/rooms';
import Layout from '../components/Layout';

const statusColors: any = {
  RESERVED: 'bg-blue-900 text-blue-300 border-blue-700',
  ARRIVED: 'bg-green-900 text-green-300 border-green-700',
  STAYOVER: 'bg-green-900 text-green-300 border-green-700',
  DUE_OUT: 'bg-orange-900 text-orange-300 border-orange-700',
  CHECKED_OUT: 'bg-slate-700 text-slate-400 border-slate-600',
  CANCELLED: 'bg-red-900 text-red-300 border-red-700',
  NO_SHOW: 'bg-red-900 text-red-300 border-red-700',
};

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    guestFirstName: '',
    guestLastName: '',
    guestPhone: '',
    guestNationality: '',
    guestIdType: '',
    guestIdNumber: '',
    roomId: '',
    roomTypeId: '',
    arrivalDate: '',
    departureDate: '',
    adults: 1,
    children: 0,
    mealPlan: 'BED_BREAKFAST',
    reservationType: 'REGULAR',
    notes: '',
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

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    try {
      await checkIn(id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (id: string) => {
    setActionLoading(id);
    try {
      await checkOut(id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'ALL'
    ? reservations
    : reservations.filter((r) => r.status === filter);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Reservations</h2>
            <p className="text-slate-400 text-sm mt-1">{reservations.length} total reservations</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Reservation
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['ALL', 'RESERVED', 'ARRIVED', 'STAYOVER', 'DUE_OUT', 'CHECKED_OUT'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Loading reservations...</p>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No reservations found</p>
            ) : (
              filtered.map((res) => (
                <div key={res.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-bold text-lg">#{res.resNumber}</span>
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${statusColors[res.status]}`}>
                          {res.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-white font-medium">
                        {res.guest?.title} {res.guest?.firstName} {res.guest?.lastName}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <p className="text-slate-400 text-xs">Room</p>
                          <p className="text-white text-sm font-medium">
                            {res.room?.roomNumber} — {res.room?.roomType?.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Arrival</p>
                          <p className="text-white text-sm">{formatDate(res.arrivalDate)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Departure</p>
                          <p className="text-white text-sm">{formatDate(res.departureDate)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Balance</p>
                          <p className={`text-sm font-bold ${res.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ${res.balance}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {res.status === 'RESERVED' && (
                        <button
                          onClick={() => handleCheckIn(res.id)}
                          disabled={actionLoading === res.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          {actionLoading === res.id ? 'Processing...' : 'Check In'}
                        </button>
                      )}
                      {['ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(res.status) && (
                        <button
                          onClick={() => handleCheckOut(res.id)}
                          disabled={actionLoading === res.id}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          {actionLoading === res.id ? 'Processing...' : 'Check Out'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Reservation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">New Reservation</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input
                    required
                    value={form.guestFirstName}
                    onChange={(e) => setForm({ ...form, guestFirstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input
                    required
                    value={form.guestLastName}
                    onChange={(e) => setForm({ ...form, guestLastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone</label>
                  <input
                    value={form.guestPhone}
                    onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nationality</label>
                  <input
                    value={form.guestNationality}
                    onChange={(e) => setForm({ ...form, guestNationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                  <select
                    value={form.guestIdType}
                    onChange={(e) => setForm({ ...form, guestIdType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Passport">Passport</option>
                    <option value="National ID">National ID</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                  <input
                    value={form.guestIdNumber}
                    onChange={(e) => setForm({ ...form, guestIdNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Room *</label>
                <select
                  required
                  value={form.roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select vacant room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber} — {room.roomType?.name} (${room.roomType?.baseRate}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Arrival Date *</label>
                  <input
                    required
                    type="date"
                    value={form.arrivalDate}
                    onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Departure Date *</label>
                  <input
                    required
                    type="date"
                    value={form.departureDate}
                    onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Adults</label>
                  <input
                    type="number"
                    min={1}
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Children</label>
                  <input
                    type="number"
                    min={0}
                    value={form.children}
                    onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Meal Plan</label>
                  <select
                    value={form.mealPlan}
                    onChange={(e) => setForm({ ...form, mealPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="BED_BREAKFAST">Bed & Breakfast</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="FULL_BOARD">Full Board</option>
                    <option value="ROOM_ONLY">Room Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Reservation Type</label>
                <select
                  value={form.reservationType}
                  onChange={(e) => setForm({ ...form, reservationType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="REGULAR">Regular</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg text-sm transition-colors"
                >
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