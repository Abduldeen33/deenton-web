import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoom, deleteRoom, getRooms, getRoomTypes, updateRoom } from '../api/rooms';
import Layout from '../components/Layout';
import { can } from '../store/permissions';
import api from '../api/client';

const statusConfig: Record<string, string> = {
  VACANT: 'bg-white border-slate-200 text-slate-700', OCCUPIED: 'bg-green-50 border-green-200 text-green-800',
  RESERVED: 'bg-blue-50 border-blue-200 text-blue-800', BLOCKED: 'bg-red-50 border-red-200 text-red-800', DUE_OUT: 'bg-orange-50 border-orange-200 text-orange-800',
};
const emptyRoom = { roomNumber: '', roomTypeId: '', floor: '', notes: '' };

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyRoom);
  const canManageRooms = can('manage_staff');

  const load = () => {
    setLoading(true);
    Promise.all([getRooms(), getRoomTypes()])
      .then(([roomData, typeData]) => { setRooms(roomData); setRoomTypes(typeData); })
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

  return <Layout><div className="p-6">
    <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-800">Room View</h2><p className="mt-1 text-sm text-slate-500">Live status of all rooms</p></div>{canManageRooms && <button onClick={openCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ Add Room</button>}</div>
    <div className="mb-6 flex flex-wrap gap-2">{Object.entries(counts).map(([status, count]) => <button key={status} onClick={() => setFilter(status)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${filter === status ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{status === 'ALL' ? 'All' : status.replace('_', ' ')} ({count})</button>)}</div>
    {loading ? <p className="text-slate-400">Loading rooms...</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">{visibleRooms.map((room) => <button key={room.id} onClick={() => setSelected(room)} className={`rounded-xl border-2 p-3 text-left hover:shadow-md ${statusConfig[room.status]}`}><span className="text-lg font-bold">{room.roomNumber}</span><p className="mb-2 text-xs opacity-75">{room.roomType?.name}</p><span className="rounded bg-white/60 px-1.5 py-0.5 text-xs font-medium">{room.status.replace('_', ' ')}</span><p className="mt-1 text-xs font-medium">{room.housekeepingStatus.replace('_', ' ')}</p></button>)}</div>}
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
