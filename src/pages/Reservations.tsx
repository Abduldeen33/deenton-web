import { useEffect, useState } from 'react';
import api from '../api/client';
import { getReservations, checkIn, checkOut, createReservation, updateReservation, sendReservationEmail } from '../api/reservations';
import { getRooms } from '../api/rooms';
import Layout from '../components/Layout';
import { can, canOperate } from '../store/permissions';

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
  const [auditReady, setAuditReady] = useState(false);
  const [auditMessage, setAuditMessage] = useState('Checking night audit before new reservations...');
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const { data } = await api.get('/reservations/creation-status', { signal: controller.signal });
        if (!controller.signal.aborted) {
          setAuditReady(data.canCreateReservation === true);
          setAuditMessage(data.canCreateReservation ? '' : `New reservations are locked until night audit for ${data.auditDate} is completed.`);
        }
      } catch {
        if (!controller.signal.aborted) { setAuditReady(false); setAuditMessage('Unable to verify night audit. New reservations are locked; retry when the connection is restored.'); }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editReservationId, setEditReservationId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPaymentReservation, setSelectedPaymentReservation] = useState<any>(null);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    method: 'CASH',
    amount: '',
    currency: 'USD',
    exchangeRate: '',
    reference: '',
    email: '',
  });
  const [form, setForm] = useState({
    guestFirstName: '', guestLastName: '', guestEmail: '', guestPhone: '',
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
        return arr.getTime() <= today.getTime() && ['RESERVED','ARRIVED','STAYOVER','DUE_OUT','CHECKED_OUT'].includes(r.status);
      }).length
    },
    {
      key: 'DEPARTURES', label: 'Departures',
      count: reservations.filter(r => {
        const dep = new Date(r.departureDate);
        dep.setHours(0,0,0,0);
        return dep.getTime() <= today.getTime() && ['ARRIVED','STAYOVER','DUE_OUT','CHECKED_OUT'].includes(r.status);
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
      return arr.getTime() <= today.getTime() && ['RESERVED','ARRIVED','STAYOVER','DUE_OUT','CHECKED_OUT'].includes(r.status);
    }
    if (activeTab === 'DEPARTURES') {
      const dep = new Date(r.departureDate);
      dep.setHours(0,0,0,0);
      return dep.getTime() <= today.getTime() && ['ARRIVED','STAYOVER','DUE_OUT','CHECKED_OUT'].includes(r.status);
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

  const formatInputDate = (value: string) => {
    if (!value) return '';
    return new Date(value).toISOString().split('T')[0];
  };

  const openEditReservation = (reservation: any) => {
    setEditReservationId(reservation.id);
    setForm({
      guestFirstName: reservation.guest?.firstName ?? '',
      guestLastName: reservation.guest?.lastName ?? '',
      guestEmail: reservation.guest?.email ?? '',
      guestPhone: reservation.guest?.phone ?? '',
      guestNationality: reservation.guest?.nationality ?? '',
      guestIdType: reservation.guest?.idType ?? '',
      guestIdNumber: reservation.guest?.idNumber ?? '',
      roomId: reservation.roomId,
      roomTypeId: reservation.room?.roomTypeId ?? reservation.roomTypeId ?? '',
      arrivalDate: formatInputDate(reservation.arrivalDate),
      departureDate: formatInputDate(reservation.departureDate),
      adults: reservation.adults ?? 1,
      children: reservation.children ?? 0,
      mealPlan: reservation.mealPlan ?? 'BED_BREAKFAST',
      reservationType: reservation.reservationType ?? 'REGULAR',
      notes: reservation.notes ?? '',
    });
    setShowForm(true);
  };

  const openCollectPayment = async (reservation: any) => {
    try {
      const folioRes = await api.get(`/billing/reservation/${reservation.id}`);
      setSelectedPaymentReservation(reservation);
      setSelectedFolio(folioRes.data);
      setPaymentForm({
        method: 'CASH',
        amount: String(folioRes.data.balance ?? 0),
        currency: 'USD',
        exchangeRate: '',
        reference: '',
        email: reservation.guest?.email ?? '',
      });
      setShowPaymentModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to load folio for payment');
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio) return;

    setPaymentLoading(true);
    try {
      await api.post('/billing/payment', {
        folioId: selectedFolio.id,
        method: paymentForm.method,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency,
        ...(paymentForm.currency === 'SLL' && { exchangeRate: Number(paymentForm.exchangeRate) }),
        reference: paymentForm.reference,
        ...(paymentForm.email?.trim() ? { email: paymentForm.email.trim() } : {}),
      });
      setShowPaymentModal(false);
      setSelectedPaymentReservation(null);
      setSelectedFolio(null);
      setPaymentForm({
        method: 'CASH',
        amount: '',
        currency: 'USD',
        exchangeRate: '',
        reference: '',
        email: '',
      });
      load();
      alert('Payment recorded successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const saveReservation = async (sendEmail = false) => {
    setFormLoading(true);
    try {
      const created = await createReservation(form);
      if (sendEmail && form.guestEmail?.trim()) {
        await sendReservationEmail(created.id, form.guestEmail.trim());
      }
      setShowForm(false);
      setForm({
        guestFirstName: '', guestLastName: '', guestEmail: '', guestPhone: '',
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

  const updateExistingReservation = async () => {
    if (!editReservationId) return;

    setFormLoading(true);
    try {
      await updateReservation(editReservationId, {
        roomId: form.roomId,
        roomTypeId: form.roomTypeId,
        guestFirstName: form.guestFirstName,
        guestLastName: form.guestLastName,
        guestEmail: form.guestEmail,
        guestPhone: form.guestPhone,
        guestNationality: form.guestNationality,
        guestIdType: form.guestIdType,
        guestIdNumber: form.guestIdNumber,
        arrivalDate: form.arrivalDate,
        departureDate: form.departureDate,
        adults: form.adults,
        children: form.children,
        mealPlan: form.mealPlan,
        reservationType: form.reservationType,
        notes: form.notes,
      });
      setEditReservationId(null);
      setShowForm(false);
      setForm({
        guestFirstName: '', guestLastName: '', guestEmail: '', guestPhone: '',
        guestNationality: '', guestIdType: '', guestIdNumber: '',
        roomId: '', roomTypeId: '', arrivalDate: '', departureDate: '',
        adults: 1, children: 0, mealPlan: 'BED_BREAKFAST',
        reservationType: 'REGULAR', notes: '',
      });
      load();
      alert('Reservation updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update reservation');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editReservationId) {
      await updateExistingReservation();
      return;
    }
    await saveReservation(false);
  };

  const handleCreateAndEmail = async () => {
    if (!form.guestEmail?.trim()) {
      alert('Please enter a guest email before sending the reservation email.');
      return;
    }
    await saveReservation(true);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const exportReservations = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((reservation) => [
      `${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`.trim(),
      reservation.resNumber,
      formatDate(reservation.createdAt),
      formatDate(reservation.arrivalDate),
      formatDate(reservation.departureDate),
      reservation.room?.roomNumber,
      reservation.room?.roomType?.name,
      statusConfig[reservation.status]?.label ?? reservation.status,
      Number(reservation.totalAmount ?? 0).toFixed(2),
      Number(reservation.paidAmount ?? 0).toFixed(2),
    ]);
    const csv = [
      ['Guest name', 'Reservation no.', 'Booking date', 'Arrival', 'Departure', 'Room', 'Room type', 'Status', 'Total (USD)', 'Paid (USD)'],
      ...rows,
    ].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anzak-cloud-reservations.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      {auditMessage && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{auditMessage} {can('view_night_audit') ? <a href="/night-audit" className="underline">Open Night Audit</a> : <span>Contact an authorized audit operator.</span>}</div>}
      <div className="flex h-full min-h-full flex-col bg-[#f8f8f6] text-[#252525]">
        {/* Top Bar */}
        <div className="bg-white border-b border-[#deded9] px-5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              {/* Tabs */}
              <div className="flex items-end gap-5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`border-b-2 px-0.5 pb-2 text-[11px] font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'border-[#252525] text-[#252525]'
                        : 'border-transparent text-[#666661] hover:border-[#bebeb9] hover:text-[#252525]'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 text-[10px]">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reservations, guests and more"
                className="w-64 border border-[#d7d7d2] bg-white px-3 py-1.5 text-[11px] text-[#30302e] outline-none focus:border-[#777773]"
              />

              {/* Action Buttons */}
              <button onClick={() => window.print()} className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium text-[#353532] hover:bg-[#f4f4f1]">
                🖨️ Print GR
              </button>
              <button onClick={exportReservations} className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium text-[#353532] hover:bg-[#f4f4f1]">
                📤 Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                disabled={!can('create_reservations') || !auditReady}
                className="ml-1 bg-[#252525] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-black"
              >
                + New Reservation
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 border-b border-[#deded9] bg-white px-5 py-1.5">
          <button title="Calendar view" className="border border-[#cfcfca] px-2 py-1 text-[12px] hover:bg-[#f4f4f1]">▣</button>
          <button title="Grid view" className="border border-[#cfcfca] px-2 py-1 text-[12px] hover:bg-[#f4f4f1]">▦</button>
          <button title="List view" className="border border-[#252525] bg-[#252525] px-2 py-1 text-[12px] text-white">☰</button>
          <span className="mx-1 h-5 border-l border-[#d5d5d0]" />
          <button onClick={() => alert('Group reservations can be created from the New Reservation form.')} className="border border-[#cfcfca] px-2 py-1 text-[10px] font-medium hover:bg-[#f4f4f1]">♧ Make Group</button>
          <button className="border border-[#cfcfca] px-2 py-1 text-[10px] font-medium hover:bg-[#f4f4f1]">⌕ Manage Columns</button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white px-4 pb-6 pt-3">
          <div className="min-w-[1240px] overflow-hidden">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#cbcbc6] text-[#4d4d49]">
                  <th className="w-[17%] px-2 py-2 text-left text-[9px] font-semibold">Guest Name</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Res No.<br />Voucher No.</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Booking Date</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Arrival</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Departure</th>
                  <th className="w-[16%] px-2 py-2 text-left text-[9px] font-semibold">Room Details</th>
                  <th className="w-[11%] px-2 py-2 text-left text-[9px] font-semibold">Status</th>
                  <th className="w-[6%] px-2 py-2 text-right text-[9px] font-semibold">Total ($)</th>
                  <th className="w-[6%] px-2 py-2 text-right text-[9px] font-semibold">Paid ($)</th>
                  <th className="w-[8%] px-2 py-2 text-right text-[9px] font-semibold">Actions</th>
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
                  filtered.map((res) => (
                    <tr key={res.id} className="border-b border-[#ecece8] align-top transition-colors hover:bg-[#fafaf8]">
                      <td className="px-2 py-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-[#353532]">
                            {res.guest?.title} {res.guest?.firstName} {res.guest?.lastName}
                          </p>
                          <p className="mt-1 text-[10px] text-[#777773]">
                            👤 {res.adults} 👶 {res.children}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium text-[#353532]">{res.resNumber}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{formatDateTime(res.createdAt)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{formatDate(res.arrivalDate)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{formatDate(res.departureDate)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-slate-800 text-sm">{res.room?.roomNumber} — {res.room?.roomType?.name}</p>
                        <p className="text-slate-400 text-xs">{res.mealPlan?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-block min-w-[82px] border px-2 py-1 text-center text-[9px] font-medium leading-3 ${statusConfig[res.status]?.color}`}>
                          {statusConfig[res.status]?.label}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <p className="font-medium text-[#353532]">{Number(res.totalAmount).toFixed(2)}</p>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <p className="font-medium text-[#353532]">{Number(res.paidAmount).toFixed(2)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can('checkin_checkout') && res.status === 'RESERVED' && (
                            <button
                              onClick={() => handleCheckIn(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check In'}
                            </button>
                          )}
                          {can('checkin_checkout') && ['ARRIVED','STAYOVER','DUE_OUT'].includes(res.status) && (
                            <button
                              onClick={() => handleCheckOut(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check Out'}
                            </button>
                          )}
                          <button
                            onClick={() => openEditReservation(res)}
                            disabled={!canOperate() || !can('create_reservations')}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openCollectPayment(res)}
                            disabled={!can('record_payments')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded font-medium"
                          >
                            Collect Payment
                          </button>
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

      {/* Collect Payment Modal */}
      {showPaymentModal && selectedPaymentReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Collect Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCollectPayment} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Guest</p>
                <p className="font-medium text-slate-800">
                  {selectedPaymentReservation.guest?.firstName} {selectedPaymentReservation.guest?.lastName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="AFRIMONEY">Afrimoney</option>
                    <option value="COMPLIMENTARY">Complimentary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Currency</label>
                  <select value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                    <option value="USD">USD</option>
                    <option value="SLL">SLL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Amount ({paymentForm.currency}) *</label>
                <input required type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              {paymentForm.currency === 'SLL' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Exchange Rate *</label>
                  <input required type="number" value={paymentForm.exchangeRate} onChange={(e) => setPaymentForm({ ...paymentForm, exchangeRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email for invoice</label>
                <input type="email" value={paymentForm.email} onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="guest@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Reference</label>
                <input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={paymentLoading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded-xl text-sm">
                  {paymentLoading ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editReservationId ? 'Edit Reservation' : 'New Reservation'}</h3>
              <button onClick={() => { setShowForm(false); setEditReservationId(null); }} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
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
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="guest@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                  <input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
                <input value={form.guestNationality} onChange={(e) => setForm({ ...form, guestNationality: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
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
                <button type="button" onClick={() => { setShowForm(false); setEditReservationId(null); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">Cancel</button>
                {!editReservationId && canOperate() && (
                  <button type="button" onClick={handleCreateAndEmail} disabled={formLoading}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl text-sm">
                    {formLoading ? 'Creating...' : 'Create & Email'}
                  </button>
                )}
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
                  {formLoading ? (editReservationId ? 'Saving...' : 'Creating...') : (editReservationId ? 'Save Changes' : 'Create Reservation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
