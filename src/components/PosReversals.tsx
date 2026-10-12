import { SplitBreakdown, type SplitRecord } from './PosSplitBill';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import api from '../api/client';
import { getUser } from '../store/auth';
import { canOperate } from '../store/permissions';
import { posButton as button, posField as field, posPrimary as primary, posError, posMoney, requestKey, type Currency } from '../api/pos';
import type { ReceiptTarget } from './PosReceipt';

type Order = { id: string; orderNumber: string; guestName?: string; billingStatus: string; reversalPending: boolean; currency: Currency; currencyTotal: string; paymentAmount: string | null; paymentCurrency: Currency | null; paymentMethod: string };
type Reversal = { refundSplitBill?: SplitRecord | null; payoutClaimedById?: string; payoutClaimedByName?: string; id: string; kind: 'CANCEL' | 'REFUND'; status: string; reason: string; requestedByName: string; requestedAt: string; reviewedByName?: string; reviewNote?: string; completedByName?: string; completedAt?: string; refundAmount?: string; refundCurrency?: Currency; refundMethod?: string; refundReference?: string; order: Order };
export default function PosReversals({ onChange, onReceipt }: { onChange: () => void; onReceipt: (target: ReceiptTarget) => void }) {
  const manager = ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(getUser()?.role || '');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Reversal[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const working = useRef(false);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setLoadError('');
    api.get<{ items: Reversal[]; hasMore: boolean }>('/pos/reversals', { params: { status, page }, signal: controller.signal, timeout: 15000 })
      .then(r => { if (!controller.signal.aborted) { setRows(r.data.items); setHasMore(r.data.hasMore); } })
      .catch(e => { if (!controller.signal.aborted) setLoadError(posError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, status, page, revision]);

  async function action(work: () => Promise<unknown>, success: string, changed = true) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); if (changed) { setRevision(n => n + 1); onChange(); } }
    catch (e) { setError(posError(e)); }
    finally { working.current = false; setBusy(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault(); setSelected(null); setOrders([]);
    await action(async () => { const result = await api.get<Order[]>('/pos/reversals/orders', { params: { q: query.trim() } }); setOrders(result.data); if (!result.data.length) setError('No matching order. Check the order number on the receipt.'); }, '', false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    const kind = selected.billingStatus === 'PAID' ? 'REFUND' : 'CANCEL';
    const data = { kind, reason: reason.trim() }; const payload = JSON.stringify({ id: selected.id, ...data });
    if (pending.current?.payload !== payload) pending.current = { payload, key: requestKey() };
    await action(async () => { await api.post(`/pos/reversals/orders/${selected.id}`, { ...data, requestKey: pending.current!.key }); pending.current = null; setSelected(null); setOrders([]); setReason(''); }, 'Request submitted. Preparation/payment is paused until manager review.');
  }
  function review(row: Reversal, decision: 'APPROVE' | 'REJECT') {
    if ((notes[row.id] || '').trim().length < 3) { setError('Enter a review note of at least three characters.'); return; }
    if (!window.confirm(`${decision === 'APPROVE' ? 'Approve' : 'Reject'} ${row.kind === 'CANCEL' ? 'cancellation' : 'full refund'} for ${row.order.orderNumber}?${decision === 'APPROVE' ? ' Preparation tickets will close. Inform the kitchen/bar about any food already prepared.' : ''}`)) return;
    void action(() => api.post(`/pos/reversals/${row.id}/review`, { decision, note: notes[row.id] }), decision === 'REJECT' ? 'Request rejected; normal order processing is available again.' : row.kind === 'CANCEL' ? 'Cancellation approved. The original order is preserved.' : 'Refund approved, but not paid out. Record it only after returning the money.');
  }
  function complete(row: Reversal) {
    const nonCash = row.refundSplitBill ? row.refundSplitBill.shares.some(s => s.tenders.some(t => t.method !== 'CASH')) : row.refundMethod !== 'CASH';
    if (nonCash && !(refs[row.id] || '').trim()) { setError('Enter the card/mobile-money refund reference.'); return; }
    if (!window.confirm(`Confirm ${row.refundSplitBill ? row.refundSplitBill.shares.flatMap(s => s.tenders.map(t => s.payer + ': ' + posMoney(t.amount, t.currency) + ' ' + t.method)).join('; ') : posMoney(row.refundAmount || 0, row.refundCurrency) + ' by ' + row.refundMethod?.replaceAll('_', ' ')} has ACTUALLY been returned for ${row.order.orderNumber}. This records the refund; it does not send money. Do not pay twice after a network error—refresh first.`)) return;
    void action(() => api.post(`/pos/reversals/${row.id}/complete`, { confirmedReturned: true, reference: refs[row.id] || undefined }), 'Refund recorded in your current cashier shift. The original payment remains in its original shift.');
  }
  return <section aria-label="POS cancellations and refunds" className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Cancellations & refunds</h2><button type="button" className={button} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? 'Hide reversals' : 'Manage cancellations / refunds'}</button></div>
    {open && <div className="mt-4 space-y-4">
      <p className="text-xs text-slate-500">Whole orders only. Unpaid orders can be cancelled; paid orders can be fully refunded in the original payment currency and method. ADMIN/SUPER_ADMIN approval is required. Posted room charges need a separate hotel folio adjustment.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-indigo-700">{message}</p>}
      <form onSubmit={search} className="flex flex-wrap items-end gap-2"><label className="text-xs">Find order by receipt number<input aria-label="Reversal order number" className={field + ' mt-1'} minLength={3} maxLength={100} required value={query} onChange={e => setQuery(e.target.value)} /></label><button className={button} disabled={busy}>Find order</button><button type="button" className={button} disabled={busy} onClick={() => void action(async () => { setSelected(null); setOrders((await api.get<Order[]>('/pos/reversals/orders', { params: { q: 'POS-' } })).data); }, '', false)}>Recent orders</button></form>
      {!!orders.length && <div className="max-h-64 space-y-2 overflow-y-auto">{orders.map(order => <article key={order.id} className="rounded border p-3"><p className="break-all text-xs">{order.orderNumber} · {order.guestName || 'Guest'} · {order.billingStatus.replaceAll('_', ' ')}</p><div className="mt-2 flex flex-wrap gap-2"><button className={button} onClick={() => onReceipt({ id: order.id, copy: 'RESTAURANT' })}>View guest receipt</button>{['PAID', 'AWAITING_PAYMENT', 'ROOM_REQUESTED'].includes(order.billingStatus) && !order.reversalPending && <button className={button} disabled={busy || !canOperate()} onClick={() => { setSelected(order); setReason(''); }}>{order.billingStatus === 'PAID' ? 'Request full refund' : 'Request cancellation'}</button>}{order.reversalPending && <span className="text-xs text-amber-700">Manager review / refund pending</span>}</div></article>)}</div>}
      {selected && canOperate() && <form onSubmit={submit} className="space-y-3 rounded border border-amber-200 bg-amber-50 p-3"><p className="break-all text-xs">Request for {selected.orderNumber}{selected.billingStatus === 'PAID' && selected.paymentCurrency && ` · ${posMoney(selected.paymentAmount || 0, selected.paymentCurrency)} · ${selected.paymentMethod}`}</p><label className="block text-xs">Reason<textarea aria-label="Reversal reason" className={field + ' mt-1'} minLength={3} maxLength={1000} required value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label><button className={primary} disabled={busy || reason.trim().length < 3}>Submit reversal request</button><button type="button" className={button + ' ml-2'} disabled={busy} onClick={() => setSelected(null)}>Dismiss request form</button></form>}
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Approval queue & audit history</h3><select aria-label="Reversal history filter" className={field + ' max-w-xs'} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="ACTIVE">Pending review / repayment</option><option value="ALL">All requests (including rejected)</option></select><button className={button} disabled={loading || busy} onClick={() => setRevision(n => n + 1)}>Refresh reversals</button></div>
      {loadError && <p role="alert" className="text-red-700">{loadError}</p>}
      {loading ? <p>Loading reversal requests…</p> : !loadError && <>{!rows.length && <p className="text-xs text-slate-500">No reversal requests in this view.</p>}{rows.map(row => <article key={row.id} className="space-y-2 rounded border p-3"><p className="break-all font-medium">{row.order.orderNumber}</p><p className="text-xs">{row.kind} · {row.status}{row.kind === 'REFUND' && !row.refundSplitBill && ` · ${posMoney(row.refundAmount || 0, row.refundCurrency)} · ${row.refundMethod}`}</p><p className="whitespace-pre-wrap text-xs">Reason: {row.reason}</p><p className="text-xs text-slate-500">Requested by {row.requestedByName} · {new Date(row.requestedAt).toLocaleString()}</p>{row.reviewedByName && <p className="whitespace-pre-wrap text-xs">Reviewed by {row.reviewedByName}: {row.reviewNote}</p>}{row.completedAt && <p className="text-xs">Completed by {row.completedByName} · {new Date(row.completedAt).toLocaleString()}{row.refundReference && ` · Reference: ${row.refundReference}`}</p>}
        {row.refundSplitBill && <><p className="text-xs font-semibold">{row.status === 'COMPLETED' ? 'Original payments fully refunded below' : 'Return each original payment below after approval; not yet proof of repayment'}</p><SplitBreakdown bill={row.refundSplitBill} refunded={row.status === 'COMPLETED'} /></>}
        <button className={button} onClick={() => onReceipt({ id: row.order.id, copy: 'RESTAURANT' })}>View guest receipt</button>
        {row.status === 'PENDING' && manager && <div className="space-y-2"><label className="block text-xs">Manager review note<textarea aria-label={`Review note ${row.id}`} className={field + ' mt-1'} maxLength={1000} disabled={busy} value={notes[row.id] || ''} onChange={e => setNotes(v => ({ ...v, [row.id]: e.target.value }))} /></label><button className={primary} disabled={busy} onClick={() => review(row, 'APPROVE')}>Approve {row.kind === 'CANCEL' ? 'cancellation' : 'refund'}</button><button className={button + ' ml-2'} disabled={busy} onClick={() => review(row, 'REJECT')}>Reject request</button></div>}
        {canOperate() && row.kind === 'REFUND' && row.status === 'APPROVED' && !row.payoutClaimedById && <button className={primary} disabled={busy} onClick={() => void action(() => api.post('/pos/reversals/' + row.id + '/claim'), 'You are assigned to return this refund. Check your shift, then return funds and record repayment.')}>Claim refund payout</button>}{row.payoutClaimedByName && <p className="text-xs">Refund handled by: {row.payoutClaimedByName}</p>}{canOperate() && row.kind === 'REFUND' && row.status === 'APPROVED' && row.payoutClaimedById === getUser()?.id && <div className="space-y-2 rounded bg-amber-50 p-3"><p className="text-xs">Open your cashier shift first. Return funds using the original payment method, then record the repayment below. This system does not transfer money or contact a payment provider.</p><label className="block text-xs">Refund reference(s) {row.refundMethod === 'CASH' || (row.refundSplitBill && row.refundSplitBill.shares.every(s => s.tenders.every(t => t.method === 'CASH'))) ? '(optional)' : '(required; list each non-cash repayment)'}<input aria-label={`Refund reference ${row.id}`} className={field + ' mt-1'} maxLength={100} disabled={busy} value={refs[row.id] || ''} onChange={e => setRefs(v => ({ ...v, [row.id]: e.target.value }))} /></label><button className={primary} disabled={busy} onClick={() => complete(row)}>Record money returned</button></div>}
      </article>)}</>}
      <div className="flex items-center gap-3"><button className={button} disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous requests</button><span className="text-xs">Page {page}</span><button className={button} disabled={loading || !hasMore} onClick={() => setPage(p => p + 1)}>Next requests</button></div>
    </div>}
  </section>;
}
