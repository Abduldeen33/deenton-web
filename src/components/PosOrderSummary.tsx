import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Armchair, Users, UserRound, ReceiptText, FileText, Plus, Minus, ArrowLeftRight, CalendarDays, LockKeyhole, Columns3 } from 'lucide-react';
import api from '../api/client';
import { posError } from '../api/pos';
import { canOperate, canSellPos } from '../store/permissions';
import type { RestaurantTable } from './PosTables';
import PosSplitBill from './PosSplitBill';

type Props = { table: RestaurantTable | null; disabled: boolean; total: string; cart: ReactNode; hasItems: boolean; onChange: () => void; onAdd: () => void; onReceipt: (id: string) => void };
type Waiter = { id: string; name: string };
const labels: Record<string, string> = { AVAILABLE: 'Available', RESERVED: 'Reserved', OCCUPIED: 'Occupied', AWAITING_FOOD: 'Awaiting food', AWAITING_PAYMENT: 'Awaiting payment' };

export default function PosOrderSummary({ table, disabled, total, cart, hasItems, onChange, onAdd, onReceipt }: Props) {
  const [guests, setGuests] = useState(0), [waiter, setWaiter] = useState('');
  const [waiters, setWaiters] = useState<Waiter[]>([]), [waiterError, setWaiterError] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'split' | 'transfer' | null>(null), [orderId, setOrderId] = useState(''), [destination, setDestination] = useState('');
  const [tables, setTables] = useState<RestaurantTable[]>([]), [splitId, setSplitId] = useState('');
  const working = useRef(false);
  const operating = canOperate(), locked = disabled || busy || !operating, noTable = locked || !table;
  const status = table?.status || (table?.reserved ? 'RESERVED' : table?.occupied || table?.activeOrders ? 'OCCUPIED' : 'AVAILABLE');
  useEffect(() => { setGuests(table?.guestCount || 0); }, [table?.id, table?.guestCount]);
  useEffect(() => { setWaiter(table?.assignedWaiterId || ''); }, [table?.id, table?.assignedWaiterId]);
  useEffect(() => { setMode(null); setError(''); setNotice(''); }, [table?.id]);
  useEffect(() => {
    if (!operating) return;
    const controller = new AbortController();
    api.get<Waiter[]>('/pos/waiters', { signal: controller.signal, timeout: 12000 }).then(r => setWaiters(r.data)).catch(e => { if (!controller.signal.aborted) setWaiterError(posError(e)); });
    return () => controller.abort();
  }, [operating]);
  async function run(action: () => Promise<unknown>, message: string) {
    if (working.current || locked) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); onChange(); setMode(null); }
    catch (e) { setError(posError(e)); }
    finally { working.current = false; setBusy(false); }
  }
  function save(action: string) {
    if (!table || noTable) return;
    if (action === 'CLOSE' && !window.confirm(`Close table ${table.name}? This clears the guest count and waiter, but never deletes orders or receipts.`)) return;
    void run(() => api.patch(`/pos/tables/${table.id}/service`, { action, ...(action === 'SEAT' ? { guestCount: guests } : action === 'WAITER' ? { waiterId: waiter || null } : {}) }), ({ SEAT: 'Guest count saved. Table is occupied.', WAITER: 'Waiter saved for new orders. Existing order receipts are unchanged.', RESERVE: 'Table marked reserved. Seat guests when they arrive.', CLOSE: 'Table closed and available.' })[action] || 'Saved.');
  }
  async function choose(next: 'split' | 'transfer') {
    if (noTable) return;
    setError(''); setNotice(''); setOrderId(''); setDestination(''); setMode(next);
    if (next === 'transfer') {
      setTables([]);
      try { const r = await api.get<RestaurantTable[]>('/pos/tables'); setTables(r.data); }
      catch (e) { setError(posError(e)); }
    }
  }
  const orders = (table?.orders || []).filter(o => mode !== 'split' || o.billingStatus === 'AWAITING_PAYMENT');
  return <section aria-label="Table order summary" className="rp-summary-card">
    <header className="rp-summary-heading"><h3><ReceiptText size={21}/>Order Summary</h3><div><span>Table</span> <strong>{table?.name || '—'}</strong><span className="rp-summary-status" data-status={status}>{table ? labels[status] || status : 'Not selected'}</span></div></header>
    <div className="rp-summary-body">
      <dl className="rp-summary-meta">
        <div><dt><Armchair/>Table</dt><dd>{table?.name || '—'}</dd></div>
        <div><dt><Users/>Seats</dt><dd>{table?.seats ?? '—'}</dd></div>
        <div><dt><Users/>Guest Count</dt><dd className="rp-guest-stepper"><button aria-label="Decrease guest count" disabled={noTable || guests <= 0} onClick={() => setGuests(n => n - 1)}><Minus size={12}/></button><output aria-label="Guest count">{guests}</output><button aria-label="Increase guest count" disabled={noTable || guests >= (table?.seats || 0)} onClick={() => setGuests(n => n + 1)}><Plus size={12}/></button></dd></div>
        <div><dt><UserRound/>Waiter</dt><dd><select aria-label="Table waiter" value={waiter} disabled={noTable || !!waiterError} onChange={e => setWaiter(e.target.value)}><option value="">Unassigned</option>{waiter && !waiters.some(w => w.id === waiter) && <option value={waiter}>{table?.assignedWaiterName || 'Unavailable waiter'}</option>}{waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></dd></div>
      </dl>
      <div className={'rp-summary-cart' + (!hasItems ? ' is-empty' : '')}>{hasItems ? cart : <><FileText size={30}/><p>No items in order</p><small>Select items from the menu<br/>to add to this order.</small></>}</div>
      <dl className="rp-summary-totals"><div><dt>Subtotal</dt><dd>{total}</dd></div><div><dt>Tax</dt><dd title="No additional POS tax is configured">Not configured</dd></div><div className="rp-summary-total"><dt>Total</dt><dd>{total}</dd></div></dl>
    </div>
    <div className="rp-summary-actions">
      <button className="seat" disabled={noTable || guests < 1} onClick={() => save('SEAT')}><Users/>Seat Guests</button>
      <button disabled={noTable || !!waiterError} onClick={() => save('WAITER')}><UserRound/>Assign Waiter</button>
      <button className="add" disabled={disabled || busy || !canSellPos() || !!table?.reserved} onClick={onAdd}><Plus/>Add Order</button>
      <button disabled={noTable} onClick={() => void choose('split')}><Columns3/>Split Bill</button>
      <button disabled={noTable} onClick={() => void choose('transfer')}><ArrowLeftRight/>Transfer Table</button>
      <button className="reserve" disabled={noTable || status !== 'AVAILABLE'} onClick={() => save('RESERVE')}><CalendarDays/>Mark Reserved</button>
      <button className="close-table" disabled={noTable || status === 'AVAILABLE'} onClick={() => save('CLOSE')}><LockKeyhole/>Close Table</button>
    </div>
    {!table && <p className="rp-summary-help">Select a table to manage guests and service.</p>}
    {table?.reserved && <p className="rp-summary-help">Reserved: set the guest count and select Seat Guests before adding an order.</p>}
    {notice && <p role="status" className="rp-summary-notice">{notice}</p>}
    {(error || waiterError) && <p role="alert" className="rp-summary-error">{error || waiterError}</p>}
    {mode && <div className="rp-summary-picker"><div><strong>{mode === 'split' ? 'Choose bill to split' : 'Transfer an active order'}</strong><button aria-label="Close table action" onClick={() => setMode(null)}>×</button></div>
      {!orders.length ? <p>{mode === 'split' ? 'No unpaid orders at this table. Place an order using Pay later first.' : 'No active orders to transfer.'}</p> : <><label>Order<select aria-label="Table action order" value={orderId} disabled={busy} onChange={e => setOrderId(e.target.value)}><option value="">Select order</option>{orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} · {o.guestName || 'Guest'}</option>)}</select></label>
      {mode === 'transfer' && <><label>Destination table<select aria-label="Destination table" value={destination} disabled={busy} onChange={e => setDestination(e.target.value)}><option value="">Select table</option>{tables.filter(t => t.id !== table?.id && !t.reserved).map(t => <option key={t.id} value={t.id}>{t.name} · {labels[t.status || 'AVAILABLE']}</option>)}</select></label><p>Moves this order only. Guest count and waiter stay with each table; close the old table after all guests leave.</p></>}
      <button disabled={busy || !orderId || (mode === 'transfer' && !destination)} onClick={() => { if (mode === 'split') { setSplitId(orderId); setMode(null); } else if (window.confirm('Transfer this order to the selected table?')) void run(() => api.patch(`/pos/orders/${orderId}/table`, { tableId: destination }), 'Order transferred.'); }}>{mode === 'split' ? 'Open split bill' : 'Confirm transfer'}</button></>}
    </div>}
    {splitId && <PosSplitBill id={splitId} onClose={() => setSplitId('')} onPaid={() => { onReceipt(splitId); setSplitId(''); onChange(); }} />}
  </section>;
}
