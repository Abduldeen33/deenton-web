import { useSearchParams } from 'react-router-dom';
import BookingDetails from '../components/BookingDetails';
import { financeColumns, financeValue, paymentClass, csvCell } from '../components/reservation-finance-data';
import type { FinanceKey } from '../components/reservation-finance-data';
import '../components/reservation-finance.css';
import './reservations-workspace.css';
import { actualStayTime, hotelToday, inReservationPanel, isInHouse, reservationPanels } from '../components/reservation-panels';
import type { ReservationPanel } from '../components/reservation-panels';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReservationRoomPicker from '../components/ReservationRoomPicker';
import GuestSettlements from '../components/GuestSettlements';
import PaymentReceipt from '../components/PaymentReceipt';
import api from '../api/client';
import { getReservations, checkIn, checkOut, createReservation, updateReservation, cancelReservation, sendReservationEmail } from '../api/reservations';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBookingId = searchParams.get('reservation');
  const openBooking = (id: string) => setSearchParams({ reservation: id });
  const closeBooking = () => setSearchParams({});

  const [stayRevision, setStayRevision] = useState(0), [receipt, setReceipt] = useState('');
  const paymentKey = useRef(crypto.randomUUID()), paymentLock = useRef(false);
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
  const [roomSelectionReady, setRoomSelectionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const loadRevision = useRef(0);
  const [activeTab, setActiveTab] = useState<ReservationPanel>('UPCOMING');
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  // The room rack opens the existing form; keep the night-audit and role gate.
  useEffect(() => {
    if (searchParams.get('new') === '1' && auditReady && can('create_reservations')) {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [auditReady, searchParams, setSearchParams]);
  const [editReservationId, setEditReservationId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPaymentReservation, setSelectedPaymentReservation] = useState<any>(null);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [manageColumns, setManageColumns] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem('anzak-reservation-columns') || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; } catch { return []; }
  });
  const [currencyOverride, setCurrencyOverride] = useState('');
  const [sortColumn, setSortColumn] = useState<FinanceKey | 'nights' | ''>('');
  const [sortAsc, setSortAsc] = useState(false);
  const financialAccess = can('view_billing');
  const displayCurrency = currencyOverride || (['SLL', 'SLE'].includes(reservations[0]?.displayCurrency) ? 'SLE' : 'USD');
  const visibleFinance = financialAccess ? financeColumns.filter(c => !hiddenColumns.includes(c.key)) : [];
  const showNights = !hiddenColumns.includes('nights');
  const toggleColumn = (key: string) => setHiddenColumns(old => {
    const next = old.includes(key) ? old.filter(c => c !== key) : [...old, key];
    localStorage.setItem('anzak-reservation-columns', JSON.stringify(next)); return next;
  });
  const sortBy = (key: FinanceKey | 'nights') => { setSortAsc(sortColumn === key ? !sortAsc : false); setSortColumn(key); };
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

  const load = async (background = false) => {
    const revision = ++loadRevision.current;
    if (!background) setLoading(true);
    const [bookings, inventory] = await Promise.allSettled([getReservations(), getRooms()]);
    if (revision !== loadRevision.current) return;
    const errors: string[] = [];
    if (bookings.status === 'fulfilled') {
      setReservations(bookings.value);
      setStayRevision(n => n + 1);
    } else errors.push('Unable to refresh reservations. Any displayed bookings may be out of date.');
    if (inventory.status === 'fulfilled') {
      setRooms([...inventory.value].sort((a: any, b: any) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })));
    } else {
      setRooms([]);
      errors.push('Unable to load room choices. Existing reservations are still available.');
    }
    setLoadError(errors.join(' '));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const refresh = () => { if (!document.hidden) void load(true); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { ++loadRevision.current; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  const now = new Date();
  const inHouse = isInHouse;
  const tabs = reservationPanels.map(panel => ({ ...panel, count: reservations.filter(record => inReservationPanel(record, panel.key, now)).length }));
  const activePanel = tabs.find(panel => panel.key === activeTab);
  const missingHotelDates = reservations.filter(record => inHouse(record) && (!hotelToday(record.timezone, now) || !record.departureDate)).length;

  const filtered = reservations.filter(r => {
    const matchSearch = search === '' ||
      `${r.guest?.firstName} ${r.guest?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      r.resNumber?.includes(search);

    if (!matchSearch) return false;

    return inReservationPanel(r, activeTab, now);
  });

  if (sortColumn) filtered.sort((a, b) => {
    const av = sortColumn === 'nights' ? a.nights : a.financials?.[sortColumn];
    const bv = sortColumn === 'nights' ? b.nights : b.financials?.[sortColumn];
    if (av == null) return bv == null ? 0 : 1;
    if (bv == null) return -1;
    return (Number(av) - Number(bv)) * (sortAsc ? 1 : -1);
  });

  const selectedBooking = reservations.find(r => r.id === selectedBookingId);

  const handleCancelReservation = async () => {
    if (!cancelTarget || cancelBusy || cancelReason.trim().length < 5) return;
    setCancelBusy(true);
    setCancelError('');
    try {
      await cancelReservation(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason('');
      load();
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      setCancelError(Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || 'Cancellation failed. Please retry.');
    } finally {
      setCancelBusy(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    try {
      await checkIn(id); load();
    }
    catch (err: any) { alert(err.response?.data?.message || 'Check-in failed'); }
    finally { setActionLoading(null); }
  };

  const handleCheckOut = async (id: string) => {
    setActionLoading(id);
    try { await checkOut(id); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Check-out failed'); }
    finally { setActionLoading(null); }
  };

  const validateRoomSelection = () => {
    if (!form.roomId || !roomSelectionReady) { alert('Please select a room after live availability has been checked.'); return false; }
    return true;
  };
  const handleRoomChange = useCallback((roomId: string, roomTypeId: string) => {
    setForm(current => ({ ...current, roomId, roomTypeId }));
  }, []);

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
      const [folioRes, settings] = await Promise.all([api.get(`/billing/reservation/${reservation.id}`), api.get('/billing/settings')]);
      paymentKey.current = crypto.randomUUID();
      setSelectedPaymentReservation(reservation);
      setSelectedFolio(folioRes.data);
      setPaymentForm({
        method: 'CASH',
        amount: String(folioRes.data.balance ?? 0),
        currency: 'USD',
        exchangeRate: settings.data.posExchangeRate ? String(settings.data.posExchangeRate) : '',
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
    if (!selectedFolio || paymentLock.current) return;
    paymentLock.current = true;
    setPaymentLoading(true);
    try {
      const response = await api.post('/billing/payment', {
        idempotencyKey: paymentKey.current,
        folioId: selectedFolio.id,
        method: paymentForm.method,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency,
        ...(paymentForm.currency === 'SLL' && { exchangeRate: Number(paymentForm.exchangeRate) }),
        reference: paymentForm.reference,
        ...(paymentForm.email?.trim() ? { email: paymentForm.email.trim() } : {}),
      });
      setReceipt(response.data.id);
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
      paymentLock.current = false;
    }
  };

  const saveReservation = async (sendEmail = false) => {
    if (!validateRoomSelection()) return;
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
    if (!editReservationId || !validateRoomSelection()) return;

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
    new Date(date.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const exportReservations = () => {
    const headings = ['Guest name', 'Reservation no.', 'Booking date', activeTab === 'CHECKED_OUT' ? 'Actual check-in' : 'Arrival', activeTab === 'CHECKED_OUT' ? 'Actual checkout' : 'Expected checkout', ...(showNights ? ['Nights'] : []), 'Room', 'Room type', ...visibleFinance.map(c => c.label + ' (' + displayCurrency + (c.key === 'roomRateUsd' ? ', average posted' : '') + ')'), 'Status', ...(financialAccess ? ['Payment status', 'Allocation', 'Display rate Leones/USD'] : [])];
    const rows = filtered.map(r => [
      [r.guest?.firstName, r.guest?.lastName].filter(Boolean).join(' '), r.resNumber,
      formatDate(r.createdAt), activeTab === 'CHECKED_OUT' ? actualStayTime(r.checkedInAt, r.timezone) : formatDate(r.arrivalDate), activeTab === 'CHECKED_OUT' ? actualStayTime(r.checkedOutAt, r.timezone) : formatDate(r.departureDate),
      ...(showNights ? [r.nights ?? ''] : []), r.room?.roomNumber, r.room?.roomType?.name,
      ...visibleFinance.map(c => c.key === 'roomBalanceUsd' && r.financials?.allocation === 'UNALLOCATED' ? 'Allocation needed' : financeValue(r.financials?.[c.key], displayCurrency, r.displayExchangeRate)),
      statusConfig[r.status]?.label ?? r.status,
      ...(financialAccess ? [r.financials?.status, r.financials?.allocation, displayCurrency === 'SLE' ? r.displayExchangeRate : ''] : []),
    ]);
    const csv = [headings, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anzak-cloud-reservations.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const formRoom = rooms.find(room => room.id === form.roomId);
  const formReservation = reservations.find(reservation => reservation.id === editReservationId);

  return (
    <Layout>
      {receipt && <PaymentReceipt id={receipt} onClose={() => setReceipt('')}/>}
      {loadError && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError} <button onClick={() => void load()} className="underline">Retry loading</button></div>}
      {auditMessage && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{auditMessage} {can('view_night_audit') ? <a href="/night-audit" className="underline">Open Night Audit</a> : <span>Contact an authorized audit operator.</span>}</div>}
      <div className="reservations-workspace flex min-h-full flex-col">
        <header className="reservations-heading">
          <div><p className="reservations-eyebrow">Front desk</p><h1>Reservations</h1><p>Manage bookings, arrivals and guests currently staying with you.</p></div>
          <button className="reservations-inhouse-shortcut" onClick={() => setActiveTab('IN_HOUSE')} aria-pressed={activeTab === 'IN_HOUSE'}>
            <strong>{tabs.find(tab => tab.key === 'IN_HOUSE')?.count}</strong><span>In-house bookings<span>View current guests →</span></span>
          </button>
        </header>
        {/* Top Bar */}
        <div className="reservations-controls">
          <div className="reservations-control-stack">
            <div className="reservations-state-row">
              {/* Tabs */}
              <div className="reservations-states" role="group" aria-label="Reservation views">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    aria-pressed={activeTab === tab.key}
                    data-reservation-view={tab.key}
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

            <div className="reservations-toolbar">
              <button onClick={() => setActiveTab('ALL')} aria-pressed={activeTab === 'ALL'} data-reservation-view="ALL" className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium">All reservations ({reservations.length})</button>
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search reservations"
                placeholder="Search guest name or booking reference"
                className="w-64 border border-[#d7d7d2] bg-white px-3 py-1.5 text-[11px] text-[#30302e] outline-none focus:border-[#777773]"
              />

              {/* Action Buttons */}
              <button onClick={() => void load()} disabled={loading} className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium disabled:opacity-50">Refresh reservations</button>
              <button onClick={() => window.print()} className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium text-[#353532] hover:bg-[#f4f4f1]">
                🖨️ Print GR
              </button>
              <button onClick={exportReservations} className="border border-[#cfcfca] px-2 py-1.5 text-[10px] font-medium text-[#353532] hover:bg-[#f4f4f1]">
                📤 Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                disabled={!can('create_reservations') || !auditReady}
                className="reservations-new ml-1 bg-[#252525] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-black"
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
          {financialAccess && <select aria-label="Reservation display currency" className="border px-2 py-1 text-xs" value={displayCurrency} onChange={e => setCurrencyOverride(e.target.value)}><option value="USD">USD</option><option value="SLE">Leones (SLE estimate)</option></select>}
          <button onClick={() => setManageColumns(v => !v)} aria-expanded={manageColumns} className="border border-[#cfcfca] px-2 py-1 text-[10px] font-medium hover:bg-[#f4f4f1]">Manage Columns</button>
          {manageColumns && <div className="flex w-full flex-wrap justify-end gap-4 border-t pt-2" role="group" aria-label="Visible reservation columns">
            {[{key:'nights',label:'Nights'}, ...(financialAccess ? financeColumns : [])].map(c => <label key={c.key} className="flex items-center gap-1"><input type="checkbox" checked={!hiddenColumns.includes(c.key)} onChange={() => toggleColumn(c.key)} />{c.label}</label>)}
          </div>}
        </div>

        {financialAccess && <p className="border-b bg-white px-5 py-2 text-[10px] text-slate-500">
          Posted folio amounts · Room rate is an average, not a nightly tariff · “Allocation needed” means payments cover multiple services.
          {displayCurrency === 'SLE' && ' Leones figures are display estimates using the hotel’s configured rate; historical payments keep their recorded USD conversions. Missing rates are never guessed.'}
        </p>}
        {can('view_billing') && <details className="reservations-settlements"><summary>Guest settlements &amp; payments</summary><GuestSettlements revision={stayRevision}/></details>}
        <div className="reservations-list-heading">
          <div><h2>{activePanel?.label || 'All reservations'}</h2>
            <p>{activePanel?.description || 'All records, including cancelled bookings, no-shows and legacy records.'}</p></div>
          <span role="status">{loading ? 'Loading bookings…' : `${filtered.length} booking${filtered.length === 1 ? '' : 's'}${search ? ' matching search' : ''}`}</span>
        </div>
        {activeTab === 'DUE_OUT' && missingHotelDates > 0 && <p role="status" className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{missingHotelDates} in-house booking(s) have missing departure dates or hotel timezone information and cannot be classified as due today. They remain visible in In-house Guests.</p>}
        {/* Table */}
        <div className="reservations-list-scroll" tabIndex={0} role="region" aria-label="Scrollable reservation list">
          <div className="reservation-ledger-table">
            <table className="w-full border-collapse text-[11px]" aria-label="Reservation list">
              <thead>
                <tr className="border-b border-[#cbcbc6] text-[#4d4d49]">
                  <th className="w-[17%] px-2 py-2 text-left text-[9px] font-semibold">Guest Name</th>
                  <th className="px-2 py-2 text-left">Room Details</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Res No.<br />Voucher No.</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">Booking Date</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">{activeTab === 'CHECKED_OUT' ? 'Actual check-in' : 'Arrival'}</th>
                  <th className="w-[10%] px-2 py-2 text-left text-[9px] font-semibold">{activeTab === 'CHECKED_OUT' ? 'Actual checkout' : 'Expected checkout'}</th>
                  {showNights && <th className="px-2 py-2 text-right" aria-sort={sortColumn === 'nights' ? sortAsc ? 'ascending' : 'descending' : 'none'}><button onClick={() => sortBy('nights')}>Nights</button></th>}
                  {visibleFinance.map(c => <th key={c.key} className="px-2 py-2 text-right" title={c.tooltip} aria-sort={sortColumn === c.key ? sortAsc ? 'ascending' : 'descending' : 'none'}><button onClick={() => sortBy(c.key)}>{c.label}<small className="block font-normal">{displayCurrency}{c.key === 'roomRateUsd' ? ' · avg.' : ''}</small></button></th>)}
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className=" w-[8%] bg-white px-2 py-2 text-right text-[9px] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8 + Number(showNights) + visibleFinance.length} className="text-center py-12 text-slate-400">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8 + Number(showNights) + visibleFinance.length} className="text-center py-12 text-slate-400">{search ? 'No bookings match this search in the selected view.' : activePanel?.empty || 'No reservations found'}</td>
                  </tr>
                ) : (
                  filtered.map((res) => (
                    <tr key={res.id} className="border-b border-[#ecece8] align-top transition-colors hover:bg-[#fafaf8]">
                      <td className="px-2 py-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-[#353532]">
                            <button onClick={() => openBooking(res.id)} className="text-left underline decoration-dotted underline-offset-4" title="Open guest reservation">{res.guest?.title} {res.guest?.firstName} {res.guest?.lastName}</button>
                          </p>
                          <p className="mt-1 text-[10px] text-[#777773]">
                            👤 {res.adults} 👶 {res.children}
                          </p>
                          {inHouse(res) && <span className="reservation-inhouse-label">In-house</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-slate-800 text-sm">{res.room?.roomNumber} — {res.room?.roomType?.name}</p>
                        <p className="text-slate-400 text-xs">{res.mealPlan?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium text-[#353532]">{res.resNumber}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{formatDateTime(res.createdAt)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{activeTab === 'CHECKED_OUT' ? actualStayTime(res.checkedInAt, res.timezone) : formatDate(res.arrivalDate)}</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="leading-5 text-[#4d4d49]">{activeTab === 'CHECKED_OUT' ? actualStayTime(res.checkedOutAt, res.timezone) : formatDate(res.departureDate)}</p>
                      </td>
                      {showNights && <td className="px-2 py-3 text-right tabular-nums">{res.nights ?? '—'}</td>}
                      {visibleFinance.map(c => <td key={c.key} className="px-2 py-3 text-right tabular-nums" data-financial={c.key} title={c.tooltip}>
                        <button onClick={() => openBooking(res.id)} className={c.key === 'totalOutstandingUsd' || c.key === 'roomBalanceUsd' ? paymentClass(res.financials?.status) : 'text-slate-700'}>
                          {c.key === 'roomBalanceUsd' && res.financials?.allocation === 'UNALLOCATED' ? 'Allocation needed' : financeValue(res.financials?.[c.key], displayCurrency, res.displayExchangeRate)}
                        </button>
                        {c.key === 'totalOutstandingUsd' && <small className={'block ' + paymentClass(res.financials?.status)}>{res.financials?.status === 'CREDIT' ? 'Guest credit' : res.financials?.status?.replaceAll('_', ' ') || 'Not posted'}</small>}
                      </td>)}
                      <td className="px-2 py-3">
                        <span className={`inline-block min-w-[82px] border px-2 py-1 text-center text-[9px] font-medium leading-3 ${statusConfig[res.status]?.color}`}>
                          {inHouse(res) && <strong className="block">In-house</strong>}{statusConfig[res.status]?.label}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-2 py-3 shadow-[-2px_0_4px_#00000008]">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can('checkin_checkout') && inReservationPanel(res, 'UPCOMING', now) && (
                            <button
                              onClick={() => handleCheckIn(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check In'}
                            </button>
                          )}
                          {can('checkin_checkout') && inHouse(res) && (
                            <button
                              onClick={() => handleCheckOut(res.id)}
                              disabled={actionLoading === res.id}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium"
                            >
                              {actionLoading === res.id ? '...' : 'Check Out'}
                            </button>
                          )}
                          <button onClick={() => openBooking(res.id)} className="rounded border px-2 py-1 text-xs font-medium">Booking details</button>
                          <button
                            onClick={() => openEditReservation(res)}
                            disabled={!canOperate() || !can('create_reservations')}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded font-medium"
                          >
                            Edit
                          </button>
                          {res.status === 'RESERVED' && can('create_reservations') && (
                            <button type="button" onClick={() => { setCancelTarget(res); setCancelReason(''); setCancelError(''); }}
                              disabled={cancelBusy || actionLoading === res.id}
                              className="rounded bg-red-50 border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => openCollectPayment(res)}
                            disabled={(!can('record_payments')) || ['CANCELLED', 'NO_SHOW'].includes(res.status)}
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

      {selectedBooking && !showPaymentModal && !showForm && <BookingDetails
        key={selectedBooking.id} reservation={selectedBooking} busy={actionLoading === selectedBooking.id}
        onClose={closeBooking} onCheckIn={() => void handleCheckIn(selectedBooking.id)}
        onCheckOut={() => void handleCheckOut(selectedBooking.id)}
        onPayment={() => void openCollectPayment(selectedBooking)}
        onEdit={() => { closeBooking(); openEditReservation(selectedBooking); }}
      />}
      {selectedBookingId && !selectedBooking && !loading && !loadError && <div role="alert" className="p-4 text-red-700">This reservation is not available in the current hotel. <button onClick={closeBooking} className="underline">Close booking</button></div>}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-reservation-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="cancel-reservation-title" className="text-lg font-bold text-slate-900">Cancel reservation</h2>
            <p className="mt-2 text-sm text-slate-600">
              Reservation {cancelTarget.resNumber} for {cancelTarget.guest?.firstName} {cancelTarget.guest?.lastName}.
            </p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Only unpaid reservations can be cancelled here. Payment history and folio charges are never deleted or refunded automatically. Finance may need to reconcile outstanding charges.
            </p>
            <form onSubmit={e => { e.preventDefault(); void handleCancelReservation(); }} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-800">Cancellation reason
                <textarea autoFocus required minLength={5} maxLength={500} rows={4} value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)} disabled={cancelBusy}
                  placeholder="Why is the guest cancelling?" className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm" />
              </label>
              {cancelError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{cancelError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" disabled={cancelBusy} onClick={() => setCancelTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Go back</button>
                <button type="submit" disabled={cancelBusy || cancelReason.trim().length < 5}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {cancelBusy ? 'Cancelling...' : 'Confirm cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showPaymentModal && selectedPaymentReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Collect Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCollectPayment} className="p-6 space-y-4">
              <p className="text-sm">Charges: USD {Number(selectedFolio?.totalCharges || 0).toFixed(2)} · Paid: USD {Number(selectedFolio?.totalPayments || 0).toFixed(2)} · Outstanding: USD {Number(selectedFolio?.balance || 0).toFixed(2)}</p>
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
        <div className="reservation-editor-backdrop">
          <section role="dialog" aria-modal="true" aria-labelledby="reservation-editor-title" className="reservation-editor">
            <header className="reservation-editor-header">
              <div><p className="reservations-eyebrow">Booking workspace</p><h2 id="reservation-editor-title">{editReservationId ? 'Edit Reservation' : 'New Reservation'}</h2><p>Fields marked * are required.</p></div>
              <button type="button" aria-label="Close reservation form" onClick={() => { setShowForm(false); setEditReservationId(null); }}>✕</button>
            </header>
            <form onSubmit={handleSubmit} className="reservation-editor-form">
              <div className="reservation-editor-main">
                <fieldset className="reservation-form-section"><legend><span>01</span> Stay Details</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="booking-field-5" className="block text-sm font-medium text-slate-600 mb-1">Arrival Date *</label>
                  <input id="booking-field-5" required type="date" value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value, roomId: '', roomTypeId: '' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label htmlFor="booking-field-6" className="block text-sm font-medium text-slate-600 mb-1">Departure Date *</label>
                  <input id="booking-field-6" required type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value, roomId: '', roomTypeId: '' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label htmlFor="booking-field-10" className="block text-sm font-medium text-slate-600 mb-1">Reservation Type</label>
                  <select id="booking-field-10" value={form.reservationType} onChange={(e) => setForm({ ...form, reservationType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                  <option value="REGULAR">Regular</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
                </fieldset>
                <fieldset className="reservation-form-section"><legend><span>02</span> Room Selection / Rate Details</legend>
              <ReservationRoomPicker arrival={form.arrivalDate} departure={form.departureDate} selectedId={form.roomId} excludeId={editReservationId}
                roomTypes={[...new Map(rooms.map(room => [room.roomTypeId, { id: room.roomTypeId, name: room.roomType?.name || 'Room type' }])).values()]}
                onChange={handleRoomChange} onValidation={setRoomSelectionReady} />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="booking-field-7" className="block text-sm font-medium text-slate-600 mb-1">Adults</label>
                  <input id="booking-field-7" type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label htmlFor="booking-field-8" className="block text-sm font-medium text-slate-600 mb-1">Children</label>
                  <input id="booking-field-8" type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label htmlFor="booking-field-9" className="block text-sm font-medium text-slate-600 mb-1">Meal Plan</label>
                  <select id="booking-field-9" value={form.mealPlan} onChange={(e) => setForm({ ...form, mealPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400">
                    <option value="BED_BREAKFAST">Bed & Breakfast</option>
                    <option value="HALF_BOARD">Half Board</option>
                    <option value="FULL_BOARD">Full Board</option>
                    <option value="ROOM_ONLY">Room Only</option>
                  </select>
                </div>
              </div>
                </fieldset>
                <fieldset className="reservation-form-section"><legend><span>03</span> Guest Information</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="booking-field-0" className="block text-sm font-medium text-slate-600 mb-1">First Name *</label>
                  <input id="booking-field-0" required value={form.guestFirstName} onChange={(e) => setForm({ ...form, guestFirstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label htmlFor="booking-field-1" className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                  <input id="booking-field-1" required value={form.guestLastName} onChange={(e) => setForm({ ...form, guestLastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="booking-field-2" className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                  <input id="booking-field-2" type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="guest@email.com" />
                </div>
                <div>
                  <label htmlFor="booking-field-3" className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                  <input id="booking-field-3" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label htmlFor="booking-field-4" className="block text-sm font-medium text-slate-600 mb-1">Nationality</label>
                  <input id="booking-field-4" value={form.guestNationality} onChange={(e) => setForm({ ...form, guestNationality: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
              </div>
                </fieldset>
                <fieldset className="reservation-form-section"><legend><span>04</span> Other Information</legend>
              <div>
                <label htmlFor="booking-field-11" className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                  <textarea id="booking-field-11" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-blue-400" />
              </div>
                </fieldset>
              </div>
              <aside className="reservation-booking-summary" aria-label="Booking summary">
                <h3>Booking summary</h3><p>Stay details at a glance</p>
                <dl>
                  <div><dt>Check-in</dt><dd>{form.arrivalDate ? formatDate(form.arrivalDate) : 'Select a date'}</dd></div>
                  <div><dt>Check-out</dt><dd>{form.departureDate ? formatDate(form.departureDate) : 'Select a date'}</dd></div>
                  <div><dt>Room</dt><dd>{formRoom ? `${formRoom.roomNumber} — ${formRoom.roomType?.name || 'Room'}` : 'Select an available room'}</dd></div>
                  <div><dt>Guests</dt><dd>{form.adults} adults · {form.children} children</dd></div>
                  <div><dt>Meal plan</dt><dd>{form.mealPlan.replaceAll('_', ' ')}</dd></div>
                </dl>
                <p className="reservation-room-readiness" role="status">{form.roomId && roomSelectionReady ? 'Room selected · availability checked' : 'Select stay dates and an available room to continue.'}</p>
                {financialAccess && <div className="reservation-billing-summary">
                  <h3>Billing summary</h3>
                  {formReservation?.financials ? <>
                    <p>Saved folio · {displayCurrency}. Changes to this form are not included below.</p>
                    <dl>
                      {([['roomTotalUsd', 'Room charges'], ['taxUsd', 'Tax'], ['paidUsd', 'Paid'], ['totalOutstandingUsd', 'Outstanding balance']] as const).map(([key, label]) =>
                        <div key={key}><dt>{label}</dt><dd>{financeValue(formReservation.financials[key], displayCurrency, formReservation.displayExchangeRate)}</dd></div>)}
                    </dl>
                  </> : <p>Charges, taxes and the amount due will be available in the saved booking’s folio.</p>}
                </div>}
              </aside>
              <div className="reservation-editor-actions">
                <button type="button" onClick={() => { setShowForm(false); setEditReservationId(null); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium">Cancel</button>
                {!editReservationId && canOperate() && (
                  <button type="button" onClick={handleCreateAndEmail} disabled={formLoading || !roomSelectionReady || !form.roomId}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl text-sm">
                    {formLoading ? 'Creating...' : 'Create & Email'}
                  </button>
                )}
                <button type="submit" disabled={formLoading || !roomSelectionReady || !form.roomId}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
                  {formLoading ? (editReservationId ? 'Saving...' : 'Creating...') : (editReservationId ? 'Save Changes' : 'Create Reservation')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}
