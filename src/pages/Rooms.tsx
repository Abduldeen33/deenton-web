import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoom, deleteRoom, getRooms, getRoomTypes, updateRoom } from '../api/rooms';
import { getReservations } from '../api/reservations';
import Layout from '../components/Layout';
import { can } from '../store/permissions';
import api from '../api/client';

const emptyRoom = { roomNumber: '', roomTypeId: '', floor: '', notes: '' };

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyRoom);
  const [rackStart, setRackStart] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const canManageRooms = can('manage_staff');

  const load = () => {
    setLoading(true);
    Promise.all([getRooms(), getRoomTypes(), getReservations()])
      .then(([roomData, typeData, reservationData]) => { setRooms(roomData); setRoomTypes(typeData); setReservations(reservationData); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

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
  const counts: Record<string, number> = { ALL: rooms.length, VACANT: 0, OCCUPIED: 0, RESERVED: 0, BLOCKED: 0, DUE_OUT: 0 };
  rooms.forEach((room) => { if (counts[room.status] !== undefined) counts[room.status]++; });
  const visibleRooms = filter === 'ALL' ? rooms : rooms.filter((room) => room.status === filter);
  const rackDates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(rackStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const dateKey = (date: Date | string) => new Date(date).toISOString().slice(0, 10);
  const roomGroups = visibleRooms.reduce((groups: Record<string, any[]>, room) => {
    const key = room.roomType?.name ?? 'Unassigned room type';
    (groups[key] ??= []).push(room);
    return groups;
  }, {});
  const moveRack = (days: number) => setRackStart((current) => {
    const next = new Date(current);
    next.setDate(next.getDate() + days);
    return next;
  });
  const reservationForCell = (roomId: string, date: Date) => reservations.find((reservation) => {
    if (reservation.roomId !== roomId || ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'].includes(reservation.status)) return false;
    const day = dateKey(date);
    return day >= dateKey(reservation.arrivalDate) && day < dateKey(reservation.departureDate);
  });

  return <Layout><div className="flex h-full min-h-full flex-col bg-[#f7f8fb] text-[#30313b]">
    <header className="border-b border-[#e0e2e9] bg-white px-5 py-2.5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-semibold">Anzak Tours &amp; Resorts</p><p className="text-[10px] text-[#777985]">Anzak Cloud PMS · Room rack</p></div><div className="flex items-center gap-2"><button onClick={() => moveRack(-7)} className="border border-[#d6d8e0] px-2 py-1 text-xs hover:bg-[#f5f6fa]">‹</button><button onClick={() => { const today = new Date(); today.setHours(0, 0, 0, 0); setRackStart(today); }} className="border border-[#d6d8e0] px-2 py-1 text-[10px] font-medium hover:bg-[#f5f6fa]">Today</button><button onClick={() => moveRack(7)} className="border border-[#d6d8e0] px-2 py-1 text-xs hover:bg-[#f5f6fa]">›</button>{canManageRooms && <button onClick={openCreate} className="ml-2 bg-[#292b35] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-black">+ Add Room</button>}</div></div></header>
    <section className="border-b border-[#e0e2e9] bg-white px-5 py-2"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-[#777985]">Room status</span>{Object.entries(counts).map(([status, count]) => <button key={status} onClick={() => setFilter(status)} className={`border px-3 py-1.5 text-[10px] font-medium transition-colors ${filter === status ? 'border-[#6d63d9] bg-[#eeedff] text-[#4d45b7]' : 'border-[#e0e2e9] bg-[#fafbfc] text-[#626574] hover:bg-[#f1f2f6]'}`}>{status === 'ALL' ? 'All' : status.replace('_', ' ')} <span className="ml-1 opacity-70">{count}</span></button>)}<span className="ml-auto text-[10px] text-[#777985]">Click a room to manage its status</span></div></section>
    <main className="flex-1 overflow-auto p-3"><div className="min-w-[1240px] overflow-hidden border border-[#dfe1e8] bg-white shadow-sm">
      <div className="grid border-b border-[#dfe1e8] bg-[#fafbfe]" style={{ gridTemplateColumns: `250px repeat(${rackDates.length}, minmax(72px, 1fr))` }}><div className="flex items-center border-r border-[#dfe1e8] px-3 text-[10px] font-semibold uppercase tracking-wide text-[#676a77]">Room Type</div>{rackDates.map((date) => <div key={date.toISOString()} className={`border-r border-[#e8e9ee] px-1 py-2 text-center ${dateKey(date) === dateKey(new Date()) ? 'bg-[#e8ecff] text-[#4d45b7]' : ''}`}><p className="text-[9px] font-medium uppercase text-[#858794]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p><p className="mt-0.5 text-[11px] font-semibold">{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p></div>)}</div>
      {loading ? <div className="p-10 text-center text-sm text-slate-400">Loading room rack...</div> : Object.entries(roomGroups).map(([type, group]) => <div key={type}><div className="grid border-b border-[#dfe1e8] bg-[#f4f6fa]" style={{ gridTemplateColumns: `250px repeat(${rackDates.length}, minmax(72px, 1fr))` }}><div className="border-r border-[#dfe1e8] px-3 py-2 text-[11px] font-semibold">− &nbsp;{type} <span className="ml-1 text-[10px] font-normal text-[#858794]">({group.length})</span></div>{rackDates.map((date) => <div key={date.toISOString()} className={`border-r border-[#e8e9ee] py-1 text-center text-[10px] ${dateKey(date) === dateKey(new Date()) ? 'bg-[#f0f2ff]' : ''}`}><span className="rounded bg-[#fff3d8] px-1 text-[#8d6b21]">{group.filter((room) => room.status === 'VACANT').length}</span></div>)}</div>{group.map((room) => <div key={room.id} className="grid border-b border-[#ececf0] last:border-b-0" style={{ gridTemplateColumns: `250px repeat(${rackDates.length}, minmax(72px, 1fr))` }}><button onClick={() => setSelected(room)} className="border-r border-[#dfe1e8] px-3 py-2 text-left text-[11px] hover:bg-[#f5f6fb]"><span className="font-medium">{room.roomType?.name} - {room.roomNumber}</span><span className="ml-2 text-[9px] text-[#858794]">{room.housekeepingStatus?.replaceAll('_', ' ')}</span></button>{rackDates.map((date) => { const reservation = reservationForCell(room.id, date); const todayCell = dateKey(date) === dateKey(new Date()); return <div key={date.toISOString()} className={`min-h-10 border-r border-[#ececf0] p-1 ${todayCell ? 'bg-[#f7f8ff]' : ''}`}>{reservation ? <button onClick={() => setSelected(room)} title={`${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`} className="h-full w-full bg-[#6d63d9] px-1 text-left text-[9px] font-medium text-white hover:bg-[#554bbc]">{reservation.guest?.lastName ?? 'Reserved'}</button> : room.status === 'BLOCKED' ? <button onClick={() => setSelected(room)} className="h-full w-full bg-[#fde8e8] text-[9px] text-[#b33b3b]">Blocked</button> : <button onClick={() => setSelected(room)} className="h-full w-full text-[9px] text-[#a3a5af] hover:bg-[#f2f3f7]">{room.status === 'VACANT' ? '' : room.status.replace('_', ' ')}</button>}</div>; })}</div>)}</div>)}
      <div className="grid border-t border-[#dfe1e8] bg-[#f7f8fb]" style={{ gridTemplateColumns: `250px repeat(${rackDates.length}, minmax(72px, 1fr))` }}><div className="px-3 py-2 text-[10px] font-semibold text-[#676a77]">Available inventory</div>{rackDates.map((date) => <div key={date.toISOString()} className={`border-l border-[#e5e6ec] py-2 text-center text-[10px] font-semibold ${dateKey(date) === dateKey(new Date()) ? 'bg-[#e8ecff] text-[#4d45b7]' : ''}`}>{visibleRooms.filter((room) => !reservationForCell(room.id, date) && room.status === 'VACANT').length}</div>)}</div>
    </div></main>
  </div>
  {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-6"><div><h3 className="text-lg font-bold">Room {selected.roomNumber}</h3><p className="text-sm text-slate-500">{selected.roomType?.name} · Floor {selected.floor ?? '—'}</p></div><button onClick={() => setSelected(null)} className="text-xl text-slate-400">×</button></div><div className="space-y-4 p-6">
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
