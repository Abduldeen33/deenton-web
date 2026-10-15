import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

type Count = { guests: number; bookings: number };
type Row = { id: string; resNumber: string; guestName: string; roomNumber: string; status: string; guests: number; checkedInAt: string | null; checkedOutAt: string | null; totalUsd: string; paidUsd: string; balanceUsd: string; settled: boolean };
type Summary = { inHouse: Count; checkedIn: Count; checkedOut: Count; historicalCheckoutsWithoutTime: number; rows: Row[] };
const today = () => new Date().toISOString().slice(0, 10);

export default function GuestSettlements({ revision = 0 }: { revision?: number }) {
  const [from, setFrom] = useState(today), [to, setTo] = useState(today);
  const [refresh, setRefresh] = useState(0), [data, setData] = useState<Summary | null>(null), [error, setError] = useState('');
  const [filter, setFilter] = useState('IN_HOUSE');
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    api.get('/billing/guest-settlements', { params: { from, to }, signal: controller.signal }).then(r => { if (!controller.signal.aborted) setData(r.data); })
      .catch(e => { if (!controller.signal.aborted) setError(String(e.response?.data?.message || 'Unable to load guest settlements.')); });
    return () => controller.abort();
  }, [from, to, revision, refresh]);
  const inRange = (date: string | null) => !!date && date.slice(0, 10) >= from && date.slice(0, 10) <= to;
  const rows = data?.rows.filter(r => filter === 'IN_HOUSE' ? ['ARRIVED', 'STAYOVER', 'DUE_OUT'].includes(r.status) : filter === 'CHECKED_IN' ? inRange(r.checkedInAt) : inRange(r.checkedOutAt)) || [];
  return <section className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700 my-4" aria-label="Guest stays and settlement">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Guest stays & settlement</h2><div className="flex flex-wrap gap-2"><label>From (UTC) <input aria-label="Stay from date" type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded border p-1"/></label><label>To (UTC) <input aria-label="Stay to date" type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded border p-1"/></label><button className="rounded border px-3" onClick={() => setRefresh(n => n + 1)}>Refresh stays</button></div></div>
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}{!data && !error && <p role="status">Loading guest stays…</p>}
    {data && <><div className="my-4 grid gap-3 sm:grid-cols-3">{([['IN_HOUSE', 'Currently checked in', data.inHouse], ['CHECKED_IN', 'Checked in — selected dates', data.checkedIn], ['CHECKED_OUT', 'Checked out — selected dates', data.checkedOut]] as const).map(([key, title, count]) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={'rounded border p-3 text-left ' + (filter === key ? 'border-indigo-500 bg-indigo-50' : '')}><p>{title}</p><strong className="text-lg">{count.guests} guests</strong><p className="text-xs">{count.bookings} bookings · adults + children</p></button>)}</div>
      <p className="text-xs mb-3">Full payment is required before check-in. Figures below are USD ledger values. Scheduled arrivals/departures are not counted as completed stays.</p>
      {!!data.historicalCheckoutsWithoutTime && <p className="mb-3 text-xs text-amber-800">{data.historicalCheckoutsWithoutTime} older checked-out bookings have no recorded checkout time and are excluded from date-based counts.</p>}
      <div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{['Guest / booking', 'Room', 'Guests', 'Actual check-in', 'Actual check-out', 'Charges USD', 'Paid USD', 'Balance USD', 'Settlement'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.guestName}<p>{r.resNumber}</p></td><td>{r.roomNumber}</td><td>{r.guests}</td><td>{r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : 'Not recorded'}</td><td>{r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleString() : '—'}</td><td>{Number(r.totalUsd).toFixed(2)}</td><td>{Number(r.paidUsd).toFixed(2)}</td><td>{Number(r.balanceUsd).toFixed(2)}</td><td><Link className="text-indigo-700 underline" to={'/billing?reservation=' + encodeURIComponent(r.id)}>{r.settled ? 'Settled · view folio' : 'Outstanding · settle'}</Link></td></tr>)}</tbody></table>{!rows.length && <p className="py-4 text-slate-500">No matching guest stays.</p>}</div>
    </>}
  </section>;
}
