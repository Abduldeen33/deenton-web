import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { BedDouble, DoorOpen, Users, CalendarCheck, LogOut, Clock3, Brush, RefreshCw, ArrowUpRight, TrendingUp, Wrench, UtensilsCrossed, Building2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import Layout from '../components/Layout';
import PosStaffSales from '../components/PosStaffSales';
import api from '../api/client';
import { can } from '../store/permissions';
import { getUser } from '../store/auth';
import { stayLabels } from '../components/stay-view-data';
import { dashboardOverview, dateLabel, taskOverview, roomUnavailable, type RoomSnapshot, type DashboardStay, type OperationTask } from './hotel-dashboard-data';
import './hotel-dashboard.css';

type Resource<T> = { data: T | null; error: string | null };
type DashboardData = { key: string; updated: Date; rooms: Resource<RoomSnapshot>; stays: Resource<DashboardStay[]>; cleaning: Resource<OperationTask[]>; maintenance: Resource<OperationTask[]> };
function failure(error: unknown) {
  return isAxiosError(error) && error.response?.status === 403 ? 'Access not authorized for this account.' : 'Could not load this information. Try Refresh overview.';
}
const count = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('en-GB');
const emptyResource = { data: null, error: null };

function StayPanel({ title, description, rows, loading, error, empty }: {
  title: string; description: string; rows: DashboardStay[] | null; loading: boolean; error?: string | null; empty: string;
}) {
  return <section className="hotel-dash-panel" aria-label={title}>
    <div className="hotel-dash-panel-heading"><div><h2>{title}</h2><p>{description}</p></div><span className="hotel-dash-count">{loading ? '…' : count(rows?.length)}</span></div>
    {loading ? <p className="hotel-dash-empty">Loading stays…</p> : error ? <p className="hotel-dash-empty" role="alert">{error}</p> : rows === null ? <p className="hotel-dash-empty">Hotel date or reservation data is unavailable.</p> : rows.length === 0 ? <p className="hotel-dash-empty">{empty}</p> : <div className="hotel-dash-table-scroll"><table>
      <thead><tr><th>Guest / booking</th><th>Room</th><th>Expected checkout</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <td><strong>{r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : 'Guest name not recorded'}</strong><small>{r.resNumber || 'Reference not recorded'}</small></td>
        <td>{r.room?.roomNumber || 'Not recorded'}<small>{r.room?.roomType?.name}</small></td>
        <td>{dateLabel(r.departureDate?.slice(0, 10))}</td>
        <td><span className={`hotel-dash-badge ${r.status === 'RESERVED' ? 'violet' : 'green'}`}>{stayLabels[r.status] || r.status}</span></td>
        <td><Link className="hotel-dash-detail" to={`/reservations?reservation=${encodeURIComponent(r.id)}`} aria-label={`Booking details ${r.resNumber || r.id}`}><ArrowUpRight size={16}/></Link></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}

export default function Dashboard() {
  const user = getUser();
  const viewRooms = can('view_rooms'), viewStays = can('view_reservations'), viewCleaning = can('view_housekeeping'), viewMaintenance = can('view_maintenance');
  const viewPosSales = ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(user?.role || '');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const key = JSON.stringify([user?.id, user?.propertyCode, user?.role, user?.accessLevel, revision]);
  const loading = data?.key !== key;
  const current = loading ? null : data;
  useEffect(() => {
    const controller = new AbortController();
    async function read<T>(enabled: boolean, url: string, valid: (value: T) => boolean): Promise<Resource<T>> {
      if (!enabled) return emptyResource;
      try {
        const response = await api.get<T>(url, { signal: controller.signal, timeout: 20000 });
        if (!valid(response.data)) throw new Error('Incomplete dashboard response');
        return { data: response.data, error: null };
      } catch (error) { return { data: null, error: failure(error) }; }
    }
    void Promise.all([
      read<RoomSnapshot>(viewRooms, '/rooms/stay-view?days=7', r => !!r && Array.isArray(r.rooms) && Array.isArray(r.reservations)),
      read<DashboardStay[]>(viewStays, '/reservations', Array.isArray),
      read<OperationTask[]>(viewCleaning, '/housekeeping', Array.isArray),
      read<OperationTask[]>(viewMaintenance, '/maintenance', Array.isArray),
    ]).then(([rooms, stays, cleaning, maintenance]) => {
      if (!controller.signal.aborted) setData({ key, updated: new Date(), rooms, stays, cleaning, maintenance });
    });
    return () => controller.abort();
  }, [key, viewRooms, viewStays, viewCleaning, viewMaintenance]);
  const overview = dashboardOverview(current?.rooms.data ?? null, current?.stays.data ?? null, current?.updated ?? new Date());
  const cleaning = taskOverview(current?.cleaning.data ?? null), maintenance = taskOverview(current?.maintenance.data ?? null);
  const metrics = [
    ...(viewRooms ? [
      { label: 'Total rooms', value: count(overview.totalRooms), note: `${count(overview.sellable)} sellable rooms`, icon: Building2, tone: 'violet' },
      { label: 'Occupied rooms', value: count(overview.occupied), note: overview.occupancyRate == null ? 'Occupancy rate unavailable' : `${overview.occupancyRate.toFixed(1)}% of sellable rooms`, icon: BedDouble, tone: 'green' },
      { label: 'Available rooms', value: count(overview.available), note: 'Booking availability · readiness separate', icon: DoorOpen, tone: 'violet' },
    ] : []),
    ...(viewStays ? [
      { label: 'In-house guests', value: count(overview.guestCount), note: `${count(overview.inHouse?.length)} checked-in bookings · includes due out`, icon: Users, tone: 'green' },
      { label: 'Arrivals today', value: count(overview.arrivals?.length), note: 'Scheduled today · awaiting check-in', icon: CalendarCheck, tone: 'violet' },
      { label: 'Departures today', value: count(overview.departed?.length), note: 'Completed checkouts · actual timestamps', icon: LogOut, tone: 'neutral' },
      { label: 'Due out today', value: count(overview.dueOut?.length), note: 'Expected departures · still in-house', icon: Clock3, tone: 'amber' },
    ] : []),
    ...(viewRooms ? [{ label: 'Dirty rooms', value: count(overview.dirty), note: 'Cleanliness only · may also be occupied', icon: Brush, tone: 'amber' }] : []),
  ];
  return <Layout><div className="hotel-dashboard">
    <header className="hotel-dash-header"><div><p className="hotel-dash-eyebrow">Anzak Cloud · Hotel dashboard</p><h1>{current?.rooms.data?.propertyName || user?.propertyName || 'Hotel Dashboard'}</h1><p>Property Performance &amp; Daily Operations</p></div>
      <div className="hotel-dash-header-actions"><div className="hotel-dash-date"><span>Hotel date{current?.rooms.data?.timezone ? ` · ${current.rooms.data.timezone}` : ''}</span><strong>{overview.today ? dateLabel(overview.today) : 'Unavailable'}</strong><small>Business date not supplied by the current API</small></div><button type="button" className="hotel-dash-button" disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15}/>{loading ? 'Loading…' : 'Refresh overview'}</button></div>
    </header>
    <div className="hotel-dash-tools"><p role="status">{loading ? 'Loading authorized hotel records…' : `Snapshot refreshed ${current?.updated.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC · Refresh for the latest changes`}</p><div>
      {can('view_reservations') && <Link to="/reservations" className="hotel-dash-button">Reservations <ArrowUpRight size={14}/></Link>}
      {can('view_inventory') && <Link to="/inventory?new=item" className="hotel-dash-button">Add inventory <ArrowUpRight size={14}/></Link>}
    </div></div>
    {current?.rooms.error && <p role="alert" className="hotel-dash-alert">Room overview: {current.rooms.error}</p>}
    {current?.stays.error && <p role="alert" className="hotel-dash-alert">Guest overview: {current.stays.error}</p>}
    {metrics.length > 0 && <section className="hotel-dash-metrics" aria-label="Property summary" aria-busy={loading}>{metrics.map(({ label, value, note, icon: Icon, tone }) => <article className="hotel-dash-metric" key={label}><div><span>{label}</span><span className={`hotel-dash-icon ${tone}`}><Icon size={18}/></span></div><strong>{loading ? '…' : value}</strong><p>{note}</p></article>)}</section>}
    <div className="hotel-dash-charts">
      {viewRooms && <section className="hotel-dash-panel" aria-label="Current room occupancy"><div className="hotel-dash-panel-heading"><div><h2>Current room occupancy</h2><p>Room-based snapshot · {overview.today ? dateLabel(overview.today) : 'date unavailable'}</p></div><span className="hotel-dash-badge violet">Current</span></div>
        {loading ? <p className="hotel-dash-empty">Loading room inventory…</p> : !overview.roomMix ? <p className="hotel-dash-empty">Room inventory is unavailable.</p> : !overview.totalRooms ? <p className="hotel-dash-empty">No rooms have been recorded for this hotel.</p> : <div className="hotel-dash-occupancy"><div className="hotel-dash-ring"><ResponsiveContainer width="100%" height={185}><PieChart><Pie data={overview.roomMix} dataKey="value" nameKey="name" innerRadius={57} outerRadius={77} paddingAngle={2} isAnimationActive={false}>{overview.roomMix.map(item => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div aria-hidden="true"><strong>{overview.occupancyRate == null ? '—' : `${overview.occupancyRate.toFixed(1)}%`}</strong><span>sellable occupied</span></div></div><ul className="hotel-dash-legend">{overview.roomMix.map(item => <li key={item.name}><i style={{ background: item.color }}/><span>{item.name}</span><strong>{item.value}</strong></li>)}</ul></div>}
        <p className="hotel-dash-footnote">Blocked rooms are excluded from sellable inventory. Dirty rooms may be occupied or vacant; cleanliness is not an occupancy state. Historical occupancy snapshots are not available.</p>
      </section>}
      <section className="hotel-dash-panel hotel-dash-trend" aria-label="Revenue trend"><div className="hotel-dash-panel-heading"><div><h2>Revenue trend</h2><p>Reliable financial reporting</p></div><TrendingUp size={20}/></div><div className="hotel-dash-empty"><span className="hotel-dash-icon neutral"><TrendingUp size={25}/></span><h3>{can('view_reports') ? 'Currency-safe trend unavailable' : 'Financial reporting is restricted'}</h3><p>{can('view_reports') ? 'The existing dashboard reports combine original payment amounts across currencies and include voided payments. Revenue, ADR and RevPAR are withheld here until a reliable reporting series is available.' : 'Your operational overview does not include financial reports.'}</p>{can('view_finance') && <Link to="/finance" className="hotel-dash-button">Open Finance <ArrowUpRight size={14}/></Link>}</div></section>
    </div>
    {viewStays && <><div className="hotel-dash-section-title"><div><h2>Daily front desk</h2><p>Overdue guests remain in-house until checkout is completed.</p></div></div><div className="hotel-dash-operations">
      <StayPanel title="Today's arrivals" description="Confirmed bookings awaiting check-in" rows={overview.arrivals} loading={loading} error={current?.stays.error} empty="No arrivals awaiting check-in today."/>
      <StayPanel title="Expected departures" description="Due out today · still checked in" rows={overview.dueOut} loading={loading} error={current?.stays.error} empty="No in-house guests are due out today."/>
      <StayPanel title="Current in-house guests" description="All active stays, including overdue departures" rows={overview.inHouse} loading={loading} error={current?.stays.error} empty="No guests are currently checked in."/>
    </div></>}
    {viewRooms && <section className="hotel-dash-panel" aria-label="Rooms requiring attention"><div className="hotel-dash-panel-heading"><div><h2>Rooms requiring attention</h2><p>Dirty, blocked, unknown cleanliness or occupancy requiring review</p></div><Link to="/rooms" className="hotel-dash-button">Room view <ArrowUpRight size={14}/></Link></div>{loading ? <p className="hotel-dash-empty">Loading rooms…</p> : !overview.attention ? <p className="hotel-dash-empty">Room information is unavailable.</p> : !overview.attention.length ? <p className="hotel-dash-empty">No recorded rooms need attention.</p> : <ul className="hotel-dash-room-list">{overview.attention.map(room => <li key={room.id}><BedDouble size={18}/><div><strong>Room {room.roomNumber}</strong><small>{room.roomType?.name || 'Room type not recorded'}</small></div><span className={`hotel-dash-badge ${roomUnavailable(room) ? 'neutral' : 'amber'}`}>{roomUnavailable(room) ? 'Blocked / out of service' : room.housekeepingStatus === 'DIRTY' ? 'Dirty' : !room.housekeepingStatus ? 'Cleanliness not recorded' : 'Occupancy needs review'}</span></li>)}</ul>}</section>}
    {(viewCleaning || viewMaintenance || can('use_pos')) && <section className="hotel-dash-services" aria-label="Operational overview">
      {viewCleaning && <article className="hotel-dash-panel"><h2><Brush size={17}/> Housekeeping tasks</h2>{current?.cleaning.error ? <p role="alert">{current.cleaning.error}</p> : <p><strong>{loading ? '…' : count(cleaning?.open)}</strong> assigned / open · <strong>{loading ? '…' : count(cleaning?.inProgress)}</strong> in progress · <strong>{loading ? '…' : count(cleaning?.inspection)}</strong> pending managed inspection</p>}<Link to="/housekeeping">Open Housekeeping <ArrowUpRight size={14}/></Link></article>}
      {viewMaintenance && <article className="hotel-dash-panel"><h2><Wrench size={17}/> Maintenance</h2>{current?.maintenance.error ? <p role="alert">{current.maintenance.error}</p> : <p><strong>{loading ? '…' : count(maintenance?.open)}</strong> open issues · <strong>{loading ? '…' : count(maintenance?.inProgress)}</strong> in progress</p>}<Link to="/maintenance">Review issues <ArrowUpRight size={14}/></Link></article>}
      {can('use_pos') && <article className="hotel-dash-panel"><h2><UtensilsCrossed size={17}/> Restaurant operations</h2><p>Continue to the existing register, table and order workspace.</p><Link to="/pos">Open Restaurant POS <ArrowUpRight size={14}/></Link></article>}
    </section>}
    {viewPosSales && <details className="hotel-dash-panel hotel-dash-pos"><summary>Restaurant staff sales &amp; payment records</summary><PosStaffSales revision={revision}/></details>}
  </div></Layout>;
}
