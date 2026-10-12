import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { posButton as button, posPrimary as primary, posField as field, posMoney, posError, requestKey, type Currency } from '../api/pos';

export type SplitRecord = { mode: string; totalUsd: string; shares: { payer: string; amountUsd: string; items: { name: string; quantity: number }[]; tenders: { method: string; currency: Currency; amount: string; amountUsd: string; exchangeRate: string | null; reference: string | null }[] }[] };
export function SplitBreakdown({ bill, refunded = false }: { bill: SplitRecord; refunded?: boolean }) {
  return <div className="space-y-3 text-xs" aria-label={refunded ? 'Split refund breakdown' : 'Split payment breakdown'}>{bill.shares.map((s, i) => <div key={i} className="border-t border-dashed pt-2"><p className="font-semibold">{s.payer} · {posMoney(s.amountUsd, 'USD')}</p>{s.items.map((item, j) => <p key={j}>{item.quantity} × {item.name}</p>)}{s.tenders.map((t, j) => <p key={j}>{refunded ? 'Returned' : 'Received'}: {posMoney(t.amount, t.currency)} · {t.method.replaceAll('_', ' ')}{t.exchangeRate && ` · 1 USD = ${t.exchangeRate} Leones`}{!refunded && t.reference && ` · Ref: ${t.reference}`}</p>)}</div>)}</div>;
}
type Item = { id: string; name: string; price: string; quantity: number };
type Bill = { id: string; orderNumber: string; total: string; exchangeRate: string | null; billingStatus: string; reversalPending: boolean; items: Item[] };
type Tender = { method: string; currency: Currency; amount: string; reference: string };
type Share = { payer: string; amountUsd: string; quantities: Record<string, number>; tenders: Tender[] };
const cents = (n: string | number) => Math.round(Number(n) * 100);
export default function PosSplitBill({ id, onClose, onPaid }: { id: string; onClose: () => void; onPaid: () => void }) {
  const [bill, setBill] = useState<Bill | null>(null), [mode, setMode] = useState<'GUEST' | 'ITEM'>('GUEST');
  const [shares, setShares] = useState<Share[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false);
  const pending = useRef<{ payload: string; key: string } | null>(null), working = useRef(false);
  const rate = Number(bill?.exchangeRate || 0);
  useEffect(() => {
    const controller = new AbortController();
    api.get<Bill>(`/pos/orders/${id}/split-bill`, { signal: controller.signal, timeout: 15000 }).then(r => {
      if (controller.signal.aborted) return;
      setBill(r.data); const currency = r.data.exchangeRate ? 'SLL' : 'USD';
      setShares([{ payer: 'Guest 1', amountUsd: r.data.total, quantities: Object.fromEntries(r.data.items.map(i => [i.id, i.quantity])), tenders: [{ method: 'CASH', currency, amount: (Number(r.data.total) * (currency === 'SLL' ? Number(r.data.exchangeRate) : 1)).toFixed(2), reference: '' }] }]);
    }).catch(e => { if (!controller.signal.aborted) setError(posError(e)); });
    return () => controller.abort();
  }, [id]);
  const due = (s: Share) => mode === 'ITEM' ? (bill?.items || []).reduce((sum, i) => sum + cents(i.price) * (s.quantities[i.id] || 0), 0) : cents(s.amountUsd || 0);
  const paid = (s: Share) => s.tenders.reduce((sum, t) => sum + (t.currency === 'SLL' ? rate ? cents(Number(t.amount || 0) / rate) : 0 : cents(t.amount || 0)), 0);
  const update = (index: number, share: Share) => { setShares(rows => rows.map((s, i) => i === index ? share : s)); setConfirmed(false); };
  const updateTender = (si: number, ti: number, tender: Tender) => update(si, { ...shares[si], tenders: shares[si].tenders.map((t, j) => j === ti ? tender : t) });
  const totalAssigned = shares.reduce((s, p) => s + due(p), 0);
  const quantitiesValid = mode !== 'ITEM' || (bill?.items || []).every(i => shares.reduce((n, s) => n + (s.quantities[i.id] || 0), 0) === i.quantity);
  const valid = !!bill && bill.billingStatus === 'AWAITING_PAYMENT' && !bill.reversalPending && totalAssigned === cents(bill.total) && quantitiesValid && shares.every(s => s.payer.trim() && due(s) > 0 && paid(s) === due(s) && s.tenders.every(t => Number(t.amount) > 0 && (t.currency !== 'SLL' || rate > 0)));
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!valid || !confirmed || working.current) return;
    const data = { mode, confirmedReceived: true, ...(shares.some(s => s.tenders.some(t => t.currency === 'SLL')) ? { expectedExchangeRate: rate } : {}), shares: shares.map(s => ({ payer: s.payer.trim(), ...(mode === 'GUEST' ? { amountUsd: Number(s.amountUsd) } : {}), items: mode === 'ITEM' ? (bill?.items || []).filter(i => s.quantities[i.id] > 0).map(i => ({ orderItemId: i.id, quantity: s.quantities[i.id] })) : [], tenders: s.tenders.map(t => ({ ...t, amount: Number(t.amount) })) })) };
    const payload = JSON.stringify(data);
    if (pending.current?.payload !== payload) pending.current = { payload, key: requestKey() };
    working.current = true; setBusy(true); setError('');
    try { await api.post(`/pos/orders/${id}/split-bill`, { ...data, requestKey: pending.current.key }, { timeout: 20000 }); onPaid(); }
    catch (e) { setError(posError(e) + ' If the response was lost, retry unchanged. Do not collect the money again.'); }
    finally { working.current = false; setBusy(false); }
  }
  return createPortal(<div className="fixed inset-0 z-[90] overflow-y-auto bg-black/50 p-3 sm:p-6"><form role="dialog" aria-modal="true" aria-label="Split bill and payments" onSubmit={submit} className="mx-auto max-w-3xl space-y-4 rounded-xl bg-white p-4 text-sm text-slate-800">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">Split bill / multiple payments</h2><button type="button" disabled={busy} className={button} onClick={onClose}>Close split bill</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{!bill ? <p>Loading bill…</p> : <>
    <p className="break-all">{bill.orderNumber}</p><p className="font-semibold">Order total: {rate > 0 && `${posMoney(Number(bill.total) * rate, 'SLL')} / `}{posMoney(bill.total, 'USD')}</p><p className="text-xs">Shares use the order's USD base total. Payments can mix USD and Leones at the recorded rate{rate > 0 ? ` (1 USD = ${rate} Leones)` : ''}. Each conversion rounds to USD cents. Record amounts applied to this bill, excluding cash change. All shares are saved together after receipt of all funds; this does not process electronic payments or save partial deposits.</p>
    {(bill.billingStatus !== 'AWAITING_PAYMENT' || bill.reversalPending) && <p role="alert">This order is not available for payment. Close and refresh its receipt.</p>}
    <fieldset disabled={busy} className="space-y-4"><label>Split method<select aria-label="Split method" className={field} value={mode} onChange={e => { setMode(e.target.value as 'GUEST' | 'ITEM'); setConfirmed(false); }}><option value="GUEST">By guest / amount</option><option value="ITEM">By item quantity</option></select></label>
    {shares.map((s, si) => <section key={si} className="space-y-3 rounded border p-3"><div className="flex flex-wrap gap-2"><label className="grow">Guest / payer<input aria-label={`Payer ${si + 1}`} required maxLength={100} className={field} value={s.payer} onChange={e => update(si, { ...s, payer: e.target.value })} /></label>{shares.length > 1 && <button type="button" className={button} onClick={() => { setShares(rows => rows.filter((_, i) => i !== si)); setConfirmed(false); }}>Remove guest</button>}</div>
      {mode === 'GUEST' ? <label>Share USD<input aria-label={`Share USD ${si + 1}`} type="number" required step="0.01" min="0.01" max="99999999.99" className={field} value={s.amountUsd} onChange={e => update(si, { ...s, amountUsd: e.target.value })} /></label> : bill.items.map(i => <label key={i.id} className="flex items-center gap-2"><span className="min-w-0 flex-1">{i.name} · {posMoney(i.price, 'USD')} each · {i.quantity} ordered</span><input aria-label={`Quantity ${si + 1} ${i.id}`} type="number" min="0" max={i.quantity} step="1" className={field + ' w-20'} value={s.quantities[i.id] || 0} onChange={e => update(si, { ...s, quantities: { ...s.quantities, [i.id]: Number(e.target.value) } })} /></label>)}
      <p>Guest due: {posMoney(due(s) / 100, 'USD')}{rate > 0 && ` / ${posMoney(due(s) / 100 * rate, 'SLL')}`}</p>
      {s.tenders.map((t, ti) => <div key={ti} className="grid gap-2 rounded bg-slate-50 p-2 sm:grid-cols-2"><label>Method<select aria-label={`Method ${si + 1} ${ti + 1}`} className={field} value={t.method} onChange={e => updateTender(si, ti, { ...t, method: e.target.value })}>{['CASH','CARD','ORANGE_MONEY','AFRIMONEY'].map(m => <option key={m}>{m}</option>)}</select></label><label>Currency<select aria-label={`Currency ${si + 1} ${ti + 1}`} className={field} value={t.currency} onChange={e => updateTender(si, ti, { ...t, currency: e.target.value as Currency, amount: '' })}><option value="SLL" disabled={!rate}>Leones</option><option value="USD">USD</option></select></label><label>Amount received<input aria-label={`Amount ${si + 1} ${ti + 1}`} className={field} type="number" required step="0.01" min="0.01" max="999999999999.99" value={t.amount} onChange={e => updateTender(si, ti, { ...t, amount: e.target.value })} /></label><label>Payment reference<input className={field} maxLength={100} value={t.reference} onChange={e => updateTender(si, ti, { ...t, reference: e.target.value })} /></label><button type="button" className={button} onClick={() => { const others = paid({ ...s, tenders: s.tenders.filter((_, j) => j !== ti) }); updateTender(si, ti, { ...t, amount: (Math.max(0, due(s) - others) / 100 * (t.currency === 'SLL' ? rate : 1)).toFixed(2) }); }}>Fill remaining</button>{s.tenders.length > 1 && <button type="button" className={button} onClick={() => update(si, { ...s, tenders: s.tenders.filter((_, j) => j !== ti) })}>Remove payment</button>}</div>)}
      <p className={paid(s) === due(s) ? 'text-green-700' : 'text-amber-800'}>Remaining USD: {((due(s) - paid(s)) / 100).toFixed(2)}</p><button type="button" disabled={s.tenders.length >= 10} className={button} onClick={() => update(si, { ...s, tenders: [...s.tenders, { method: 'CARD', currency: rate ? 'SLL' : 'USD', amount: '', reference: '' }] })}>Add payment method</button>
    </section>)}
    <button type="button" disabled={shares.length >= 30} className={button} onClick={() => { setShares(rows => [...rows, { payer: `Guest ${rows.length + 1}`, amountUsd: '', quantities: {}, tenders: [{ method: 'CASH', currency: rate ? 'SLL' : 'USD', amount: '', reference: '' }] }]); setConfirmed(false); }}>Add guest</button>
    {mode === 'GUEST' && <button type="button" className={button + ' ml-2'} onClick={() => { const n = cents(bill.total), base = Math.floor(n / shares.length); setShares(rows => rows.map((s, i) => ({ ...s, amountUsd: ((base + (i < n % rows.length ? 1 : 0)) / 100).toFixed(2) }))); setConfirmed(false); }}>Divide equally</button>}
    <p>Unassigned USD: {((cents(bill.total) - totalAssigned) / 100).toFixed(2)}{!quantitiesValid && ' · Assign every item quantity exactly once.'}</p>
    <label className="block"><input type="checkbox" aria-label="Confirm all payments received" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm all listed funds have actually been received.</label><button className={primary} disabled={!valid || !confirmed || busy}>Record split payments</button>
    </fieldset></>}
  </form></div>, document.body);
}
