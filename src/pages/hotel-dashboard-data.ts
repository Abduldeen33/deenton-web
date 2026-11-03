import { hotelToday, isInHouse } from '../components/reservation-panels';

export type DashboardRoom = {
  id: string; roomNumber: string; status: string; isBlocked?: boolean;
  housekeepingStatus?: string | null; roomType?: { name: string };
};
export type DashboardStay = {
  id: string; roomId: string; status: string; arrivalDate: string; departureDate: string;
  checkedInAt?: string | null; checkedOutAt?: string | null; resNumber?: string;
  adults?: number | null; children?: number | null;
  guest?: { firstName: string; lastName: string }; room?: DashboardRoom;
};
export type RoomSnapshot = {
  rooms: DashboardRoom[]; reservations: DashboardStay[];
  propertyName: string; today: string; timezone: string;
};
export type OperationTask = { id: string; status: string; workflowVersion?: number | null };
export const roomUnavailable = (room: DashboardRoom) => !!room.isBlocked || ['BLOCKED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE'].includes(room.status);
export const dateLabel = (day: string | null | undefined) => day && /^\d{4}-\d{2}-\d{2}$/.test(day)
  ? new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';

// Presentation only: uses persisted stay status, never a past departure as checkout.
export function dashboardOverview(snapshot: RoomSnapshot | null, reservations: DashboardStay[] | null, now: Date) {
  const timezone = snapshot?.timezone;
  const today = hotelToday(timezone, now);
  const inHouse = reservations?.filter(isInHouse) ?? null;
  const arrivals = today && reservations ? reservations.filter(r => r.status === 'RESERVED' && !r.checkedInAt && !r.checkedOutAt && r.arrivalDate.slice(0, 10) === today) : null;
  const dueOut = today && inHouse ? inHouse.filter(r => r.departureDate.slice(0, 10) === today) : null;
  const departed = today && reservations ? reservations.filter(r => r.status === 'CHECKED_OUT' && r.checkedOutAt && Number.isFinite(Date.parse(r.checkedOutAt)) && hotelToday(timezone, new Date(r.checkedOutAt)) === today) : null;
  const guestCount = inHouse && inHouse.every(r => Number.isInteger(r.adults) && Number(r.adults) >= 0 && Number.isInteger(r.children) && Number(r.children) >= 0)
    ? inHouse.reduce((sum, r) => sum + r.adults! + r.children!, 0) : null;
  const activeRoomIds = new Set(snapshot?.reservations.filter(isInHouse).map(r => r.roomId));
  const sellable = snapshot?.rooms.filter(r => !roomUnavailable(r));
  const occupied = sellable?.filter(r => activeRoomIds.has(r.id)).length ?? null;
  const available = today && sellable ? sellable.filter(r => r.status === 'VACANT' && !activeRoomIds.has(r.id) && !snapshot!.reservations.some(s => s.roomId === r.id && s.status === 'RESERVED' && !s.checkedOutAt && s.arrivalDate.slice(0, 10) <= today && s.departureDate.slice(0, 10) > today)).length : null;
  const outOfService = snapshot?.rooms.filter(roomUnavailable).length ?? null;
  const dirty = snapshot && snapshot.rooms.every(r => !!r.housekeepingStatus) ? snapshot.rooms.filter(r => r.housekeepingStatus === 'DIRTY').length : null;
  const attention = snapshot?.rooms.filter(r => roomUnavailable(r) || r.housekeepingStatus === 'DIRTY' || !r.housekeepingStatus || (['OCCUPIED', 'DUE_OUT'].includes(r.status) && !activeRoomIds.has(r.id))) ?? null;
  const occupancyRate = sellable?.length && occupied !== null ? occupied / sellable.length * 100 : null;
  return { today, inHouse, arrivals, dueOut, departed, guestCount, occupied, available, outOfService, dirty, attention,
    totalRooms: snapshot?.rooms.length ?? null, sellable: sellable?.length ?? null, occupancyRate,
    roomMix: snapshot && occupied !== null && available !== null ? [
      { name: 'Occupied · sellable', value: occupied, color: '#23947a' },
      { name: 'Available · booking', value: available, color: '#6d63d9' },
      { name: 'Other / reserved', value: snapshot.rooms.length - occupied - available - outOfService!, color: '#f0b849' },
      { name: 'Blocked / out of service', value: outOfService!, color: '#475569' },
    ] : null,
  };
}

export function taskOverview(tasks: OperationTask[] | null) {
  if (!tasks) return null;
  return { open: tasks.filter(t => t.status === 'OPEN').length, inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    inspection: tasks.filter(t => t.workflowVersion != null && t.status === 'RESOLVED').length };
}
