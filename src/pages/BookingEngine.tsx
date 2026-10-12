import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import BrandLogo from '../components/BrandLogo';

export default function BookingEngine() {
  const { propertyCode: routePropertyCode } = useParams<{ propertyCode: string }>();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'SEARCH' | 'ROOMS' | 'DETAILS' | 'CONFIRM'>('SEARCH');
  const propertyCode = routePropertyCode || searchParams.get('propertyCode') || 'MOZZA';
  const [searchForm, setSearchForm] = useState({
    arrivalDate: '', departureDate: '', adults: '2', children: '0',
  });
  const [availability, setAvailability] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [guestForm, setGuestForm] = useState({
    guestFirstName: '', guestLastName: '', guestEmail: '',
    guestPhone: '', guestNationality: '', mealPlan: 'BED_BREAKFAST',
  });
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/booking-engine/${propertyCode}/availability`, {
        params: { ...searchForm },
      });
      setAvailability(res.data);
      setStep('ROOMS');
    } catch (err: any) {
      setError(err.response?.data?.message || 'No rooms available');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/booking-engine/${propertyCode}/direct-booking`, {
        ...guestForm,
        roomTypeId: selectedRoom.roomTypeId,
        arrivalDate: searchForm.arrivalDate,
        departureDate: searchForm.departureDate,
        adults: parseInt(searchForm.adults),
        children: parseInt(searchForm.children),
      });
      setBooking(res.data);
      setStep('CONFIRM');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo compact className="h-9 w-14 shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-slate-800">Anzak Cloud</h1>
              <p className="text-slate-400 text-xs">Direct Booking</p>
            </div>
          </div>
          {availability && (
            <p className="text-slate-600 text-sm font-medium">{availability.propertyName}</p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['SEARCH', 'ROOMS', 'DETAILS', 'CONFIRM'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-blue-600 text-white' :
                ['SEARCH', 'ROOMS', 'DETAILS', 'CONFIRM'].indexOf(step) > i
                  ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{i + 1}</div>
              <span className={`text-sm ${step === s ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {s === 'SEARCH' ? 'Dates' : s === 'ROOMS' ? 'Rooms' : s === 'DETAILS' ? 'Details' : 'Confirmed'}
              </span>
              {i < 3 && <div className="w-8 h-px bg-slate-300" />}
            </div>
          ))}
        </div>

        {/* Step 1 - Search */}
        {step === 'SEARCH' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Book Your Stay</h2>
              <p className="text-slate-500 text-sm mt-2">No hidden fees. Best rate guaranteed.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Check-in *</label>
                    <input required type="date" value={searchForm.arrivalDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSearchForm({ ...searchForm, arrivalDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Check-out *</label>
                    <input required type="date" value={searchForm.departureDate}
                      min={searchForm.arrivalDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSearchForm({ ...searchForm, departureDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Adults</label>
                    <select value={searchForm.adults} onChange={(e) => setSearchForm({ ...searchForm, adults: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400">
                      {[1,2,3,4].map(n => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Children</label>
                    <select value={searchForm.children} onChange={(e) => setSearchForm({ ...searchForm, children: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400">
                      {[0,1,2,3].map(n => <option key={n} value={n}>{n} Child{n !== 1 ? 'ren' : ''}</option>)}
                    </select>
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors">
                  {loading ? 'Searching...' : 'Search Available Rooms'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 2 - Rooms */}
        {step === 'ROOMS' && availability && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-slate-800 font-semibold">{availability.propertyName}</p>
                <p className="text-slate-500 text-sm">{formatDate(searchForm.arrivalDate)} → {formatDate(searchForm.departureDate)} · {availability.nights} nights · {searchForm.adults} adults</p>
              </div>
              <button onClick={() => setStep('SEARCH')} className="text-blue-600 text-sm hover:underline">Change dates</button>
            </div>

            {availability.availableRoomTypes.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <p className="text-slate-500">No rooms available for selected dates</p>
                <button onClick={() => setStep('SEARCH')} className="mt-4 text-blue-600 text-sm hover:underline">Try different dates</button>
              </div>
            ) : (
              availability.availableRoomTypes.map((room: any) => (
                <div key={room.roomTypeId} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-slate-800 font-bold text-lg">{room.name}</h3>
                      {room.viewType && <p className="text-slate-500 text-sm">{room.viewType}</p>}
                      {room.description && <p className="text-slate-400 text-sm mt-1">{room.description}</p>}
                      <div className="flex gap-4 mt-3">
                        <span className="text-slate-500 text-sm">👤 Max {room.maxOccupancyAdults} adults</span>
                        <span className="text-slate-500 text-sm">🛏️ {room.availableCount} available</span>
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-slate-400 text-xs">per night</p>
                      <p className="text-2xl font-bold text-slate-800">${room.baseRate}</p>
                      <p className="text-slate-500 text-sm">${room.totalForStay} total</p>
                      <button
                        onClick={() => { setSelectedRoom(room); setStep('DETAILS'); }}
                        className="mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Step 3 - Guest Details */}
        {step === 'DETAILS' && selectedRoom && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-blue-800 font-semibold">{selectedRoom.name}</h3>
              <p className="text-blue-600 text-sm">{availability.nights} nights · ${selectedRoom.totalForStay} total</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <h3 className="text-slate-800 font-bold text-lg mb-6">Your Details</h3>
              <form onSubmit={handleBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">First Name *</label>
                    <input required value={guestForm.guestFirstName} onChange={(e) => setGuestForm({ ...guestForm, guestFirstName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                    <input required value={guestForm.guestLastName} onChange={(e) => setGuestForm({ ...guestForm, guestLastName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email *</label>
                  <input required type="email" value={guestForm.guestEmail} onChange={(e) => setGuestForm({ ...guestForm, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone *</label>
                  <input required value={guestForm.guestPhone} onChange={(e) => setGuestForm({ ...guestForm, guestPhone: e.target.value })}
                    placeholder="+232 XX XXX XXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
                  <input value={guestForm.guestNationality} onChange={(e) => setGuestForm({ ...guestForm, guestNationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Meal Plan</label>
                  <select value={guestForm.mealPlan} onChange={(e) => setGuestForm({ ...guestForm, mealPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                    <option value="BED_BREAKFAST">Bed & Breakfast</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="FULL_BOARD">Full Board</option>
                    <option value="ROOM_ONLY">Room Only</option>
                  </select>
                </div>

                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('ROOMS')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm">Back</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
                    {loading ? 'Booking...' : `Confirm Booking — $${selectedRoom.totalForStay}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Step 4 - Confirmation */}
        {step === 'CONFIRM' && booking && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed!</h2>
              <p className="text-slate-500 mb-6">A confirmation has been sent to your email</p>

              <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Reservation Number</span>
                  <span className="text-slate-800 font-bold">#{booking.resNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Guest</span>
                  <span className="text-slate-800 font-medium">{booking.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Room</span>
                  <span className="text-slate-800 font-medium">{booking.roomNumber} — {booking.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Check-in</span>
                  <span className="text-slate-800 font-medium">{formatDate(booking.arrivalDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Check-out</span>
                  <span className="text-slate-800 font-medium">{formatDate(booking.departureDate)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-700 font-semibold">Total</span>
                  <span className="text-blue-600 font-bold text-lg">${booking.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <a href={`/my-reservation?resNumber=${booking.resNumber}&lastName=${booking.guestName.split(' ').slice(-1)[0]}`}
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors mb-3">
                View My Reservation
              </a>
              <button onClick={() => { setStep('SEARCH'); setBooking(null); setSelectedRoom(null); }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm">
                Make Another Booking
              </button>
            </div>
            <p className="text-center text-slate-400 text-xs mt-4">Powered by Anzak Cloud</p>
          </div>
        )}
      </main>
    </div>
  );
}
