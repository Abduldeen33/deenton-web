import { useEffect, useId, useMemo, useState } from 'react';
import api from '../api/client';
import { getToken } from '../store/auth';

type Choice = { id: string; roomNumber: string; roomTypeId: string; roomType: { name: string; baseRate?: string | number }; housekeepingStatus: string; readiness: string; rateBasis: string };
export default function ReservationRoomPicker({ arrival, departure, selectedId, excludeId, roomTypes, onChange, onValidation }: {
  arrival: string; departure: string; selectedId: string; excludeId?: string | null;
  roomTypes: { id: string; name: string }[];
  onChange: (id: string, roomTypeId: string) => void; onValidation: (ready: boolean) => void;
}) {
  const listId = useId(), token = getToken();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const validDates = !!arrival && !!departure && departure > arrival;
  const requestKey = JSON.stringify([arrival, departure, type, excludeId, token, retry]);
  const [result, setResult] = useState<{ key: string; rooms: Choice[]; error: string }>({ key: '', rooms: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    onValidation(false);
    if (!validDates) return () => controller.abort();
    api.get('/rooms/available', { signal: controller.signal, params: { arrival, departure, roomTypeId: type || undefined, excludeId: excludeId || undefined } })
      .then(({ data }) => {
        if (!controller.signal.aborted) { setResult({ key: requestKey, rooms: data.rooms, error: '' }); onValidation(true); }
      }).catch(error => {
        if (!controller.signal.aborted) setResult({ key: requestKey, rooms: [], error: String(error.response?.data?.message || 'Unable to load live room availability. Retry before booking.') });
      });
    return () => controller.abort();
  }, [arrival, departure, type, excludeId, requestKey, validDates, onValidation]);
  const loading = validDates && result.key !== requestKey;
  const rooms = useMemo(() => result.key === requestKey && validDates ? result.rooms : [], [result, requestKey, validDates]);
  useEffect(() => {
    if (selectedId && result.key === requestKey && !result.error && !rooms.some(r => r.id === selectedId)) onChange('', '');
  }, [selectedId, result, requestKey, rooms, onChange]);
  const filtered = rooms.filter(r => `${r.roomNumber} ${r.roomType.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = rooms.find(r => r.id === selectedId);
  const label = (room: Choice) => `${room.roomNumber} — ${room.roomType.name}`;
  const choose = (room: Choice) => { onChange(room.id, room.roomTypeId); setSearch(''); setOpen(false); };
  return <div className="space-y-2" aria-label="Live room selection">
    <label className="block text-sm font-medium text-slate-600">Room Type
      <select aria-label="Reservation room type" value={type} onChange={e => { setType(e.target.value); onChange('', ''); setSearch(''); setActive(0); }} className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2">
        <option value="">All Room Types</option>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <label htmlFor="reservation-room" className="block text-sm font-medium text-slate-600">Available Room *</label>
      <input id="reservation-room" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        autoComplete="off" aria-describedby="reservation-room-help" disabled={!validDates || loading || !!result.error && result.key === requestKey}
        value={open ? search : selected ? label(selected) : ''} placeholder={loading ? 'Checking room availability…' : 'Select Room — search number or type'}
        onFocus={() => { setOpen(true); setSearch(''); setActive(0); }}
        onChange={e => { setSearch(e.target.value); setOpen(true); setActive(0); if (selectedId) onChange('', ''); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault(); setOpen(true); setActive(old => e.key === 'Home' ? 0 : e.key === 'End' ? Math.max(0, filtered.length - 1) : Math.max(0, Math.min(filtered.length - 1, old + (e.key === 'ArrowDown' ? 1 : -1))));
          }
          if (e.key === 'Enter' && open) { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
        }} className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 disabled:bg-slate-100" />
      {open && <div id={listId} role="listbox" aria-label="Available rooms" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
        {filtered.map((room, i) => <button type="button" role="option" id={`${listId}-${i}`} aria-selected={selectedId === room.id} key={room.id} tabIndex={-1}
          ref={node => { if (i === active && open) node?.scrollIntoView({ block: 'nearest' }); }}
          onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(room)}
          className={`block min-h-11 w-full px-3 py-2 text-left ${i === active ? 'bg-sky-50' : 'bg-white'}`}>
          <strong className="block text-xs">{label(room)}</strong><small className="block text-slate-500">Available for these dates · {room.readiness}</small>
          {room.roomType.baseRate != null && <small className="text-slate-500" title={room.rateBasis}>USD {Number(room.roomType.baseRate).toFixed(2)} / night · current base rate</small>}
        </button>)}
        {!filtered.length && <p className="p-3 text-xs text-slate-500">No available rooms match this search or room type.</p>}
      </div>}
    </div>
    <p id="reservation-room-help" role="status" className="text-xs text-slate-500">{!validDates ? 'Choose arrival and departure dates first; departure must be later.' : loading ? 'Checking availability for the entire stay…' : result.error ? result.error : !rooms.length ? 'No rooms available for the entire selected stay. Change the dates or room type.' : `${rooms.length} rooms available. Booking availability is separate from current housekeeping readiness; same-day turnover requires checkout and cleaning.`}</p>
    {selected && <p className="text-xs text-slate-600">Selected: {label(selected)} · {selected.readiness}</p>}
    {result.error && result.key === requestKey && <button type="button" onClick={() => setRetry(n => n + 1)} className="text-xs underline">Retry room availability</button>}
  </div>;
}
