import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Guests() {
  const [guests, setGuests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const load = (q?: string) => {
    setLoading(true);
    api.get('/guests', { params: q ? { search: q } : {} })
      .then((res) => setGuests(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const openGuest = async (id: string) => {
    const res = await api.get(`/guests/${id}`);
    setSelected(res.data);
    setEditForm({
      title: res.data.title || '',
      email: res.data.email || '',
      phone: res.data.phone || '',
      nationality: res.data.nationality || '',
      idType: res.data.idType || '',
      idNumber: res.data.idNumber || '',
      address: res.data.address || '',
      notes: res.data.notes || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.patch(`/guests/${selected.id}`, editForm);
    setEditing(false);
    openGuest(selected.id);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusColors: any = {
    RESERVED: 'text-blue-400',
    ARRIVED: 'text-green-400',
    STAYOVER: 'text-green-400',
    CHECKED_OUT: 'text-slate-400',
    CANCELLED: 'text-red-400',
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Guest Profiles</h2>
          <p className="text-slate-400 text-sm mt-1">{guests.length} guests in database</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or ID..."
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); load(); }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guests.length === 0 ? (
              <p className="text-slate-400 col-span-3 text-center py-12">No guests found</p>
            ) : (
              guests.map((guest) => (
                <div
                  key={guest.id}
                  onClick={() => openGuest(guest.id)}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {guest.firstName?.[0]}{guest.lastName?.[0]}
                    </div>
                    <span className="text-slate-500 text-xs">{guest._count?.reservations} stays</span>
                  </div>
                  <p className="text-white font-semibold">
                    {guest.title} {guest.firstName} {guest.lastName}
                  </p>
                  {guest.nationality && <p className="text-slate-400 text-sm">{guest.nationality}</p>}
                  {guest.phone && <p className="text-slate-400 text-sm">{guest.phone}</p>}
                  {guest.email && <p className="text-slate-400 text-sm truncate">{guest.email}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Guest Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selected.title} {selected.firstName} {selected.lastName}
                </h3>
                <p className="text-slate-400 text-sm">{selected.nationality}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                >
                  {editing ? 'Cancel Edit' : 'Edit'}
                </button>
                <button
                  onClick={() => { setSelected(null); setEditing(false); }}
                  className="text-slate-400 hover:text-white text-xl px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Title</label>
                      <select
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      >
                        <option value="">None</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Nationality</label>
                      <input
                        value={editForm.nationality}
                        onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Phone</label>
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">ID Type</label>
                      <select
                        value={editForm.idType}
                        onChange={(e) => setEditForm({ ...editForm, idType: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
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
                        value={editForm.idNumber}
                        onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Address</label>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">
                    Save Changes
                  </button>
                </form>
              ) : (
                <>
                  {/* Guest Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">${selected.totalSpend?.toLocaleString()}</p>
                      <p className="text-slate-400 text-sm">Total Spend</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{selected.totalStays}</p>
                      <p className="text-slate-400 text-sm">Completed Stays</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                    {selected.phone && (
                      <div><p className="text-slate-400">Phone</p><p className="text-white">{selected.phone}</p></div>
                    )}
                    {selected.email && (
                      <div><p className="text-slate-400">Email</p><p className="text-white">{selected.email}</p></div>
                    )}
                    {selected.idType && (
                      <div><p className="text-slate-400">ID Type</p><p className="text-white">{selected.idType}</p></div>
                    )}
                    {selected.idNumber && (
                      <div><p className="text-slate-400">ID Number</p><p className="text-white">{selected.idNumber}</p></div>
                    )}
                    {selected.address && (
                      <div className="col-span-2"><p className="text-slate-400">Address</p><p className="text-white">{selected.address}</p></div>
                    )}
                    {selected.notes && (
                      <div className="col-span-2"><p className="text-slate-400">Notes</p><p className="text-white">{selected.notes}</p></div>
                    )}
                  </div>

                  {/* Stay History */}
                  <h4 className="text-white font-semibold mb-3">Stay History</h4>
                  {selected.reservations?.length === 0 ? (
                    <p className="text-slate-400 text-sm">No stays recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.reservations?.map((res: any) => (
                        <div key={res.id} className="bg-slate-700 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white text-sm font-medium">
                                #{res.resNumber} — Room {res.room?.roomNumber}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {formatDate(res.arrivalDate)} → {formatDate(res.departureDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-medium ${statusColors[res.status] || 'text-slate-400'}`}>
                                {res.status}
                              </p>
                              <p className="text-white text-sm font-bold">${res.totalAmount}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}