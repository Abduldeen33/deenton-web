import { useEffect, useRef, useState, type FormEvent } from 'react';
import api from '../api/client';
import { getUser } from '../store/auth';
import { canSellPos } from '../store/permissions';
import { posButton as button, posField as field, posPrimary as primary, posError, posMoney, requestKey, type Currency } from '../api/pos';

type Summary = { paymentCount: number; refundCount?: number; currencies: { currency: Currency; opening: string; byMethod: Record<string, string>; refundByMethod?: Record<string, string>; refunded?: string; netCollected?: string; collected: string; expectedCash: string; countedCash?: string; variance?: string }[] };
type Shift = { id: string; staffName: string; openedAt: string; closedAt: string | null; closeNote: string | null; summary: Summary };
type History = { items: Pick<Shift, 'id' | 'staffName' | 'openedAt' | 'closedAt'>[]; hasMore: boolean };

function ShiftReport({ shift }: { shift: Shift }) {
  return <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
    <h3 className="font-semibold">{shift.closedAt ? 'Closed shift report' : 'Current shift totals'} — {shift.staffName}</h3>
    <p className="mt-1 text-xs text-slate-500">Opened {new Date(shift.openedAt).toLocaleString()}{shift.closedAt && ` · Closed ${new Date(shift.closedAt).toLocaleString()}`} · {shift.summary.paymentCount} payments</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">POS reconciliation</th>{shift.summary.currencies.map(row => <th key={row.currency} className="p-2 text-right">{row.currency === 'SLL' ? 'Leones (SLL)' : 'USD'}</th>)}</tr></thead>
      <tbody>{[
        ['Opening cash', (r: Summary['currencies'][number]) => r.opening],
        ['Cash payments', (r: Summary['currencies'][number]) => r.byMethod.CASH],
        ['Card payments', (r: Summary['currencies'][number]) => r.byMethod.CARD],
        ['Orange Money', (r: Summary['currencies'][number]) => r.byMethod.ORANGE_MONEY],
        ['Afrimoney', (r: Summary['currencies'][number]) => r.byMethod.AFRIMONEY],
        ['Total payments (all methods)', (r: Summary['currencies'][number]) => r.collected],
        ['Cash refunds paid out', (r: Summary['currencies'][number]) => r.refundByMethod?.CASH || '0'],
        ['Card refunds', (r: Summary['currencies'][number]) => r.refundByMethod?.CARD || '0'],
        ['Orange Money refunds', (r: Summary['currencies'][number]) => r.refundByMethod?.ORANGE_MONEY || '0'],
        ['Afrimoney refunds', (r: Summary['currencies'][number]) => r.refundByMethod?.AFRIMONEY || '0'],
        ['Net collections after refunds', (r: Summary['currencies'][number]) => r.netCollected ?? r.collected],
        ['Expected cash in drawer', (r: Summary['currencies'][number]) => r.expectedCash],
        ...(shift.closedAt ? [
          ['Counted cash', (r: Summary['currencies'][number]) => r.countedCash!],
          ['Difference (+ over / − short)', (r: Summary['currencies'][number]) => r.variance!],
        ] : []),
      ].map(([label, value]) => <tr key={label as string} className="border-b border-slate-200 last:border-0"><th className="p-2 font-normal">{label as string}</th>{shift.summary.currencies.map(row => <td key={row.currency} className="p-2 text-right tabular-nums">{posMoney((value as (r: Summary['currencies'][number]) => string)(row), row.currency)}</td>)}</tr>)}</tbody></table></div>
    {shift.closeNote && <p className="mt-3 whitespace-pre-wrap text-xs">Closing note: {shift.closeNote}</p>}
    <p className="mt-2 text-xs text-slate-500">Cash expected = opening cash + cash payments − cash refunds paid from this shift. Original collections remain in their original shift; closed reports never change. Room charges, unpaid orders and hotel folio payments are excluded. No currency conversion is applied to these totals.</p>
  </div>;
}

export default function PosCashierShift({ revision = 0 }: { revision?: number }) {
  const role = getUser()?.role || '';
  const canReview = ['ADMIN', 'SUPER_ADMIN', 'CEO', 'ACCOUNTS'].includes(role);
  const [current, setCurrent] = useState<Shift | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState({ usd: '0', sll: '0' });
  const [counted, setCounted] = useState({ usd: '', sll: '' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [scope, setScope] = useState('mine');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<History | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [selected, setSelected] = useState<Shift | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController(); setLoaded(false);
    api.get<Shift | null>('/pos/shifts/current', { signal: controller.signal, timeout: 12000 })
      .then(r => { if (!controller.signal.aborted) { setCurrent(r.data || null); setLoaded(true); setError(''); } })
      .catch(e => { if (!controller.signal.aborted) setError(posError(e)); });
    return () => controller.abort();
  }, [revision, refresh]);

  useEffect(() => {
    if (!showHistory) return;
    const controller = new AbortController(); setHistory(null); setHistoryError('');
    api.get<History>('/pos/shifts', { params: { scope, page }, signal: controller.signal, timeout: 12000 })
      .then(r => { if (!controller.signal.aborted) setHistory(r.data); })
      .catch(e => { if (!controller.signal.aborted) setHistoryError(posError(e)); });
    return () => controller.abort();
  }, [showHistory, scope, page, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (working.current || !loaded) return;
    if (current && !window.confirm('Close this POS shift with the cash counts entered? The saved report cannot be edited.')) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (current) {
        const result = await api.post<Shift>(`/pos/shifts/${current.id}/close`, { countedUsd: Number(counted.usd), countedSll: Number(counted.sll), note });
        setSelected(result.data); setCurrent(null); setCounted({ usd: '', sll: '' }); setNote('');
        setMessage('Shift closed. Your saved report is below. Open a new shift before receiving more POS payments.');
      } else {
        const data = { openingUsd: Number(opening.usd), openingSll: Number(opening.sll) };
        const payload = JSON.stringify(data);
        if (pending.current?.payload !== payload) pending.current = { payload, key: requestKey() };
        await api.post('/pos/shifts', { ...data, requestKey: pending.current.key });
        pending.current = null; setSelected(null); setMessage('Cashier shift opened. POS payments you collect will be recorded in this shift.');
      }
      setLoaded(false); setRefresh(n => n + 1);
    } catch (e) { setError(posError(e)); }
    finally { working.current = false; setBusy(false); }
  }

  async function view(id: string) {
    if (detailsLoading) return;
    setDetailsLoading(true); setHistoryError(''); setSelected(null);
    try { setSelected((await api.get<Shift>(`/pos/shifts/${id}`)).data); }
    catch (e) { setHistoryError(posError(e)); }
    finally { setDetailsLoading(false); }
  }

  return <section aria-label="POS cashier shift" className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Cashier shift</h2><p className="mt-1 text-xs text-slate-500">{!loaded ? 'Checking shift…' : current ? `Open · ${current.staffName} · ${new Date(current.openedAt).toLocaleString()}` : 'No open shift. Open one before recording POS payments.'}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'Hide shift controls' : current ? 'View / close shift' : 'Open cashier shift'}</button><button type="button" className={button} disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh shift</button><button type="button" className={button} aria-expanded={showHistory} onClick={() => setShowHistory(v => !v)}>Shift history</button></div>
    </div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3 text-indigo-700">{message}</p>}
    {expanded && loaded && <>
      {current && <ShiftReport shift={current} />}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <p className="text-xs text-slate-500">{current ? 'Count all cash remaining in your drawer, including opening cash. Enter 0 if there is none. Explain any difference; positive means extra cash, negative means a shortage.' : 'Enter the physical cash in your drawer before taking payments. Each staff account manages its own shift. Do not combine another cashier’s cash.'}</p>
        <div className="flex flex-wrap gap-3">{(['sll', 'usd'] as const).map(currency => <label key={currency} className="text-xs">{current ? 'Counted cash' : 'Opening cash'} — {currency === 'sll' ? 'Leones' : 'USD'}<input aria-label={`${current ? 'Counted' : 'Opening'} cash ${currency.toUpperCase()}`} className={field + ' mt-1'} type="number" min="0" max="999999999999.99" step="0.01" required disabled={busy} value={(current ? counted : opening)[currency]} onChange={e => current ? setCounted(v => ({ ...v, [currency]: e.target.value })) : setOpening(v => ({ ...v, [currency]: e.target.value }))} /></label>)}</div>
        {current && <label className="block text-xs">Closing note (required if cash differs)<textarea className={field + ' mt-1'} maxLength={1000} disabled={busy} value={note} onChange={e => setNote(e.target.value)} /></label>}
        <button className={primary} disabled={busy || !canSellPos()}>{busy ? 'Saving…' : current ? 'Close cashier shift' : 'Start cashier shift'}</button>
      </form>
    </>}
    {showHistory && <div className="mt-4 border-t pt-3"><div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Shift history</h3>{canReview && <select aria-label="Shift history scope" className={field + ' max-w-xs'} value={scope} onChange={e => { setScope(e.target.value); setPage(1); setSelected(null); }}><option value="mine">My shifts</option><option value="all">All cashiers in this property</option></select>}</div>
      {historyError && <p role="alert" className="mt-2 text-red-700">{historyError}</p>}
      {!history && !historyError && <p className="mt-3">Loading shifts…</p>}
      {history && <><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">Cashier</th><th className="p-2">Opened</th><th className="p-2">Status</th><th className="p-2">Report</th></tr></thead><tbody>{history.items.map(row => <tr key={row.id} className="border-b"><td className="p-2">{row.staffName}</td><td className="p-2">{new Date(row.openedAt).toLocaleString()}</td><td className="p-2">{row.closedAt ? 'Closed' : 'Open'}</td><td className="p-2"><button type="button" disabled={detailsLoading} className={button} onClick={() => void view(row.id)}>View report</button></td></tr>)}</tbody></table></div>{!history.items.length && <p className="mt-3 text-xs">No shifts recorded.</p>}<div className="mt-3 flex items-center gap-3"><button type="button" className={button} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-xs">Page {page}</span><button type="button" className={button} disabled={!history.hasMore} onClick={() => setPage(p => p + 1)}>Next</button></div></>}
    </div>}
    {detailsLoading && <p className="mt-3">Loading report…</p>}
    {selected && <div><ShiftReport shift={selected} /><button type="button" className={button + ' mt-2'} onClick={() => setSelected(null)}>Hide report</button></div>}
  </section>;
}
