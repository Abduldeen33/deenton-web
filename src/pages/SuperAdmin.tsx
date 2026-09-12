import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getUser, clearAuth } from '../store/auth';

export default function SuperAdmin() {
  const [stats, setStats] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedStats, setSelectedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [form, setForm] = useState({
    propertyCode: '', name: '', address: '', city: '', country: 'Sierra Leone',
    currency: 'USD', timezone: 'Africa/Freetown', checkInTime: '14:00',
    checkOutTime: '10:00', subscriptionPlan: 'BASIC',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: 'admin123',
  });
  const navigate = useNavigate();
  const user = getUser();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/super-admin/stats'),
      api.get('/super-admin/properties'),
    ])
      .then(([s, p]) => { setStats(s.data); setProperties(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openProperty = async (property: any) => {
    setSelected(property);
    const res = await api.get(`/super-admin/properties/${property.id}`);
    setSelectedStats(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/properties', form);
      setShowForm(false);
      setForm({
        propertyCode: '', name: '', address: '', city: '', country: 'Sierra Leone',
        currency: 'USD', timezone: 'Africa/Freetown', checkInTime: '14:00',
        checkOutTime: '10:00', subscriptionPlan: 'BASIC',
        adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: 'admin123',
      });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create property');
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/super-admin/properties/${id}/toggle`);
    load();
    if (selected?.id === id) setSelected(null);
  };

  const handleUpdateSubscription = async (id: string, plan: string) => {
    await api.patch(`/super-admin/properties/${id}/subscription`, { plan });
    load();
    openProperty(selected);
  };

  const planColors: any = {
    BASIC: 'bg-slate-100 text-slate-600',
    STANDARD: 'bg-blue-100 text-blue-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Deenton</h1>
              <p className="text-slate-400 text-xs">Super Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.firstName} {user?.lastName}</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">SUPER ADMIN</span>
            <button
              onClick={() => { clearAuth(); navigate('/login'); }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {['OVERVIEW', 'PROPERTIES'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Total Hotels</p>
                    <p className="text-3xl font-bold text-slate-800">{stats?.totalProperties ?? 0}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Active Hotels</p>
                    <p className="text-3xl font-bold text-green-600">{stats?.activeProperties ?? 0}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Total Guests</p>
                    <p className="text-3xl font-bold text-blue-600">{stats?.totalGuests ?? 0}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-slate-500 text-sm mb-1">Platform Revenue</p>
                    <p className="text-3xl font-bold text-green-600">${stats?.totalRevenue?.toLocaleString() ?? 0}</p>
                  </div>
                </div>

                {/* Properties by Plan */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-slate-800 font-semibold mb-4">Hotels by Subscription Plan</h3>
                  <div className="flex gap-4">
                    {stats?.propertiesByPlan?.map((plan: any) => (
                      <div key={plan.subscriptionPlan} className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${planColors[plan.subscriptionPlan]}`}>
                          {plan.subscriptionPlan}
                        </span>
                        <span className="text-slate-800 font-bold">{plan._count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Properties Summary */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-slate-800 font-semibold">All Hotels</h3>
                    <button onClick={() => setActiveTab('PROPERTIES')}
                      className="text-blue-600 text-sm hover:underline">View all →</button>
                  </div>
                  {properties.slice(0, 5).map((prop, i) => (
                    <div key={prop.id} className={`flex justify-between items-center p-4 ${i < Math.min(properties.length, 5) - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div>
                        <p className="text-slate-800 font-medium">{prop.name}</p>
                        <p className="text-slate-400 text-sm">{prop.propertyCode} · {prop.city}, {prop.country}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[prop.subscriptionPlan]}`}>
                          {prop.subscriptionPlan}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${prop.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {prop.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'PROPERTIES' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{properties.length} Hotels on Platform</h2>
                  <button onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
                    + Add Hotel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => openProperty(prop)}
                      className={`bg-white border rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                        selected?.id === prop.id ? 'border-blue-400' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {prop.propertyCode.slice(0, 2)}
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[prop.subscriptionPlan]}`}>
                            {prop.subscriptionPlan}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${prop.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {prop.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-slate-800 font-bold">{prop.name}</h3>
                      <p className="text-slate-500 text-sm">{prop.propertyCode} · {prop.city}, {prop.country}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                        <div className="text-center">
                          <p className="text-slate-800 font-bold">{prop._count?.rooms}</p>
                          <p className="text-slate-400 text-xs">Rooms</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-800 font-bold">{prop._count?.users}</p>
                          <p className="text-slate-400 text-xs">Staff</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-800 font-bold">{prop._count?.reservations}</p>
                          <p className="text-slate-400 text-xs">Reservations</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Property Detail Modal */}
      {selected && selectedStats && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selected.name}</h3>
                <p className="text-slate-500 text-sm">{selected.propertyCode} · {selected.city}, {selected.country}</p>
              </div>
              <button onClick={() => { setSelected(null); setSelectedStats(null); }}
                className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">${selectedStats.totalRevenue?.toLocaleString()}</p>
                  <p className="text-slate-500 text-sm">Total Revenue</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedStats.totalGuests}</p>
                  <p className="text-slate-500 text-sm">Total Guests</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedStats.completedStays}</p>
                  <p className="text-slate-500 text-sm">Completed Stays</p>
                </div>
              </div>

              {/* Subscription */}
              <div>
                <p className="text-slate-600 font-semibold mb-3">Subscription Plan</p>
                <div className="flex gap-3">
                  {['BASIC', 'STANDARD', 'PREMIUM'].map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handleUpdateSubscription(selected.id, plan)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selected.subscriptionPlan === plan
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Occupancy */}
              {selectedStats.occupancy?.length > 0 && (
                <div>
                  <p className="text-slate-600 font-semibold mb-3">Room Status</p>
                  <div className="flex gap-3 flex-wrap">
                    {selectedStats.occupancy.map((o: any) => (
                      <div key={o.status} className="bg-slate-50 rounded-lg px-4 py-3 text-center">
                        <p className="text-slate-800 font-bold">{o._count}</p>
                        <p className="text-slate-500 text-xs">{o.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleToggle(selected.id)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                    selected.isActive
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                  }`}
                >
                  {selected.isActive ? 'Deactivate Hotel' : 'Activate Hotel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Add New Hotel</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <p className="text-slate-500 text-sm font-medium uppercase">Hotel Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Hotel Code *</label>
                  <input required value={form.propertyCode}
                    onChange={(e) => setForm({ ...form, propertyCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. HILLVIEW"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Hotel Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Hill View Hotel"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">City *</label>
                  <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Country *</label>
                  <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                    <option value="USD">USD</option>
                    <option value="SLL">SLL</option>
                    <option value="GNF">GNF</option>
                    <option value="GMD">GMD</option>
                    <option value="LRD">LRD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Check-in Time</label>
                  <input value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Check-out Time</label>
                  <input value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Subscription Plan</label>
                <select value={form.subscriptionPlan} onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>

              <p className="text-slate-500 text-sm font-medium uppercase pt-2">Admin Account</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">First Name *</label>
                  <input required value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                  <input required value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Admin Email *</label>
                <input required type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="admin@hotel.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Admin Password</label>
                <input value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">
                  Create Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}