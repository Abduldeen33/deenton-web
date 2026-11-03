import { useRef, useState } from 'react';
import {
  Armchair, CalendarDays, CheckCircle2, ChevronRight, ClipboardList,
  CreditCard, MapPin, Move, Pencil, SlidersHorizontal, Users, UtensilsCrossed,
} from 'lucide-react';
import api from '../api/client';
import { posError } from '../api/pos';
import type { RestaurantTable } from './PosTables';

type Table = RestaurantTable & {
  layoutX?: number | null;
  layoutY?: number | null;
  layoutVersion?: number;
};
type Status = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'AWAITING_FOOD' | 'AWAITING_PAYMENT';
type Props = {
  tables: Table[];
  visibleIds?: string[];
  search?: string;
  value: string;
  onSelect: (id: string) => void;
  canEdit: boolean;
  disabled: boolean;
  refresh: () => void;
  statusFilter?: string;
  onFilterChange?: (status: string) => void;
};
type DragState = {
  table: Table;
  startX: number;
  startY: number;
  x: number;
  y: number;
  nextX: number;
  nextY: number;
};

const WIDTH = 940;
const CARD_WIDTH = 260;
const CARD_HEIGHT = 168;
const SIDE_PADDING = 28;
const TOP_PADDING = 115;
const BOTTOM_PADDING = 68;
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const statusLabel: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  AWAITING_FOOD: 'Awaiting food',
  AWAITING_PAYMENT: 'Awaiting payment',
};
const statusList: { key: Status; label: string; icon: typeof Armchair }[] = [
  { key: 'ALL', label: 'All tables', icon: Armchair },
  { key: 'AVAILABLE', label: 'Available', icon: CheckCircle2 },
  { key: 'OCCUPIED', label: 'Occupied', icon: Users },
  { key: 'RESERVED', label: 'Reserved', icon: CalendarDays },
  { key: 'AWAITING_FOOD', label: 'Awaiting food', icon: UtensilsCrossed },
  { key: 'AWAITING_PAYMENT', label: 'Awaiting payment', icon: CreditCard },
];
const statusOf = (t: Table) => t.status || (t.reserved ? 'RESERVED' : t.occupied || t.activeOrders ? 'OCCUPIED' : 'AVAILABLE');

export default function PosFloorPlan({
  tables, visibleIds, search = '', value, onSelect, canEdit, disabled, refresh,
  statusFilter = 'ALL', onFilterChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const drag = useRef<DragState | null>(null);
  const height = Math.max(580, TOP_PADDING + Math.ceil(tables.length / 3) * 198 + BOTTOM_PADDING);
  const travelX = WIDTH - CARD_WIDTH - 2 * SIDE_PADDING;
  const travelY = height - CARD_HEIGHT - TOP_PADDING - BOTTOM_PADDING;
  const visible = visibleIds ? new Set(visibleIds) : null;

  // Layout stays indexed to ALL tables, not the filtered subset. Filtering never shuffles tiles.
  const position = (table: Table, index: number) => ({
    x: clamp(table.layoutX ?? (index % 3) * 50),
    y: clamp(table.layoutY ?? (Math.floor(index / 3) * 198 / Math.max(travelY, 1)) * 100),
  });

  async function save(table: Table, x: number, y: number) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/pos/tables/${table.id}/position`, {
        x: clamp(x), y: clamp(y), version: table.layoutVersion || 0,
      });
      refresh();
    } catch (cause) {
      setError(posError(cause));
      refresh();
    } finally {
      setPreview(null);
      setBusy(false);
    }
  }

  const counts = statusList.map(item => ({
    ...item,
    count: item.key === 'ALL' ? tables.length : tables.filter(t => statusOf(t) === item.key).length,
  }));
  const displayed = tables.filter(table => {
    if (visible && !visible.has(table.id)) return false;
    if (!visible && statusFilter !== 'ALL' && statusOf(table) !== statusFilter) return false;
    return !search || table.name.toLowerCase().includes(search.toLowerCase());
  });

  return <div className="anzak-terrace-layout">
    <div className="anzak-plan-main">
      <div className="anzak-plan-heading">
        <div className="anzak-plan-heading-copy">
          <strong>Restaurant floor plan</strong>
          <small>Live table status and seating overview</small>
        </div>
        {canEdit && <button type="button" className="anzak-edit-floor" disabled={disabled || busy} aria-pressed={editing} onClick={() => setEditing(current => !current)}>
          {editing ? <Move size={16} /> : <Pencil size={16} />}
          {editing ? 'Finish editing' : 'Edit floor layout'}
        </button>}
      </div>
      {editing && <p className="anzak-plan-hint" role="status">Drag a table to reposition it, or focus a table and use the arrow keys. Positions save automatically. Moving the tile does not transfer orders.</p>}
      {error && <p role="alert" className="anzak-plan-error">{error}</p>}
      <div className="anzak-plan-scroll" aria-label="Restaurant floor plan">
        <div className="anzak-terrace-canvas" style={{ width: WIDTH, height }}>
          <div className="anzak-plan-decor anzak-plan-decor-top" aria-hidden="true" />
          <div className="anzak-plan-decor anzak-plan-decor-bottom" aria-hidden="true" />
          <div className="anzak-plan-palm anzak-plan-palm-left" aria-hidden="true"></div>
          <div className="anzak-plan-palm anzak-plan-palm-right" aria-hidden="true"></div>
          <div className="anzak-terrace-label"><MapPin size={16} /> Terrace-inspired layout <span className="anzak-theme-tag">Visual theme</span></div>
          {tables.map((table, index) => {
            if (!displayed.some(t => t.id === table.id)) return null;
            const location = preview?.id === table.id ? preview : position(table, index);
            const status = statusOf(table);
            const orders = table.activeOrders || 0;
            return <button
              type="button"
              key={table.id}
              className={'anzak-floor-table' + (value === table.id ? ' is-selected' : '') + (editing ? ' is-editing' : '')}
              data-status={status}
              aria-label={`${editing ? 'Move' : 'Select'} table ${table.name}, ${table.seats} seats, ${statusLabel[status] || status}`}
              aria-pressed={table.id === value}
              disabled={disabled || busy}
              style={{ left: SIDE_PADDING + location.x / 100 * travelX, top: TOP_PADDING + location.y / 100 * travelY, touchAction: editing ? 'none' : 'auto' }}
              onClick={() => { if (!editing) onSelect(table.id); }}
              onPointerDown={event => {
                if (!editing || busy || disabled) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { table, startX: event.clientX, startY: event.clientY, x: location.x, y: location.y, nextX: location.x, nextY: location.y };
              }}
              onPointerMove={event => {
                const moving = drag.current;
                if (!moving || moving.table.id !== table.id) return;
                moving.nextX = clamp(moving.x + (event.clientX - moving.startX) / travelX * 100);
                moving.nextY = clamp(moving.y + (event.clientY - moving.startY) / travelY * 100);
                setPreview({ id: table.id, x: moving.nextX, y: moving.nextY });
              }}
              onPointerUp={() => {
                const moving = drag.current;
                drag.current = null;
                if (moving && moving.table.id === table.id && Math.abs(moving.nextX - moving.x) + Math.abs(moving.nextY - moving.y) > 0.15) {
                  void save(moving.table, moving.nextX, moving.nextY);
                }
              }}
              onPointerCancel={() => { drag.current = null; setPreview(null); }}
              onKeyDown={event => {
                if (!editing || busy || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                void save(table,
                  location.x + (event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0),
                  location.y + (event.key === 'ArrowDown' ? 2 : event.key === 'ArrowUp' ? -2 : 0),
                );
              }}>
              <span className="anzak-floor-table-heading"><strong title={table.name}>{table.name}</strong><span className="anzak-floor-status">{statusLabel[status] || status.replaceAll('_', ' ')}</span></span>
              <span className="anzak-floor-table-middle">
                <span className={'anzak-floor-table-visual' + (table.seats > 4 ? ' is-large' : '')} aria-hidden="true">
                  <i className="anzak-chair anzak-chair-top" /><i className="anzak-chair anzak-chair-right" />
                  <i className="anzak-chair anzak-chair-bottom" /><i className="anzak-chair anzak-chair-left" />
                  <i className="anzak-table-top" /><i className="anzak-table-leaf"></i>
                </span>
                <span className="anzak-floor-table-details">
                  <span><Users size={13} />{table.seats} seats</span>
                  <span><ClipboardList size={13} />{orders} active {orders === 1 ? 'order' : 'orders'}</span>
                  {Number(table.guestCount || 0) > 0 && <span><Armchair size={13} />{table.guestCount} guests</span>}
                  {table.assignedWaiterName && <span title={table.assignedWaiterName}>Waiter: {table.assignedWaiterName}</span>}
                </span>
              </span>
              <span className="anzak-floor-table-open" aria-hidden="true">{editing ? <Move size={16} /> : <ChevronRight size={16} />}</span>
            </button>;
          })}
          {!displayed.length && <div className="anzak-plan-empty">No tables match the current filters.</div>}
        </div>
      </div>
      <div className="anzak-plan-footer"><span>Illustrated layout - not a measured seating plan</span><span>{displayed.length} of {tables.length} tables shown</span></div>
    </div>
    <aside className="anzak-floor-sidebar" aria-label="Floor plan filters">
      <div className="anzak-filter-card">
        <h3><SlidersHorizontal size={18} />Quick Filters</h3>
        <div className="anzak-floor-filter-items">
          {counts.map(({ key, label, count, icon: Icon }) => <button
            type="button" key={key} data-status={key} aria-pressed={statusFilter === key}
            disabled={!onFilterChange} onClick={() => onFilterChange?.(key)}>
            <span><Icon size={17}/>{label}</span><strong>{count}</strong>
          </button>)}
        </div>
        <div className="anzak-section-divider" />
        <h3><MapPin size={18} />Zones / Sections</h3>
        <div className="anzak-floor-zone"><span>All areas</span><strong>{tables.length}</strong></div>
        <p className="anzak-zone-note">Terrace styling is visual only. Named areas will become filterable when table zones are configured.</p>
      </div>
    </aside>
  </div>;
}
