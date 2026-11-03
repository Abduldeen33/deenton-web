import { useEffect, useState, type FormEvent } from 'react';
import { Armchair, CheckCircle2, Users, CalendarDays, UtensilsCrossed, CreditCard, LayoutGrid, List } from 'lucide-react';
import PosFloorPlan from './PosFloorPlan';
import { getUser } from '../store/auth';
import { canOperate } from '../store/permissions';
import api from '../api/client';
import { posButton as button, posField as field, posPrimary as primary, posError } from '../api/pos';

export type RestaurantTable = { occupied?: boolean; reserved?: boolean; guestCount?: number; assignedWaiterId?: string | null; assignedWaiterName?: string | null; status?: string; orders?: { id: string; orderNumber: string; guestName?: string; billingStatus?: string }[]; id: string; name: string; seats: number; activeOrders: number };
type Availability = { ready: boolean; hasTables: boolean };
type Props = { search?: string; onSelected?: (table: RestaurantTable | null) => void; value: string; onChange: (id: string) => void; onAvailability: (state: Availability) => void; canManage: boolean; disabled: boolean; revision: number };
export default function PosTables({ value, onChange, onAvailability, canManage, disabled, revision, search = '', onSelected }: Props) {
  const [view, setView] = useState<'floor' | 'list'>('floor');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('4');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const { data } = await api.get<RestaurantTable[]>('/pos/tables', { signal: controller.signal, timeout: 12000 });
        if (!controller.signal.aborted) {
          setTables(data); setError(''); setLoading(false);
          onAvailability({ ready: true, hasTables: data.length > 0 });
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(posError(e)); setLoading(false);
          onAvailability({ ready: false, hasTables: false });
        }
      } finally { if (!controller.signal.aborted) timer = setTimeout(load, 5000); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [revision, refresh, onAvailability]);
  useEffect(() => { onSelected?.(tables.find(t => t.id === value) || null); }, [tables, value, onSelected]);
  async function add(event: FormEvent) {
    event.preventDefault(); if (saving || disabled) return;
    setSaving(true); setSaveError('');
    try {
      const { data } = await api.post<RestaurantTable>('/pos/tables', { name: name.trim(), seats: Number(seats) });
      setName(''); onChange(data.id); setRefresh(n => n + 1);
    } catch (e) { setSaveError(posError(e)); }
    finally { setSaving(false); }
  }
  const statusOf = (t: RestaurantTable) => t.status || (t.activeOrders ? 'OCCUPIED' : 'AVAILABLE');
  const colors: Record<string, { bg: string; ink: string; name: string }> = { RESERVED: { bg: '#fff1c7', ink: '#a57308', name: 'Reserved' }, AVAILABLE: { bg: '#d7f8e8', ink: '#06885a', name: 'Available' }, OCCUPIED: { bg: '#ffe0de', ink: '#d83639', name: 'Occupied' }, AWAITING_FOOD: { bg: '#fff1c7', ink: '#a57308', name: 'Awaiting food' }, AWAITING_PAYMENT: { bg: '#dcecff', ink: '#126dd3', name: 'Awaiting payment' } };
  // anzak-table-dashboard-v2: all figures come from the live /pos/tables response.
  const [statusFilter, setStatusFilter] = useState('ALL');
  const countStatus = (status: string) => tables.filter(t => statusOf(t) === status).length;
  const visibleTables = tables.filter(t => (statusFilter === 'ALL' || statusOf(t) === statusFilter) && (!search || t.name.toLowerCase().includes(search.toLowerCase())));
  const metrics = [
    { key: 'ALL', label: 'All Tables', number: tables.length, icon: Armchair },
    { key: 'AVAILABLE', label: 'Available', number: countStatus('AVAILABLE'), icon: CheckCircle2 },
    { key: 'OCCUPIED', label: 'Occupied', number: countStatus('OCCUPIED'), icon: Users },
    { key: 'RESERVED', label: 'Reserved', number: countStatus('RESERVED'), icon: CalendarDays },
    { key: 'AWAITING_FOOD', label: 'Awaiting Food', number: countStatus('AWAITING_FOOD'), icon: UtensilsCrossed },
    { key: 'AWAITING_PAYMENT', label: 'Awaiting Payment', number: countStatus('AWAITING_PAYMENT'), icon: CreditCard },
    { key: 'SEATS', label: 'Total Seats', number: tables.reduce((sum,t)=>sum+t.seats,0), icon: Armchair },
  ];
  const selected = tables.find(t => t.id === value);
  return <section id="restaurant-tables" className="rp-panel rp-tables">
    <div className="rp-tables-header"><div><h3>Table Management</h3><p>{getUser()?.propertyName || 'Restaurant'} - Live service view</p></div><div className="rp-view-buttons"><button aria-pressed={view === 'floor'} onClick={() => setView('floor')}><LayoutGrid size={13} className="inline mr-1" />Floor Plan</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={13} className="inline mr-1" />List View</button></div></div>
    <div className="anzak-metrics" aria-label="Live table statistics">
      {metrics.map(metric => <button type="button" key={metric.key} className="anzak-metric" data-status={metric.key} aria-pressed={metric.key === statusFilter} onClick={() => setStatusFilter(metric.key === 'SEATS' ? 'ALL' : metric.key)}>
        <span className="anzak-metric-icon" aria-hidden="true"><metric.icon size={23} strokeWidth={2} /></span><span className="anzak-metric-copy"><span>{metric.label}</span><strong>{metric.number}</strong></span>
      </button>)}
    </div>
    <div className="rp-status-legend">{Object.entries(colors).map(([key,c])=><span key={key}><i style={{background:c.ink}}/>{c.name}</span>)}</div>
    {error && <p role="alert" className="mb-3 text-red-700">{error} Table data may be out of date.</p>}
    {loading ? <p className="p-8">Loading tables...</p> : !tables.length && !error ? <p className="rp-cart-empty">{canManage ? 'Add your restaurant tables below to build your floor view.' : 'An administrator can add restaurant tables here.'}</p> : view === 'floor' ? <PosFloorPlan tables={tables} visibleIds={visibleTables.map(t => t.id)} statusFilter={statusFilter} onFilterChange={setStatusFilter} search={search} value={value} onSelect={onChange} canEdit={canManage || (['RESTAURANT','BAR'].includes(getUser()?.role || '') && getUser()?.accessLevel === 'MANAGER')} disabled={disabled || !!error} refresh={()=>setRefresh(n=>n+1)} /> : <div className={'rp-floor ' + (view === 'list' ? 'rp-floor-list' : '')}><div className="rp-floor-tables">{visibleTables.map(table => { const status=statusOf(table), color=colors[status] || colors.OCCUPIED;return <button key={table.id} aria-label={'Select table ' + table.name} aria-pressed={value === table.id} disabled={disabled || !!error} onClick={() => onChange(table.id)} className="rp-table-card" data-status={status}>
      <span className="rp-table-name">{table.name}</span><span aria-hidden="true" className={'rp-table-glyph ' + (table.seats > 4 ? 'long-table' : '')}><i/><i/><i/><i/><em/></span><span className="rp-table-seats">{table.seats} seats</span><span className="rp-table-status" style={{background:color.bg,color:color.ink}}>{color.name}</span><span className="rp-table-orders">{table.activeOrders ? table.activeOrders + ' active order' + (table.activeOrders === 1 ? '' : 's') : 'No active orders'}</span>{value === table.id && <span className="sr-only">Selected</span>}
    </button>; })}</div>{(!!search || statusFilter !== 'ALL') && !visibleTables.length && <p className="rp-cart-empty">No matching tables.</p>}</div>}
    <div className="anzak-quick-filters" aria-label="Filter restaurant tables by status">
      <strong>Quick Filters</strong>
      <div className="anzak-filter-options">{metrics.filter(m=>m.key !== 'SEATS').map(m=><button type="button" key={m.key} data-status={m.key} aria-pressed={statusFilter === m.key} onClick={()=>setStatusFilter(m.key)}><span>{m.label}</span><b>{m.number}</b></button>)}</div>
    </div>
    <div className="rp-table-footer"><span>Stylized floor view - not a measured seating plan</span><button className={button} onClick={() => setRefresh(n => n + 1)}>Refresh tables</button></div>
    {canOperate() && selected && <div className="rp-table-controls space-y-3"><p className="font-semibold">Table {selected.name} - {selected.seats} seats</p><button disabled={disabled || !!error} className={button} onClick={async () => { try { await api.patch('/pos/tables/' + value + '/occupancy', { occupied: !selected.occupied }); setRefresh(n => n + 1); } catch (e) { setSaveError(posError(e)); } }}>{selected.occupied ? 'Clear table occupancy' : 'Mark table occupied'}</button>
      {(selected.orders || []).map(order => <label key={order.id} className="block text-xs">Transfer {order.guestName || order.orderNumber}<select aria-label={'Transfer order ' + order.orderNumber} disabled={disabled || !!error} value="" className={field + ' max-w-sm mt-1'} onChange={async e => { if (!e.target.value || !window.confirm('Move this order to the selected table?')) return; try { await api.patch('/pos/orders/' + order.id + '/table', { tableId: e.target.value }); setRefresh(n => n + 1); } catch (error) { setSaveError(posError(error)); } }}><option value="">Choose destination table</option>{tables.filter(t => t.id !== value).map(t => <option key={t.id} value={t.id}>{t.name} - {colors[statusOf(t)]?.name}</option>)}</select></label>)}
      {saveError && <p role="alert" className="text-red-700">{saveError}</p>}</div>}
    {canManage && <details className="rp-table-add"><summary>Add / manage restaurant tables</summary><form onSubmit={add} className="flex flex-wrap items-end gap-3"><label className="text-xs">Table name / number<input aria-label="Table name" required maxLength={60} value={name} disabled={saving || disabled} onChange={e => setName(e.target.value)} placeholder="e.g. B01 or Terrace 2" className={field + ' mt-1'} /></label><label className="text-xs">Seats<input aria-label="Table seats" required type="number" min="1" max="100" step="1" value={seats} disabled={saving || disabled} onChange={e => setSeats(e.target.value)} className={field + ' mt-1 max-w-24'} /></label><button disabled={saving || disabled || !name.trim()} className={primary}>{saving ? 'Addingâ€¦' : 'Add table'}</button>{saveError && <p role="alert" className="w-full text-red-700">{saveError}</p>}</form></details>}
  </section>;
}

