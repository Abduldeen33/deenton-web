export type RackRoom = {
  id: string; roomNumber: string; status: string; isBlocked?: boolean;
  housekeepingStatus?: string; blockReason?: string | null; roomTypeId?: string;
  roomType?: { id?: string; name: string };
};
export type RackStay = {
  id: string; roomId: string; arrivalDate: string; departureDate: string;
  status: string; resNumber?: string; checkedOutAt?: string | null;
  guest?: { firstName: string; lastName: string };
};
export const stayLabels: Record<string, string> = {
  RESERVED: 'Confirmed', ARRIVED: 'Checked in', STAYOVER: 'Stayover',
  DUE_OUT: 'Due out', CHECKED_OUT: 'Checked out', CANCELLED: 'Cancelled', NO_SHOW: 'No show',
};
export const dateKey = (value: string | Date) => typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
export const ordinal = (value: string | Date) => Date.parse(dateKey(value) + 'T00:00:00Z') / 86400000;
export const addDays = (value: string, count: number) => new Date((ordinal(value) + count) * 86400000).toISOString().slice(0, 10);
export const isInHouse = (stay: RackStay) => ['ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(stay.status);
export const isBlocked = (room: RackRoom) => room.isBlocked || ['BLOCKED', 'OUT_OF_ORDER'].includes(room.status);
export const guestName = (stay: RackStay) => `${stay.guest?.firstName ?? ''} ${stay.guest?.lastName ?? ''}`.trim() || 'Reservation';
export function indexStays(stays: RackStay[]) {
  const result = new Map<string, RackStay[]>();
  for (const stay of stays) {
    const rows = result.get(stay.roomId) ?? [];
    rows.push(stay); result.set(stay.roomId, rows);
  }
  return result;
}
export function roomFlags(room: RackRoom, stays: RackStay[], today: string) {
  const occupied = stays.some(isInHouse);
  const blocked = !!isBlocked(room);
  const reserved = stays.some(s => s.status === 'RESERVED' && dateKey(s.arrivalDate) <= today && dateKey(s.departureDate) > today);
  return { ALL: true, VACANT: !blocked && !occupied && !reserved, OCCUPIED: occupied, RESERVED: reserved,
    BLOCKED: blocked, DUE_OUT: stays.some(s => isInHouse(s) && (s.status === 'DUE_OUT' || dateKey(s.departureDate) <= today)),
    DIRTY: room.housekeepingStatus === 'DIRTY' };
}
export function usesNight(stay: RackStay, day: string, today: string, timezone: string) {
  if (['CANCELLED', 'NO_SHOW'].includes(stay.status)) return false;
  if (dateKey(stay.arrivalDate) > day || dateKey(stay.departureDate) <= day) return false;
  if (stay.status === 'CHECKED_OUT') {
    if (day >= today) return false;
    if (stay.checkedOutAt) {
      const actual = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(stay.checkedOutAt));
      if (day >= actual) return false;
    }
  }
  return true;
}
export function inventoryFor(rooms: RackRoom[], byRoom: Map<string, RackStay[]>, dates: string[], today: string, timezone: string) {
  return dates.map(day => {
    let available = 0, booked = 0, sellable = 0;
    for (const room of rooms) {
      const blocked = isBlocked(room);
      const stays = byRoom.get(room.id) ?? [];
      const used = stays.some(s => usesNight(s, day, today, timezone));
      if (!blocked) { sellable++; if (used) booked++; }
      // Dirty / overdue in-house rooms affect readiness today, not booked nights.
      const unready = day === today && (room.housekeepingStatus === 'DIRTY' || stays.some(isInHouse));
      if (!blocked && !used && !unready) available++;
    }
    return { available, booked, sellable, occupancy: sellable ? Math.round(booked / sellable * 100) : 0 };
  });
}
export function layoutStays(stays: RackStay[], start: string, days: number, statusFilter = 'ALL') {
  const from = ordinal(start), to = from + days;
  const laneEnds: number[] = [];
  return stays.filter(s => statusFilter === 'ALL' ? !['CANCELLED', 'NO_SHOW'].includes(s.status) : s.status === statusFilter)
    .map(stay => ({ stay, arrival: ordinal(stay.arrivalDate), departure: ordinal(stay.departureDate) }))
    .filter(s => s.arrival < to && (s.departure > from || s.arrival === s.departure && s.arrival >= from))
    .sort((a, b) => a.arrival - b.arrival || a.departure - b.departure || a.stay.id.localeCompare(b.stay.id))
    .map(({ stay, arrival, departure }) => {
      const left = Math.max(from, arrival) - from, right = Math.min(to, departure) - from;
      // Day-use markers occupy a small visual slot but contribute zero nights.
      let lane = laneEnds.findIndex(end => end <= left);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(right, left + 0.25);
      return { stay, left, right, lane, nights: departure - arrival, clippedStart: arrival < from, clippedEnd: departure > to };
    });
}
