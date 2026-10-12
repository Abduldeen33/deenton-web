import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PosSplitBill from '../components/PosSplitBill';
import PosReceiptHistory from '../components/PosReceiptHistory';
import PosCashierShift from '../components/PosCashierShift';
import PosReversals from '../components/PosReversals';
import PosReceipt, { type ReceiptTarget } from '../components/PosReceipt';
import Layout from '../components/Layout';
import { usePosQueue } from '../components/PosQueueProvider';
import api from '../api/client';
import { getUser } from '../store/auth';
import { canOperate } from '../store/permissions';
import { posButton as button, posField as field, posPrimary as primary, posError, stationsFor, convertPrice, posMoney, type Currency, type CurrencySettings, type Ticket } from '../api/pos';

type Stay = { id: string; room: { roomNumber: string }; guest: { firstName: string; lastName: string } };
type Unpaid = { reversalPending?: boolean; id: string; orderNumber: string; guestName?: string; serviceLocation?: string; servedByName?: string | null; total: string; currency: Currency; currencyTotal: string; exchangeRate: string | null };
export default function OrderQueues() {
  const [splitOrder, setSplitOrder] = useState<string | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(null);
  const role = getUser()?.role || '';
  const stations = stationsFor(role);
  const canServe = canOperate() && ['ADMIN', 'SUPER_ADMIN', 'CEO', 'RESTAURANT', 'BAR'].includes(role);
  const canCash = ['ADMIN', 'SUPER_ADMIN', 'CEO', 'RESTAURANT', 'BAR', 'FRONT_DESK', 'ACCOUNTS'].includes(role);
  const { tickets, loading, error, refresh } = usePosQueue();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tab, setTab] = useState<string>(role === 'ACCOUNTS' ? 'CASH' : stations[0] || '');
  const [stays, setStays] = useState<Stay[]>([]);
  const [unpaid, setUnpaid] = useState<Unpaid[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [currencies, setCurrencies] = useState<Record<string, Currency>>({});
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const paymentFor = (order: Unpaid) => {
    const currency = currencies[order.id] || order.currency || 'USD';
    const rate = order.exchangeRate || exchangeRate;
    const amount = currency === order.currency ? order.currencyTotal : convertPrice(order.total, currency, rate);
    return { currency, rate, amount };
  };
  const [message, setMessage] = useState('');
  const [cashError, setCashError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [revision, setRevision] = useState(0);
  const canFrontDesk = stations.includes('FRONT_DESK');
  useEffect(() => {
    if (!canCash) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const [settings, orders, guests] = await Promise.all([
          api.get<CurrencySettings>('/pos/currency-settings', { signal: controller.signal, timeout: 12000 }),
          api.get<Unpaid[]>('/pos/unsettled', { signal: controller.signal, timeout: 12000 }),
          canFrontDesk ? api.get<Stay[]>('/pos/in-house', { signal: controller.signal, timeout: 12000 }) : Promise.resolve({ data: [] }),
        ]);
        if (!controller.signal.aborted) { setUnpaid(orders.data); setStays(guests.data); setExchangeRate(settings.data.exchangeRate); setCashError(''); }
      } catch (e) { if (!controller.signal.aborted) setCashError(posError(e)); }
      finally { if (!controller.signal.aborted) timer = setTimeout(load, 5000); }
    }
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [canCash, canFrontDesk, revision]);
  async function act(work: () => Promise<unknown>, success: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setMessage('');
    try { await work(); setMessage(success); refresh(); setRevision(n => n + 1); return true; }
    catch (e) { setMessage(posError(e)); refresh(); setRevision(n => n + 1); return false; }
    finally { working.current = false; setBusy(false); }
  }
  function advance(ticket: Ticket) {
    const next = ticket.station === 'FRONT_DESK' ? 'DONE' : { NEW: 'PREPARING', PREPARING: 'READY', READY: 'DONE', DONE: 'DONE' }[ticket.status];
    void act(() => api.patch(`/pos/tickets/${ticket.id}/status`, { status: next }), 'Ticket updated.');
  }
  const visibleTickets = tickets.filter(t => t.station === tab && (!['KITCHEN', 'BAR'].includes(tab) || statusFilter === 'ALL' || t.status === statusFilter));
  if (!stations.length && !canCash) return <Layout><p className="p-6">Your account does not have access to order queues.</p></Layout>;
  return <Layout><div className="p-5 pb-28 text-sm text-slate-700">
    {tickets.some(t => t.status === 'READY') && <p role="status" className="mb-4 rounded border border-green-300 bg-green-50 p-3 font-semibold">Ready to serve: {tickets.filter(t => t.status === 'READY').map(t => (t.order.serviceLocation || t.order.orderNumber) + ' · Course ' + (t.course || 1)).join(', ')}</p>}
    <header className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-lg font-semibold text-slate-900">{role === 'KITCHEN' ? 'Kitchen Display' : role === 'BAR' ? 'Bar Display' : role === 'ACCOUNTS' ? 'POS payments' : 'Order queues'}</h1><p className="mt-1 text-xs text-slate-500">{role === 'ACCOUNTS' ? 'Record received restaurant payments and print guest receipts · refreshes every 5 seconds' : 'Live kitchen, bar and room-bill requests · refreshes every 5 seconds'}</p></div><button className={button} onClick={() => { refresh(); setRevision(n => n + 1); }}>Refresh</button></header>
    {['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(role) && <p className="mb-4 text-xs text-slate-500">Create a dedicated Kitchen or Bar login in <Link to="/staff" className="text-indigo-600 underline">Staff</Link> by selecting its role. Each account sees only its preparation station.</p>}
    {canServe && <Link to="/pos" className={primary + ' mb-4 inline-block'}>Take an order</Link>}
    {canCash && <PosCashierShift revision={revision} />}
    {canCash && <PosReversals onChange={() => { setRevision(n => n + 1); refresh(); }} onReceipt={setReceiptTarget} />}
    <div className="mb-5 flex flex-wrap gap-2">{stations.map(s => <button key={s} className={tab === s ? primary : button} onClick={() => setTab(s)}>{s.replace('_', ' ')} ({tickets.filter(t => t.station === s).length})</button>)}{canCash && <button className={tab === 'CASH' ? primary : button} onClick={() => setTab('CASH')}>Awaiting payment ({unpaid.length})</button>}</div>
    {['KITCHEN', 'BAR'].includes(tab) && <div className="mb-4 flex flex-wrap gap-2" aria-label="Preparation status filters">{['ALL', 'NEW', 'PREPARING', 'READY'].map(status => <button key={status} aria-pressed={statusFilter === status} className={statusFilter === status ? primary : button} onClick={() => setStatusFilter(status)}>{status === 'ALL' ? 'All orders' : status} ({tickets.filter(t => t.station === tab && (status === 'ALL' || t.status === status)).length})</button>)}</div>}
    {role === 'ACCOUNTS' && <PosReceiptHistory onOpen={setReceiptTarget} preparationCopies={false} />}
    {splitOrder && <PosSplitBill id={splitOrder} onClose={() => setSplitOrder(null)} onPaid={() => { setSplitOrder(null); setReceiptTarget({ id: splitOrder, copy: 'RESTAURANT' }); setRevision(n => n + 1); refresh(); }} />}
    {receiptTarget && <PosReceipt target={receiptTarget} onClose={() => setReceiptTarget(null)} />}
    {message && <p role="status" className="mb-4 rounded border border-indigo-200 bg-indigo-50 p-3">{message}</p>}
    {(error || cashError) && <p role="alert" className="mb-4 text-red-700">{error || cashError} Displayed data may be out of date.</p>}
    {loading && <p>Loading queues…</p>}
    {tab === 'CASH' ? <div className="space-y-3">{!unpaid.length && !cashError && <p className="rounded border bg-white p-8">No orders awaiting payment.</p>}{unpaid.map(order => <article key={order.id} className="rounded-lg border bg-white p-4"><p className="break-all font-semibold">{order.orderNumber}</p><button className={button + ' mt-2'} onClick={() => setReceiptTarget({ id: order.id, copy: 'RESTAURANT' })}>Guest check / receipt</button><p className="mt-2 text-xs">Served by: {order.servedByName || 'Not assigned / not recorded'}</p>{canServe && !order.servedByName && <button disabled={busy} className={button + ' mt-2'} onClick={() => void act(() => api.patch(`/pos/orders/${order.id}/serve`), 'You are assigned as serving staff.')}>Serve this order</button>}<p className="my-2">{order.guestName} · {order.serviceLocation} · {posMoney(order.currencyTotal, order.currency)}</p><div className="flex flex-wrap gap-2"><select aria-label="Payment received by" className={field + ' max-w-xs'} value={methods[order.id] || 'CASH'} onChange={e => setMethods({ ...methods, [order.id]: e.target.value })}>{['CASH', 'CARD', 'ORANGE_MONEY', 'AFRIMONEY'].map(m => <option key={m}>{m}</option>)}</select><label className="text-xs">Payment currency<select aria-label="Counter payment currency" className={field + ' max-w-xs'} value={paymentFor(order).currency} disabled={busy} onChange={e => setCurrencies({ ...currencies, [order.id]: e.target.value as Currency })}><option value="USD">USD — US Dollar</option><option value="SLL" disabled={!paymentFor(order).rate}>SLL — Leones</option></select></label><span className="self-center font-semibold">Collect {posMoney(paymentFor(order).amount, paymentFor(order).currency)}</span><button disabled={!canOperate() || busy || !!cashError || !!order.reversalPending} className={primary} onClick={() => { if (window.confirm(`Confirm ${posMoney(paymentFor(order).amount, paymentFor(order).currency)} has actually been received?`)) void act(() => api.post(`/pos/orders/${order.id}/settle`, { paymentMethod: methods[order.id] || 'CASH', currency: paymentFor(order).currency, ...(paymentFor(order).currency === 'SLL' && { expectedExchangeRate: Number(paymentFor(order).rate) }) }), 'Payment recorded.').then(success => { if (success) setReceiptTarget({ id: order.id, copy: 'RESTAURANT' }); }); }}>Record received payment</button><button disabled={!canOperate() || busy || !!cashError || !!order.reversalPending} className={button} onClick={() => setSplitOrder(order.id)}>Split bill / multiple payments</button></div></article>)}</div>
    : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{!loading && !error && !visibleTickets.length && <p className="rounded border bg-white p-8">No tickets in this view. New orders will appear automatically.</p>}{visibleTickets.map(ticket => <article key={ticket.id} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex justify-between gap-2"><span className={`rounded px-2 py-1 text-xs font-medium ${ticket.status === 'NEW' ? 'bg-amber-100 text-amber-800' : ticket.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'}`}>{ticket.status}</span><span className="text-xs text-slate-500">{Math.max(0, Math.floor((Date.now() - new Date(ticket.timerStartedAt || ticket.createdAt).getTime()) / 60000))} min · {new Date(ticket.createdAt).toLocaleTimeString()}</span></div>
      <p className="mt-2 text-xs font-semibold">{ticket.held ? "Held for earlier course · " : ""}Course {ticket.course || 1} · Target {ticket.preparationMinutes || 20} min</p>
      {!ticket.held && ['NEW','PREPARING'].includes(ticket.status) && Date.now() - new Date(ticket.timerStartedAt || ticket.createdAt).getTime() > (ticket.preparationMinutes || 20) * 60000 && <p role="status" className="mt-2 rounded bg-red-100 p-2 text-red-800">Preparation overdue</p>}
      <p className="mt-3 break-all text-xs text-slate-500">{ticket.order.orderNumber} · {ticket.order.source}</p>
      <h2 className="mt-3 text-xl font-semibold text-slate-900">{ticket.order.serviceLocation || (ticket.order.roomNumber ? `Room ${ticket.order.roomNumber}` : 'Restaurant')}</h2><p className="mt-1 text-slate-500">{ticket.order.guestName || 'Staff order'}</p>
      <p className="mt-2 text-xs">Served by: {ticket.order.servedByName || 'Not assigned / not recorded'}</p>
      {canServe && !ticket.order.servedByName && <button disabled={busy} className={button + ' mt-2'} onClick={() => void act(() => api.patch(`/pos/orders/${ticket.order.id}/serve`), 'You are assigned as serving staff.')}>Serve this order</button>}
      <div className="mt-3 flex flex-wrap gap-2">{ticket.station !== 'FRONT_DESK' && <button className={button} onClick={() => setReceiptTarget({ id: ticket.order.id, copy: ticket.station === 'BAR' ? 'BAR' : 'KITCHEN' })}>{ticket.station === 'BAR' ? 'Bar slip' : 'Kitchen slip'}</button>}{canCash && <button className={button} onClick={() => setReceiptTarget({ id: ticket.order.id, copy: 'RESTAURANT' })}>Guest check / receipt</button>}</div>
      <ul className="my-4 space-y-2 border-y py-3">{ticket.order.items.map((item, i) => <li key={i}><strong>{item.quantity} ×</strong> {item.name}</li>)}</ul>
      {ticket.order.notes && <p className="mb-4 whitespace-pre-wrap rounded bg-amber-50 p-2">Notes: {ticket.order.notes}</p>}
      {ticket.order.reversalPending && <p className="mb-3 rounded bg-amber-100 p-2 text-xs font-semibold">Order paused — cancellation/refund awaiting review or repayment. Do not prepare or collect payment.</p>}
      {ticket.station === 'FRONT_DESK' && <p className="mb-3 font-medium">{posMoney(ticket.order.currencyTotal, ticket.order.currency)} {ticket.order.currency === 'SLL' && <span className="text-xs text-slate-500">(folio: {posMoney(ticket.order.total, 'USD')})</span>} · {ticket.order.billingStatus.replaceAll('_', ' ')}</p>}
      {!canOperate() || ticket.order.reversalPending ? null : ticket.station === 'FRONT_DESK' && ticket.order.billingStatus === 'ROOM_REQUESTED' ? <div className="space-y-3"><p className="text-xs text-slate-500">Verify the guest and room before posting. The entered room number is not proof of identity.</p><label className="block text-xs">Current in-house reservation<select className={field + ' mt-1'} value={choices[ticket.id] || ''} disabled={!!cashError || busy} onChange={e => setChoices({ ...choices, [ticket.id]: e.target.value })}><option value="">Select verified guest</option>{stays.map(s => <option key={s.id} value={s.id}>Room {s.room.roomNumber} — {s.guest.firstName} {s.guest.lastName}</option>)}</select></label><button className={primary} disabled={busy || !!cashError || !choices[ticket.id]} onClick={() => { if (window.confirm('Post this restaurant charge to the selected guest folio?')) void act(() => api.post(`/pos/tickets/${ticket.id}/room-bill`, { reservationId: choices[ticket.id] }), 'Room charge posted.'); }}>Confirm room bill</button><button className={button + ' ml-2'} disabled={busy} onClick={() => { if (window.confirm('Decline room billing and collect payment at the counter instead?')) void act(() => api.post(`/pos/tickets/${ticket.id}/decline-room-bill`), 'Moved to awaiting payment.'); }}>Pay at counter instead</button></div>
      : <button disabled={busy || !!error || !!ticket.order.reversalPending || !!ticket.held} className={primary + ' w-full'} onClick={() => advance(ticket)}>{ticket.station === 'FRONT_DESK' ? 'Acknowledge posted room bill' : ticket.status === 'NEW' ? 'Start preparation' : ticket.status === 'PREPARING' ? 'Mark ready' : 'Mark served'}</button>}
    </article>)}</div>}
  </div></Layout>;
}
