export type StayRecord = {
  status?: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  departureDate?: string | null;
  timezone?: string | null;
};

export const reservationPanels = [
  { key: 'UPCOMING', label: 'Upcoming Reservations', description: 'Confirmed bookings awaiting check-in, including earlier expected arrivals.', empty: 'No confirmed reservations awaiting check-in.' },
  { key: 'IN_HOUSE', label: 'In-house Guests', description: 'Checked-in guests, including overdue stays. Guests remain here until checkout is completed.', empty: 'No guests currently in-house.' },
  { key: 'DUE_OUT', label: 'Due Out Today', description: 'In-house guests scheduled to leave today, using the hotel’s timezone.', empty: 'No in-house guests scheduled to check out today.' },
  { key: 'CHECKED_OUT', label: 'Checked-out Guests', description: 'Completed checkouts. Actual dates are shown only when recorded.', empty: 'No completed checkouts recorded.' },
] as const;
export type ReservationPanel = typeof reservationPanels[number]['key'] | 'ALL';

export function isInHouse(record: StayRecord): boolean {
  return ['ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(record.status || '') && !record.checkedOutAt;
}

export function hotelToday(timezone: StayRecord['timezone'], now: Date): string | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch { return null; }
}

export function inReservationPanel(record: StayRecord, panel: ReservationPanel, now: Date): boolean {
  switch (panel) {
    case 'ALL': return true;
    case 'UPCOMING': return record.status === 'RESERVED' && !record.checkedInAt && !record.checkedOutAt;
    case 'IN_HOUSE': return isInHouse(record);
    case 'CHECKED_OUT': return record.status === 'CHECKED_OUT';
    case 'DUE_OUT': {
      const today = hotelToday(record.timezone, now);
      return isInHouse(record) && today !== null && record.departureDate?.slice(0, 10) === today;
    }
  }
}

export function actualStayTime(value: string | null | undefined, timezone: StayRecord['timezone']): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Not recorded';
  const date = new Date(value);
  const validZone = hotelToday(timezone, date) !== null;
  return date.toLocaleString('en-GB', { timeZone: validZone ? timezone! : 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + (validZone ? '' : ' UTC');
}
