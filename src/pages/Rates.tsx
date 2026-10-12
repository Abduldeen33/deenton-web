import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

export default function Rates() {
  const [searchParams] = useSearchParams();
  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [roomRates, setRoomRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, { minRate: string; maxRate: string }>>({});
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [activeSection, setActiveSection] = useState(searchParams.get('view') === 'packages' ? 'PACKAGES' : 'RATES');
  const [availabilityStart, setAvailabilityStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [packageForm, setPackageForm] = useState({ name: '', code: '', description: '', price: '', currency: 'USD', mealPlan: 'BED_BREAKFAST' });
  const [promotionForm, setPromotionForm] = useState({ name: '', code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', startsAt: new Date().toISOString().slice(0, 10), endsAt: '' });
  const [planForm, setPlanForm] = useState({ name: '', mealPlan: 'BED_BREAKFAST', minRate: '', maxRate: '' });
  const [rateForm, setRateForm] = useState({ roomTypeId: '', ratePlanId: '', ratePerNight: '', validFrom: '', validTo: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/rates/plans'), api.get('/rooms/types'), api.get('/rates/room-rates'), api.get('/rates/packages'), api.get('/rates/promotions'), api.get(`/rates/availability?start=${availabilityStart}&days=14`)])
      .then(([plans, types, rates, packageData, promotionData, availabilityData]) => { setRatePlans(plans.data); setRoomTypes(types.data); setRoomRates(rates.data); setPackages(packageData.data); setPromotions(promotionData.data); setAvailability(availabilityData.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [availabilityStart]);

  const openThresholds = () => {
    setThresholds(Object.fromEntries(ratePlans.map((plan) => [plan.id, {
      minRate: plan.minRate == null ? '' : String(plan.minRate),
      maxRate: plan.maxRate == null ? '' : String(plan.maxRate),
    }])));
    setShowThresholds(true);
  };

  useEffect(() => {
    if (!loading && searchParams.get('view') === 'threshold') openThresholds();
  }, [loading, searchParams]);

  useEffect(() => {
    if (searchParams.get('view') === 'packages') setActiveSection('PACKAGES');
  }, [searchParams]);

  const handleCreatePackage = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/rates/packages', { ...packageForm, price: Number(packageForm.price) });
      setShowPackageForm(false);
      setPackageForm({ name: '', code: '', description: '', price: '', currency: 'USD', mealPlan: 'BED_BREAKFAST' });
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Unable to create package'); }
  };

  const handleCreatePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/rates/promotions', { ...promotionForm, discountValue: Number(promotionForm.discountValue) });
      setShowPromotionForm(false);
      setPromotionForm({ name: '', code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', startsAt: new Date().toISOString().slice(0, 10), endsAt: '' });
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Unable to create promotion'); }
  };

  const saveThresholds = async () => {
    const invalidPlan = ratePlans.find((plan) => {
      const values = thresholds[plan.id];
      return values?.minRate && values?.maxRate && Number(values.minRate) > Number(values.maxRate);
    });
    if (invalidPlan) {
      alert(`Minimum rate cannot exceed maximum rate for ${invalidPlan.name}.`);
      return;
    }
    setSavingThresholds(true);
    try {
      await Promise.all(ratePlans.map((plan) => {
        const values = thresholds[plan.id] ?? { minRate: '', maxRate: '' };
        return api.patch(`/rates/plans/${plan.id}/threshold`, {
          minRate: values.minRate === '' ? null : Number(values.minRate),
          maxRate: values.maxRate === '' ? null : Number(values.maxRate),
        });
      }));
      setShowThresholds(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to save rate thresholds');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rates/plans', { ...planForm, minRate: planForm.minRate ? Number(planForm.minRate) : undefined, maxRate: planForm.maxRate ? Number(planForm.maxRate) : undefined });
      setShowPlanForm(false);
      setPlanForm({ name: '', mealPlan: 'BED_BREAKFAST', minRate: '', maxRate: '' });
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rates/room-rates', { ...rateForm, ratePerNight: Number(rateForm.ratePerNight) });
      setShowRateForm(false);
      setRateForm({ roomTypeId: '', ratePlanId: '', ratePerNight: '', validFrom: '', validTo: '' });
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatMoney = (amount: number, currency: 'USD' | 'SLL') => new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: currency === 'SLL' ? 0 : 2,
  }).format(Number(amount));

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Rates & Availability</h2>
            <p className="text-slate-500 text-sm mt-1">Manage room rates and rate plans</p>
          </div>
          {can('manage_rates') && (
            <div className="flex gap-3">
              <button onClick={openThresholds}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg">
                Rate Thresholds
              </button>
              <button onClick={() => setShowRateForm(true)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg">
                + Room Rate
              </button>
              <button onClick={() => setShowPlanForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
                + Rate Plan
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 flex border-b border-slate-200">
          {[['RATES', 'Rates'], ['AVAILABILITY', 'Rate Availability'], ['PACKAGES', 'Packages & Promotions']].map(([key, label]) => <button key={key} onClick={() => setActiveSection(key)} className={`border-b-2 px-4 py-3 text-sm font-medium ${activeSection === key ? 'border-[#6d63d9] text-[#4d45b7]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : activeSection === 'RATES' ? (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Rate Plans</h3>
              {ratePlans.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <p className="text-slate-400">No rate plans yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ratePlans.map((plan) => (
                    <div key={plan.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-slate-800 font-semibold">{plan.name}</h4>
                        {can('manage_rates') && (
                          <button onClick={async () => { await api.patch(`/rates/plans/${plan.id}/toggle`); load(); }}
                            className={`px-2 py-1 text-xs rounded-lg font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </button>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{plan.mealPlan.replace('_', ' ')}</p>
                      {(plan.minRate || plan.maxRate) && (
                        <p className="text-slate-700 text-sm mt-1">${plan.minRate} — ${plan.maxRate}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Room Rates</h3>
              {roomRates.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <p className="text-slate-400">No room rates configured</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {roomRates.map((rate, i) => (
                    <div key={rate.id} className={`flex justify-between items-center p-4 ${i < roomRates.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div>
                        <p className="text-slate-800 font-medium">{rate.roomType?.name}</p>
                        <p className="text-slate-500 text-sm">{rate.ratePlan?.name} · {formatDate(rate.validFrom)} → {formatDate(rate.validTo)}</p>
                      </div>
                      <p className="text-green-600 font-bold text-lg">${rate.ratePerNight}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : activeSection === 'AVAILABILITY' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-800">Rate Availability</h3><p className="mt-1 text-sm text-slate-500">Sellable rooms by room type for the next 14 days.</p></div><label className="text-sm text-slate-600">Start date<input type="date" value={availabilityStart} onChange={(event) => setAvailabilityStart(event.target.value)} className="ml-2 border border-slate-200 px-3 py-2 text-sm" /></label></div>
            <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm"><table className="min-w-[950px] w-full border-collapse text-sm"><thead><tr className="bg-slate-50 text-slate-600"><th className="sticky left-0 bg-slate-50 px-4 py-3 text-left font-semibold">Room type</th>{availability?.dates?.map((date: string) => <th key={date} className="border-l border-slate-100 px-2 py-3 text-center text-[11px] font-semibold">{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</th>)}</tr></thead><tbody>{availability?.roomTypes?.length ? availability.roomTypes.map((roomType: any) => <tr key={roomType.id} className="border-t border-slate-100"><td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-800"><p>{roomType.name}</p><p className="mt-1 text-xs font-normal text-slate-400">{roomType.totalRooms} sellable rooms</p></td>{roomType.availability.map((day: any) => <td key={day.date} className={`border-l border-slate-100 px-2 py-3 text-center font-semibold ${day.available === 0 ? 'bg-red-50 text-red-600' : day.available <= 2 ? 'bg-amber-50 text-amber-700' : 'text-emerald-700'}`}><p>{day.available}</p><p className="mt-1 text-[10px] font-normal text-slate-400">{day.booked} booked</p></td>)}</tr>) : <tr><td colSpan={15} className="p-10 text-center text-slate-400">No room types configured</td></tr>}</tbody></table></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-800">Packages & Promotions</h3><p className="mt-1 text-sm text-slate-500">Sell value-added stays and time-limited discounts.</p></div>{can('manage_rates') && <div className="flex gap-2"><button onClick={() => setShowPromotionForm(true)} className="border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">+ Promotion</button><button onClick={() => setShowPackageForm(true)} className="bg-[#292b35] px-4 py-2 text-sm font-medium text-white hover:bg-black">+ Package</button></div>}</div>
            <div><h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Packages</h4>{packages.length === 0 ? <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No packages yet</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{packages.map((item) => <div key={item.id} className="border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.code} · {item.mealPlan.replaceAll('_', ' ')}</p></div><button disabled={!can('manage_rates')} onClick={async () => { await api.patch(`/rates/packages/${item.id}/toggle`); load(); }} className={`px-2 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</button></div><p className="mt-3 min-h-10 text-sm text-slate-500">{item.description || 'No description provided.'}</p><p className="mt-3 text-lg font-bold text-[#4d45b7]">{formatMoney(item.price, item.currency)}</p></div>)}</div>}</div>
            <div><h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Promotions</h4>{promotions.length === 0 ? <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No promotions yet</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{promotions.map((item) => <div key={item.id} className="border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-xs text-slate-500">Code: {item.code}</p></div><button disabled={!can('manage_rates')} onClick={async () => { await api.patch(`/rates/promotions/${item.id}/toggle`); load(); }} className={`px-2 py-1 text-xs font-medium ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</button></div><p className="mt-3 text-2xl font-bold text-[#4d45b7]">{item.discountType === 'PERCENTAGE' ? `${item.discountValue}% off` : `$${item.discountValue} off`}</p><p className="mt-2 text-xs text-slate-500">{formatDate(item.startsAt)} – {formatDate(item.endsAt)}</p><p className="mt-2 text-sm text-slate-500">{item.description || 'No description provided.'}</p></div>)}</div>}</div>
          </div>
        )}
      </div>

      {showPackageForm && can('manage_rates') && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h3 className="font-bold text-slate-800">New Package</h3><button onClick={() => setShowPackageForm(false)} className="text-xl text-slate-400">×</button></div><form onSubmit={handleCreatePackage} className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><label className="text-sm text-slate-600">Package name<input required value={packageForm.name} onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><label className="text-sm text-slate-600">Code<input required value={packageForm.code} onChange={(event) => setPackageForm({ ...packageForm, code: event.target.value.toUpperCase() })} className="mt-1 w-full border px-3 py-2" /></label></div><label className="block text-sm text-slate-600">Description<textarea value={packageForm.description} onChange={(event) => setPackageForm({ ...packageForm, description: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><div className="grid grid-cols-3 gap-3"><label className="text-sm text-slate-600">Price<input required min="0" step="0.01" type="number" value={packageForm.price} onChange={(event) => setPackageForm({ ...packageForm, price: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><label className="text-sm text-slate-600">Currency<select value={packageForm.currency} onChange={(event) => setPackageForm({ ...packageForm, currency: event.target.value })} className="mt-1 w-full border px-3 py-2"><option>USD</option><option>SLL</option></select></label><label className="text-sm text-slate-600">Meal plan<select value={packageForm.mealPlan} onChange={(event) => setPackageForm({ ...packageForm, mealPlan: event.target.value })} className="mt-1 w-full border px-3 py-2"><option value="BED_BREAKFAST">B&amp;B</option><option value="ROOM_ONLY">Room only</option><option value="HALF_BOARD">Half board</option><option value="FULL_BOARD">Full board</option></select></label></div><div className="flex gap-3"><button type="button" onClick={() => setShowPackageForm(false)} className="flex-1 bg-slate-100 py-2 text-sm">Cancel</button><button type="submit" className="flex-1 bg-[#292b35] py-2 text-sm font-medium text-white">Create Package</button></div></form></div></div>}

      {showPromotionForm && can('manage_rates') && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h3 className="font-bold text-slate-800">New Promotion</h3><button onClick={() => setShowPromotionForm(false)} className="text-xl text-slate-400">×</button></div><form onSubmit={handleCreatePromotion} className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><label className="text-sm text-slate-600">Promotion name<input required value={promotionForm.name} onChange={(event) => setPromotionForm({ ...promotionForm, name: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><label className="text-sm text-slate-600">Code<input required value={promotionForm.code} onChange={(event) => setPromotionForm({ ...promotionForm, code: event.target.value.toUpperCase() })} className="mt-1 w-full border px-3 py-2" /></label></div><label className="block text-sm text-slate-600">Description<textarea value={promotionForm.description} onChange={(event) => setPromotionForm({ ...promotionForm, description: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm text-slate-600">Discount type<select value={promotionForm.discountType} onChange={(event) => setPromotionForm({ ...promotionForm, discountType: event.target.value })} className="mt-1 w-full border px-3 py-2"><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount ($)</option></select></label><label className="text-sm text-slate-600">Discount value<input required min="0" step="0.01" type="number" value={promotionForm.discountValue} onChange={(event) => setPromotionForm({ ...promotionForm, discountValue: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label></div><div className="grid grid-cols-2 gap-3"><label className="text-sm text-slate-600">Starts<input required type="date" value={promotionForm.startsAt} onChange={(event) => setPromotionForm({ ...promotionForm, startsAt: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label><label className="text-sm text-slate-600">Ends<input required type="date" value={promotionForm.endsAt} onChange={(event) => setPromotionForm({ ...promotionForm, endsAt: event.target.value })} className="mt-1 w-full border px-3 py-2" /></label></div><div className="flex gap-3"><button type="button" onClick={() => setShowPromotionForm(false)} className="flex-1 bg-slate-100 py-2 text-sm">Cancel</button><button type="submit" className="flex-1 bg-[#292b35] py-2 text-sm font-medium text-white">Create Promotion</button></div></form></div></div>}

      {showThresholds && can('manage_rates') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
              <div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-[#2d3142]">Rate Threshold</h3><span className="rounded-full border border-[#8d909b] px-1.5 text-[10px] text-[#71737d]">i</span></div>
              <div className="flex items-center gap-5"><p className="text-sm text-[#777985]">ⓘ Rates are in $ and are tax inclusive</p><button onClick={() => setShowThresholds(false)} className="text-xl text-[#777985] hover:text-[#30313b]">×</button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[#f1f1f2] px-5 py-3 text-sm font-semibold text-[#30313b]"><span>Rate Plan</span><span>Minimum Rate</span><span>Maximum Rate</span></div>
              {ratePlans.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center border-b border-[#ececee] text-[#a1a2aa]"><span className="text-4xl">▱</span><p className="mt-2 text-sm">No rate plans yet</p><p className="mt-1 text-xs">Create a rate plan first, then set its permitted selling range.</p></div>
              ) : ratePlans.map((plan) => (
                <div key={plan.id} className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-[#ececee] px-5 py-4">
                  <div><p className="font-medium text-[#30313b]">{plan.name}</p><p className="mt-1 text-xs text-[#81838d]">{plan.mealPlan.replaceAll('_', ' ')}</p></div>
                  <div className="pr-4"><label className="sr-only">Minimum rate for {plan.name}</label><div className="flex max-w-[180px] items-center border border-[#d8d9df] bg-white"><span className="border-r border-[#d8d9df] px-3 py-2 text-sm text-[#72747e]">$</span><input min="0" step="0.01" type="number" value={thresholds[plan.id]?.minRate ?? ''} onChange={(event) => setThresholds({ ...thresholds, [plan.id]: { ...(thresholds[plan.id] ?? { minRate: '', maxRate: '' }), minRate: event.target.value } })} className="w-full px-3 py-2 text-sm outline-none" placeholder="No minimum" /></div></div>
                  <div><label className="sr-only">Maximum rate for {plan.name}</label><div className="flex max-w-[180px] items-center border border-[#d8d9df] bg-white"><span className="border-r border-[#d8d9df] px-3 py-2 text-sm text-[#72747e]">$</span><input min="0" step="0.01" type="number" value={thresholds[plan.id]?.maxRate ?? ''} onChange={(event) => setThresholds({ ...thresholds, [plan.id]: { ...(thresholds[plan.id] ?? { minRate: '', maxRate: '' }), maxRate: event.target.value } })} className="w-full px-3 py-2 text-sm outline-none" placeholder="No maximum" /></div></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#e5e5e5] px-6 py-3"><button onClick={() => setShowThresholds(false)} disabled={savingThresholds} className="border border-[#d5d6dc] px-5 py-2 text-sm text-[#666975] hover:bg-[#f5f5f7]">Cancel</button><button onClick={saveThresholds} disabled={savingThresholds || ratePlans.length === 0} className="bg-[#292b35] px-5 py-2 text-sm font-medium text-white disabled:bg-[#b8b9c0]">{savingThresholds ? 'Saving...' : 'Save'}</button></div>
          </div>
        </div>
      )}

      {showPlanForm && can('manage_rates') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">New Rate Plan</h3>
              <button onClick={() => setShowPlanForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Plan Name *</label>
                <input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Meal Plan</label>
                <select value={planForm.mealPlan} onChange={(e) => setPlanForm({ ...planForm, mealPlan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="BED_BREAKFAST">Bed & Breakfast</option>
                  <option value="HALF_BOARD">Half Board</option>
                  <option value="FULL_BOARD">Full Board</option>
                  <option value="ROOM_ONLY">Room Only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Min Rate ($)</label>
                  <input type="number" value={planForm.minRate} onChange={(e) => setPlanForm({ ...planForm, minRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Max Rate ($)</label>
                  <input type="number" value={planForm.maxRate} onChange={(e) => setPlanForm({ ...planForm, maxRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPlanForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRateForm && can('manage_rates') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">New Room Rate</h3>
              <button onClick={() => setShowRateForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateRate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Room Type *</label>
                <select required value={rateForm.roomTypeId} onChange={(e) => setRateForm({ ...rateForm, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="">Select room type</option>
                  {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name} (Base: {formatMoney(t.baseRate, 'USD')}{t.baseRateSll ? ` / ${formatMoney(t.baseRateSll, 'SLL')}` : ''})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Rate Plan *</label>
                <select required value={rateForm.ratePlanId} onChange={(e) => setRateForm({ ...rateForm, ratePlanId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="">Select rate plan</option>
                  {ratePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Rate Per Night ($) *</label>
                <input required type="number" value={rateForm.ratePerNight} onChange={(e) => setRateForm({ ...rateForm, ratePerNight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Valid From *</label>
                  <input required type="date" value={rateForm.validFrom} onChange={(e) => setRateForm({ ...rateForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Valid To *</label>
                  <input required type="date" value={rateForm.validTo} onChange={(e) => setRateForm({ ...rateForm, validTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRateForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Create Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
