import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

export default function Rates() {
  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [roomRates, setRoomRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', mealPlan: 'BED_BREAKFAST', minRate: '', maxRate: '' });
  const [rateForm, setRateForm] = useState({ roomTypeId: '', ratePlanId: '', ratePerNight: '', validFrom: '', validTo: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/rates/plans'),
      api.get('/rooms/types'),
      api.get('/rates/room-rates'),
    ])
      .then(([plans, types, rates]) => {
        setRatePlans(plans.data);
        setRoomTypes(types.data);
        setRoomRates(rates.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rates/plans', {
        ...planForm,
        minRate: planForm.minRate ? Number(planForm.minRate) : undefined,
        maxRate: planForm.maxRate ? Number(planForm.maxRate) : undefined,
      });
      setShowPlanForm(false);
      setPlanForm({ name: '', mealPlan: 'BED_BREAKFAST', minRate: '', maxRate: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create rate plan');
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rates/room-rates', {
        ...rateForm,
        ratePerNight: Number(rateForm.ratePerNight),
      });
      setShowRateForm(false);
      setRateForm({ roomTypeId: '', ratePlanId: '', ratePerNight: '', validFrom: '', validTo: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create room rate');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Rates & Availability</h2>
            <p className="text-slate-400 text-sm mt-1">Manage room rates and rate plans</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRateForm(true)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors border border-slate-600"
            >
              + Room Rate
            </button>
            <button
              onClick={() => setShowPlanForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Rate Plan
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {/* Rate Plans */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Rate Plans</h3>
              {ratePlans.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No rate plans yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ratePlans.map((plan) => (
                    <div key={plan.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-semibold">{plan.name}</h4>
                        <button
                          onClick={async () => {
                            await api.patch(`/rates/plans/${plan.id}/toggle`);
                            load();
                          }}
                          className={`px-2 py-1 text-xs rounded border ${
                            plan.isActive
                              ? 'bg-green-900 border-green-700 text-green-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400'
                          }`}
                        >
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{plan.mealPlan.replace('_', ' ')}</p>
                      {(plan.minRate || plan.maxRate) && (
                        <p className="text-slate-300 text-sm">
                          ${plan.minRate} — ${plan.maxRate}
                        </p>
                      )}
                      <p className="text-slate-500 text-xs mt-2">{plan.roomRates?.length ?? 0} room rates</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Room Rates */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Room Rates</h3>
              {roomRates.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No room rates configured yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomRates.map((rate) => (
                    <div key={rate.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{rate.roomType?.name}</p>
                          <p className="text-slate-400 text-sm">{rate.ratePlan?.name} — {rate.ratePlan?.mealPlan?.replace('_', ' ')}</p>
                          <p className="text-slate-400 text-sm mt-1">
                            {formatDate(rate.validFrom)} → {formatDate(rate.validTo)}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-400">${rate.ratePerNight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Rate Plan Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">New Rate Plan</h3>
              <button onClick={() => setShowPlanForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Plan Name *</label>
                <input
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Standard Rate, Corporate Rate"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meal Plan</label>
                <select
                  value={planForm.mealPlan}
                  onChange={(e) => setPlanForm({ ...planForm, mealPlan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="BED_BREAKFAST">Bed & Breakfast</option>
                  <option value="HALF_BOARD">Half Board</option>
                  <option value="FULL_BOARD">Full Board</option>
                  <option value="ROOM_ONLY">Room Only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Min Rate ($)</label>
                  <input
                    type="number"
                    value={planForm.minRate}
                    onChange={(e) => setPlanForm({ ...planForm, minRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Max Rate ($)</label>
                  <input
                    type="number"
                    value={planForm.maxRate}
                    onChange={(e) => setPlanForm({ ...planForm, maxRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPlanForm(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Rate Modal */}
      {showRateForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">New Room Rate</h3>
              <button onClick={() => setShowRateForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateRate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Room Type *</label>
                <select
                  required
                  value={rateForm.roomTypeId}
                  onChange={(e) => setRateForm({ ...rateForm, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select room type</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name} (Base: ${type.baseRate})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Rate Plan *</label>
                <select
                  required
                  value={rateForm.ratePlanId}
                  onChange={(e) => setRateForm({ ...rateForm, ratePlanId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select rate plan</option>
                  {ratePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Rate Per Night ($) *</label>
                <input
                  required
                  type="number"
                  value={rateForm.ratePerNight}
                  onChange={(e) => setRateForm({ ...rateForm, ratePerNight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valid From *</label>
                  <input
                    required
                    type="date"
                    value={rateForm.validFrom}
                    onChange={(e) => setRateForm({ ...rateForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Valid To *</label>
                  <input
                    required
                    type="date"
                    value={rateForm.validTo}
                    onChange={(e) => setRateForm({ ...rateForm, validTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRateForm(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">Create Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}