import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoom, deleteRoom, getStayView, updateRoom } from '../api/rooms';
import { addDays, guestName, indexStays, roomFlags, stayLabels } from '../components/stay-view-data';
import type { RackStay } from '../components/stay-view-data';
import Layout from '../components/Layout';
import { can } from '../store/permissions';
import api from '../api/client';

import StayTimeline from '../components/StayTimeline';

const emptyRoom = { roomNumber: '', roomTypeId: '', floor: '', notes: '' };

export default function Rooms() {
  const navigate = useNavigate();
  const openBooking = useCallback((id: string) => navigate('/reservations?reservation=' + encodeURIComponent(id)), [navigate]);
  const selectStay = useCallback((stay: RackStay) => openBooking(stay.id), [openBooking]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyRoom);
  const [rackStart, setRackStart] = useState('');
  const [days, setDays] = useState(14);
  const [range, setRange] = useState({ start: '', days: 14, today: '', timezone: 'Africa/Freetown', propertyName: '' });
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const revision = useRef(0);
  const request = useRef<AbortController | null>(null);
  const canManageRooms = can('manage_staff');

  const load = useCallback(async () => {
    const current = ++revision.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await getStayView(rackStart || undefined, days, controller.signal);
      if (current !== revision.current) return;
      setRooms(data.rooms.sort((a: { roomNumber: string }, b: { roomNumber: string }) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })));
      setRoomTypes(data.roomTypes); setReservations(data.reservations);
      setRange({ start: data.start, days: data.days, today: data.today, timezone: data.timezone, propertyName: data.propertyName });
      setError('');
    } catch {
      if (!controller.signal.aborted && current === revision.current) setError('Unable to refresh room availability. Displayed information may be out of date.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [rackStart, days]);
  useEffect(() => {
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { ++revision.current; request.current?.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);

  const updateStatus = async (id: string, data: any) => {
    try { await api.patch(`/rooms/${id}/status`, data); setSelected(null); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Update failed'); }
  };
  const openCreate = () => { setEditing(null); setForm({ ...emptyRoom, roomTypeId: roomTypes[0]?.id ?? '' }); setShowForm(true); };
  const openEdit = (room: any) => {
    setEditing(room);
    setForm({ roomNumber: room.roomNumber, roomTypeId: room.roomTypeId, floor: room.floor ?? '', notes: room.notes ?? '' });
    setSelected(null); setShowForm(true);
  };
  const saveRoom = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const data = { ...form, floor: form.floor === '' ? undefined : Number(form.floor) };
      if (editing) await updateRoom(editing.id, data); else await createRoom(data);
      setShowForm(false); load();
    } catch (err: any) { alert(err.response?.data?.message || 'Unable to save room'); }
  };
  const removeRoom = async (room: any) => {
    if (!confirm(`Delete room ${room.roomNumber}? This cannot be undone.`)) return;
    try { await deleteRoom(room.id); setSelected(null); load(); }
    catch (err: any) { alert(err.response?.data?.message || 'Unable to delete room'); }
  };
  const byRoom = useMemo(() => indexStays(reservations), [reservations]);
  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: 0, VACANT: 0, OCCUPIED: 0, RESERVED: 0, BLOCKED: 0, DUE_OUT: 0, DIRTY: 0 };
    for (const room of rooms) {
      const flags = roomFlags(room, byRoom.get(room.id) ?? [], range.today);
      for (const key of Object.keys(result)) if (flags[key as keyof typeof flags]) result[key]++;
    }
    return result;
  }, [rooms, byRoom, range.today]);
  const visibleRooms = useMemo(() => rooms.filter(room => {
    const stays = byRoom.get(room.id) ?? [];
    const flags = roomFlags(room, stays, range.today);
    const term = search.trim().toLowerCase();
    return flags[filter as keyof typeof flags] && (typeFilter === 'ALL' || room.roomTypeId === typeFilter)
      && (!term || room.roomNumber.toLowerCase().includes(term) || stays.some(s => guestName(s).toLowerCase().includes(term) || s.resNumber?.toLowerCase().includes(term)));
  }), [rooms, byRoom, range.today, filter, typeFilter, search]);
  const rackDates = useMemo(() => range.start ? Array.from({ length: range.days }, (_, i) => new Date(addDays(range.start, i) + 'T00:00:00Z')) : [], [range.start, range.days]);
  const moveRack = (offset: number) => { if (range.start) setRackStart(addDays(range.start, offset)); };

  return <Layout><div className="sv-page">
    <header className="sv-toolbar">
      <div className="sv-toolbar-title"><h1>Stay View</h1><p>{range.propertyName || 'Room rack'} · {range.timezone}</p></div>
      <button onClick={() => void load()} disabled={loading} aria-label="Refresh stay view">{loading ? 'Refreshing…' : 'Refresh'}</button>
      {canManageRooms && <button onClick={openCreate}>+ Add Room</button>}
      {can('create_reservations') && <button className="sv-primary" onClick={() => navigate('/reservations?new=1')}>+ New Reservation</button>}
    </header>
    <div className="sv-filters">
      <label>From <input aria-label="Stay view start date" type="date" value={rackStart || range.start} onChange={e => { if (e.target.value) setRackStart(e.target.value); }} /></label>
      <button onClick={() => moveRack(-days)} aria-label="Previous dates">‹</button>
      <button onClick={() => { if (rackStart) setRackStart(''); else void load(); }}>Today</button>
      <button onClick={() => moveRack(days)} aria-label="Next dates">›</button>
      <select aria-label="Days in stay view" value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 14, 21, 30].map(n => <option key={n} value={n}>{n} days</option>)}</select>
      <select aria-label="Room type filter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="ALL">All room types</option>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <select aria-label="Reservation status filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All active / completed bookings</option>{Object.entries(stayLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <input type="search" aria-label="Search guests or rooms" placeholder="Search guest, room or booking…" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <section className="sv-stats" aria-label="Current room statistics">
      {Object.entries(counts).map(([status, count]) => <button key={status} onClick={() => setFilter(status)} aria-pressed={filter === status}>{status === 'ALL' ? 'All' : status === 'DUE_OUT' ? 'Due out' : status[0] + status.slice(1).toLowerCase()} <b>{count}</b></button>)}
      <small>Current status · Dirty may also be occupied</small>
    </section>
    {error && <div className="sv-error" role="alert">{error} <button onClick={() => void load()}>Retry room availability</button></div>}
    <div className="sv-workspace" aria-busy={loading}>
      {!range.start ? <p className="sv-loading">{error ? 'Room rack unavailable.' : 'Loading room rack…'}</p> : <StayTimeline rooms={visibleRooms} reservations={reservations} dates={rackDates} today={range.today} timezone={range.timezone} statusFilter={statusFilter} onSelect={setSelected} onSelectStay={can('view_reservations') ? selectStay : undefined} />}
    </div>
  </div>
  {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-6"><div><h3 className="text-lg font-bold">Room {selected.roomNumber}</h3><p className="text-sm text-slate-500">{selected.roomType?.name} · Floor {selected.floor ?? '—'}</p></div><button onClick={() => setSelected(null)} className="text-xl text-slate-400">×</button></div><div className="space-y-4 p-6">
    {can('view_reservations') && <div className="space-y-2 border-b pb-3"><p className="font-semibold">Guest reservations</p>{reservations.filter(r => r.roomId === selected.id && ['RESERVED','ARRIVED','STAYOVER','DUE_OUT'].includes(r.status)).map(r => <button key={r.id} onClick={() => openBooking(r.id)} className="block w-full rounded border px-3 py-2 text-left text-sm text-blue-700">{r.guest?.firstName} {r.guest?.lastName} · #{r.resNumber} · {r.status === 'RESERVED' ? 'Check-in / confirmation' : 'Check-out / booking details'}</button>)}<p className="text-xs text-slate-500">Open a guest reservation for check-in, checkout and confirmation.</p></div>}
    {selected.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{selected.notes}</p>}
    {can('update_housekeeping') && <div><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Housekeeping</p><div className="grid grid-cols-2 gap-2">{['CLEAN', 'DIRTY', 'INSPECTED', 'DO_NOT_DISTURB'].map((status) => <button key={status} onClick={() => updateStatus(selected.id, { housekeepingStatus: status })} className="rounded-lg border border-slate-200 py-2 text-sm">{status.replace('_', ' ')}</button>)}</div></div>}
    {can('block_rooms') && <button onClick={() => updateStatus(selected.id, selected.status === 'BLOCKED' ? { status: 'VACANT', blockReason: '' } : { status: 'BLOCKED', blockReason: prompt('Reason for blocking this room?') || undefined })} className="w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-700">{selected.status === 'BLOCKED' ? 'Unblock Room' : 'Block Room'}</button>}
    {canManageRooms && <div className="grid grid-cols-2 gap-2 border-t pt-4"><button onClick={() => openEdit(selected)} className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white">Edit Room</button><button onClick={() => removeRoom(selected)} disabled={selected.status === 'OCCUPIED'} className="rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:bg-slate-300">Delete Room</button></div>}
  </div></div></div>}
  {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-6"><h3 className="text-lg font-bold">{editing ? 'Edit Room' : 'Add Room'}</h3><button onClick={() => setShowForm(false)} className="text-xl text-slate-400">×</button></div><form onSubmit={saveRoom} className="space-y-4 p-6">
    <label className="block text-sm text-slate-600">Room number<input required value={form.roomNumber} onChange={(event) => setForm({ ...form, roomNumber: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm text-slate-600">Room type<select required value={form.roomTypeId} onChange={(event) => setForm({ ...form, roomTypeId: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">Select room type</option>{roomTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
    <label className="block text-sm text-slate-600">Floor<input type="number" value={form.floor} onChange={(event) => setForm({ ...form, floor: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <label className="block text-sm text-slate-600">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
    <div className="flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg bg-slate-100 py-2 text-sm">Cancel</button><button type="submit" className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white">Save Room</button></div>
  </form></div></div>}
  </Layout>;
}
