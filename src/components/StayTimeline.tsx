import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { dateKey, guestName, indexStays, inventoryFor, isBlocked, layoutStays, roomFlags, stayLabels } from './stay-view-data';
import type { RackRoom, RackStay } from './stay-view-data';
import './stay-view.css';

const roomColors = { Available: '#2563eb', Dirty: '#dc2626', Blocked: '#27272a', Occupied: '#16834c', Reserved: '#2563eb', 'Checked out': '#64748b' };
const emptyStays: RackStay[] = [];
type RowProps = { room: RackRoom; stays: RackStay[]; dates: string[]; today: string; statusFilter: string; onSelect: (room: RackRoom) => void; onSelectStay?: (stay: RackStay) => void };
const RoomRow = memo(function RoomRow({ room, stays, dates, today, statusFilter, onSelect, onSelectStay }: RowProps) {
  const bars = useMemo(() => layoutStays(stays, dates[0], dates.length, statusFilter), [stays, dates, statusFilter]);
  const lanes = Math.max(1, ...bars.map(b => b.lane + 1));
  const flags = roomFlags(room, stays, today);
  const label = flags.BLOCKED ? 'Blocked' : flags.OCCUPIED ? 'Occupied' : flags.RESERVED ? 'Reserved' : 'Available';
  return <div className="sv-grid sv-room-row" data-room={room.roomNumber} style={{ minHeight: lanes * 40 }}>
    <button className="sv-room sv-sticky" onClick={() => onSelect(room)} title={`${room.roomNumber} · ${room.roomType?.name} · ${label}${flags.DIRTY ? ' · Dirty' : ''}`}>
      <span className="sv-dot" style={{ background: roomColors[label] }} /><strong>{room.roomNumber}</strong>
      <span className="sv-room-name">{room.roomType?.name}</span>
      {flags.DIRTY && <span className="sv-dirty" title="Housekeeping: Dirty">Dirty</span>}
      {flags.DUE_OUT && <span className="sv-due" title="Checkout is due">Due</span>}
      <span className="sr-only">{label}</span>
    </button>
    <div className="sv-nights" style={{ gridColumn: `2 / span ${dates.length}`, height: lanes * 40 }}>
      {dates.map((day, i) => <button key={day} className={`sv-cell ${day === today ? 'sv-today' : ''} ${isBlocked(room) ? 'sv-blocked-cell' : ''}`}
        style={{ left: i * 100, width: 100 }} onClick={() => onSelect(room)}
        aria-label={`Room ${room.roomNumber}, ${day}, ${isBlocked(room) ? 'blocked' : 'housekeeping details'}`} />)}
      {isBlocked(room) && <span className="sv-blocked-label">Blocked{room.blockReason ? ` · ${room.blockReason}` : ''}</span>}
      {bars.map(({ stay, left, right, lane, nights, clippedStart, clippedEnd }) => <button key={stay.id}
        className={`sv-stay sv-status-${stay.status}`} data-stay={stay.id} data-nights={nights}
        style={{ left: left * 100 + 2, width: Math.max(22, (right - left) * 100 - 4), top: lane * 40 + 6 }}
        onClick={() => onSelectStay ? onSelectStay(stay) : onSelect(room)}
        title={`${guestName(stay)}${stay.resNumber ? ` · #${stay.resNumber}` : ''} | ${stayLabels[stay.status] ?? stay.status} | Arrival ${dateKey(stay.arrivalDate)} · Checkout ${dateKey(stay.departureDate)} | ${nights} nights${lanes > 1 ? ' | Overlapping records — review booking details' : ''}`}>
        {clippedStart && '‹ '}{guestName(stay)} <span>· {stayLabels[stay.status] ?? stay.status}</span>{clippedEnd && ' ›'}
      </button>)}
    </div>
  </div>;
});

export default function StayTimeline({ rooms, reservations, dates, today = dateKey(new Date()), timezone = 'Africa/Freetown', statusFilter = 'ALL', onSelect, onSelectStay }: {
  rooms: RackRoom[]; reservations: RackStay[]; dates: Date[]; today?: string; timezone?: string; statusFilter?: string;
  onSelect: (room: RackRoom) => void; onSelectStay?: (stay: RackStay) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dayKeys = useMemo(() => dates.map(dateKey), [dates]);
  const byRoom = useMemo(() => indexStays(reservations), [reservations]);
  const groups = useMemo(() => {
    const result = new Map<string, { name: string; rooms: RackRoom[] }>();
    for (const room of rooms) {
      const key = room.roomTypeId ?? room.roomType?.id ?? room.roomType?.name ?? 'rooms';
      const group = result.get(key) ?? { name: room.roomType?.name ?? 'Rooms', rooms: [] };
      group.rooms.push(room); result.set(key, group);
    }
    return [...result].map(([id, group]) => ({ id, ...group, inventory: inventoryFor(group.rooms, byRoom, dayKeys, today, timezone) }));
  }, [rooms, byRoom, dayKeys, today, timezone]);
  const totals = useMemo(() => inventoryFor(rooms, byRoom, dayKeys, today, timezone), [rooms, byRoom, dayKeys, today, timezone]);
  if (!dates.length) return null;
  return <>
    <div className="sv-legend" aria-label="Room colour legend">
      {Object.entries(roomColors).map(([name, color]) => <span key={name}><i className="sv-dot" style={{ background: color }} />{name}</span>)}
      <span className="sv-legend-note">Room dots: current status · Bars: booked nights, excluding checkout</span>
    </div>
    <div className="sv-scroll" tabIndex={0} aria-label="Scrollable room rack">
      <div className="sv-timeline" aria-label="Room stay timeline" style={{ '--sv-days': dates.length, width: 240 + dates.length * 100 } as CSSProperties}>
        <div className="sv-grid sv-date-header"><strong className="sv-sticky">Room / current status</strong>{dates.map(d => <div key={dateKey(d)} className={dateKey(d) === today ? 'sv-today' : ''} aria-current={dateKey(d) === today ? 'date' : undefined}>
          <span>{d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
          <strong>{d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</strong>
        </div>)}</div>
        {groups.map(group => <section key={group.id} aria-label={group.name}>
          <div className="sv-grid sv-type-row"><button className="sv-sticky" aria-expanded={!collapsed.has(group.id)} onClick={() => setCollapsed(old => { const next = new Set(old); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}>
            <span>{collapsed.has(group.id) ? '+' : '−'}</span><strong title={group.name}>{group.name}</strong><small>{group.rooms.length}</small>
          </button>{group.inventory.map((value, i) => <span key={dayKeys[i]} className={dayKeys[i] === today ? 'sv-today' : ''} title={`${value.available} available of ${group.rooms.length} rooms`}>{value.available} <small>available</small></span>)}</div>
          {!collapsed.has(group.id) && group.rooms.map(room => <RoomRow key={room.id} room={room} stays={byRoom.get(room.id) ?? emptyStays} dates={dayKeys} today={today} statusFilter={statusFilter} onSelect={onSelect} onSelectStay={onSelectStay} />)}
        </section>)}
        {!rooms.length && <p className="sv-empty">No rooms match these filters. Clear the search or choose All.</p>}
        <div className="sv-footer">
          <div className="sv-grid"><strong className="sv-sticky">Available inventory</strong>{totals.map((v, i) => <span key={dayKeys[i]} className={dayKeys[i] === today ? 'sv-today' : ''} data-available={dayKeys[i]}>{v.available}</span>)}</div>
          <div className="sv-grid"><strong className="sv-sticky">Occupancy (%)</strong>{totals.map((v, i) => <span key={dayKeys[i]} className={dayKeys[i] === today ? 'sv-today' : ''} data-occupancy={dayKeys[i]} title={`${v.booked} booked rooms / ${v.sellable} unblocked rooms`}><i className="sv-meter"><i style={{ width: `${v.occupancy}%` }} /></i>{v.occupancy}%</span>)}</div>
        </div>
      </div>
    </div>
    <p className="sv-footnote">Counts cover displayed rooms and all their bookings, regardless of booking-status filter. Dirty rooms and guests still in-house reduce today's ready inventory, not future booked-night occupancy. Current blocks apply across this view; dated block history is not stored.</p>
  </>;
}
