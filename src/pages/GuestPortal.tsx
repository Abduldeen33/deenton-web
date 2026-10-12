import { useState } from 'react';
import api from '../api/client';
import BrandLogo from '../components/BrandLogo';

const statusConfig: any = {
  RESERVED: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200' },
  ARRIVED: { label: 'Checked In', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  STAYOVER: { label: 'In House', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  DUE_OUT: { label: 'Due Out', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
};

const chargeTypeColors: any = {
  ACCOMMODATION: 'text-blue-600',
  RESTAURANT: 'text-orange-600',
  LAUNDRY: 'text-cyan-600',
  MINIBAR: 'text-purple-600',
  SERVICE: 'text-yellow-600',
  TAX: 'text-red-600',
  OTHER: 'text-slate-500',
};

export default function GuestPortal() {
  const [form, setForm] = useState({ resNumber: '', lastName: '' });
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReservation(null);

    try {
      const res = await api.get('/guest-portal/reservation', {
        params: { resNumber: form.resNumber, lastName: form.lastName },
      });
      setReservation(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reservation not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });

  const formatTime = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo compact className="h-9 w-14 shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-slate-800">Anzak Cloud</h1>
              <p className="text-slate-400 text-xs">Guest Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {!reservation ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">View Your Reservation</h2>
                <p className="text-slate-500 text-sm mt-2">Enter your reservation number and last name to view your booking details</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Reservation Number *</label>
                    <input
                      required
                      value={form.resNumber}
                      onChange={(e) => setForm({ ...form, resNumber: e.target.value })}
                      placeholder="e.g. 4205"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                    <input
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Your last name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
                  >
                    {loading ? 'Searching...' : 'Find My Reservation'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Property Header */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{reservation.property?.name}</h2>
                  <p className="opacity-80 text-sm mt-1">{reservation.property?.city}, {reservation.property?.country}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${statusConfig[reservation.status]?.color}`}>
                  {statusConfig[reservation.status]?.label}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="opacity-70 text-sm">Reservation</p>
                <p className="text-3xl font-bold">#{reservation.resNumber}</p>
              </div>
            </div>

            {/* Guest and Room Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-semibold mb-4">Guest</h3>
                <p className="text-slate-800 font-medium text-lg">
                  {reservation.guest?.title} {reservation.guest?.firstName} {reservation.guest?.lastName}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {reservation.adults} Adult{reservation.adults > 1 ? 's' : ''}
                  {reservation.children > 0 && `, ${reservation.children} Child${reservation.children > 1 ? 'ren' : ''}`}
                </p>
                <p className="text-slate-500 text-sm">{reservation.mealPlan?.replace('_', ' ')}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <h3 className="text-slate-800 font-semibold mb-4">Room</h3>
                <p className="text-slate-800 font-medium text-lg">Room {reservation.room?.roomNumber}</p>
                <p className="text-slate-500 text-sm mt-1">{reservation.room?.roomType}</p>
                {reservation.room?.viewType && (
                  <p className="text-slate-500 text-sm">{reservation.room?.viewType}</p>
                )}
              </div>
            </div>

            {/* Check-in / Check-out */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-4">Stay Dates</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-500 text-sm mb-1">Check-in</p>
                  <p className="text-slate-800 font-medium">{formatDate(reservation.arrivalDate)}</p>
                  <p className="text-blue-600 text-sm mt-1">From {reservation.property?.checkInTime}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm mb-1">Check-out</p>
                  <p className="text-slate-800 font-medium">{formatDate(reservation.departureDate)}</p>
                  <p className="text-orange-600 text-sm mt-1">By {reservation.property?.checkOutTime}</p>
                </div>
              </div>
            </div>

            {/* Billing */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-slate-800 font-semibold">Billing</h3>
                <div className="text-right">
                  <p className="text-slate-500 text-xs">Balance Due</p>
                  <p className={`text-xl font-bold ${reservation.billing?.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ${reservation.billing?.balance?.toFixed(2)}
                  </p>
                </div>
              </div>

              {reservation.billing?.charges?.length > 0 && (
                <div className="p-5 border-b border-slate-100">
                  <p className="text-slate-500 text-sm font-medium mb-3">Charges</p>
                  <div className="space-y-2">
                    {reservation.billing.charges.map((charge: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <p className="text-slate-700 text-sm">{charge.description}</p>
                          <p className={`text-xs ${chargeTypeColors[charge.chargeType]}`}>{charge.chargeType}</p>
                        </div>
                        <p className="text-slate-800 font-medium text-sm">${charge.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
                    <span className="text-slate-600 font-medium text-sm">Total Charges</span>
                    <span className="text-slate-800 font-bold">${reservation.billing?.totalCharges?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {reservation.billing?.payments?.length > 0 && (
                <div className="p-5">
                  <p className="text-slate-500 text-sm font-medium mb-3">Payments</p>
                  <div className="space-y-2">
                    {reservation.billing.payments.map((payment: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <p className="text-slate-700 text-sm">{payment.method.replace('_', ' ')}</p>
                          <p className="text-slate-400 text-xs">{formatTime(payment.date)}</p>
                          {payment.reference && <p className="text-slate-400 text-xs">Ref: {payment.reference}</p>}
                        </div>
                        <p className="text-green-600 font-medium text-sm">${payment.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
                    <span className="text-slate-600 font-medium text-sm">Total Paid</span>
                    <span className="text-green-600 font-bold">${reservation.billing?.totalPaid?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setReservation(null); setForm({ resNumber: '', lastName: '' }); }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
            >
              Search Another Reservation
            </button>

            <p className="text-center text-slate-400 text-xs">
              Powered by Anzak Cloud
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
