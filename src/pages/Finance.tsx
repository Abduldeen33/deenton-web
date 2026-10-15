import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '../components/Layout';
import PaymentReceipt from '../components/PaymentReceipt';
import GuestSettlements from '../components/GuestSettlements';
import CorporateInvoices from '../components/CorporateInvoices';
import PaymentRegister from '../components/PaymentRegister';
import '../components/finance.css';
import api from '../api/client';
import { can } from '../store/permissions';

type CashRow = { id: string; date: string; customer: string; receiptNumber: string; source: string; staffName: string; amountUsd: string | number };
type Expense = { id: string; expenseDate: string; description: string; category: string; paidTo?: string; amount: string | number; staffName?: string };
type House = { id: string; name: string; balanceUsd: string | number };
type Summary = { cash: { rows: CashRow[]; totalUsd: number | string }; expenses: Expense[]; balances: number; houses: House[]; rate: number };
const today = () => new Date().toISOString().slice(0, 10);
const amount = (v: string | number) => Number(v);
const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';

export default function Finance() {
  const [receipt, setReceipt] = useState('');
  const [from, setFrom] = useState(today().slice(0, 8) + '01'), [to, setTo] = useState(today());
  const [currency, setCurrency] = useState('SLL'), [tab, setTab] = useState('overview'), [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0), [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    const span = Date.parse(to) - Date.parse(from);
    if (!from || !to || !Number.isFinite(span) || span < 0 || span > 365 * 86400000) {
      setError('Choose a valid date range of up to 366 days.'); setLoading(false); return () => controller.abort();
    }
    const config = { signal: controller.signal };
    Promise.all([
      api.get('/billing/cash-summary', { ...config, params: { from, to } }),
      api.get('/expenses', { ...config, params: { from: from + 'T00:00:00.000Z', to: to + 'T23:59:59.999Z' } }),
      api.get('/billing/outstanding', config), api.get('/billing/house-accounts', config), api.get('/billing/settings', config),
    ]).then(([cash, exp, outstanding, houses, settings]) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(cash.data?.rows) || !Array.isArray(exp.data?.expenses) || !Array.isArray(houses.data) || !Number.isFinite(Number(outstanding.data?.total)) || !Number.isFinite(Number(cash.data?.totalUsd))) throw new Error('Finance data is incomplete. Refresh or contact your administrator.');
      setData({ cash: cash.data, expenses: exp.data.expenses, balances: Number(outstanding.data.total), houses: houses.data, rate: Number(settings.data.posExchangeRate) || 0 });
    }).catch(err => { if (!controller.signal.aborted) setError(String(err.response?.data?.message || err.message || 'Unable to load finance data.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [from, to, revision]);
  const displayCurrency = currency === 'SLL' && (data?.rate || 0) > 0 ? 'SLL' : 'USD';
  const multiplier = displayCurrency === 'SLL' ? data!.rate : 1;
  const money = (value: number) => `${displayCurrency === 'SLL' ? 'Le ' : '$'}${(value * multiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const expenseTotal = data?.expenses.reduce((n, e) => n + amount(e.amount), 0) || 0;
  const houseTotal = data?.houses.reduce((n, h) => n + Math.max(0, amount(h.balanceUsd)), 0) || 0;
  const categories = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of data?.expenses || []) totals[e.category] = (totals[e.category] || 0) + amount(e.amount);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const activity = useMemo(() => [
    ...(data?.cash.rows || []).map(r => ({ id: 'cash-' + r.id, date: r.date, type: 'Cash received', description: r.customer, reference: r.receiptNumber, staff: r.staffName, usd: amount(r.amountUsd) })),
    ...(data?.expenses || []).map(e => ({ id: 'expense-' + e.id, date: e.expenseDate, type: 'Expense', description: e.description, reference: e.paidTo || e.category, staff: e.staffName || '', usd: -amount(e.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [data]);
  const filtered = activity.filter(r => `${r.description} ${r.reference} ${r.type} ${r.staff}`.toLowerCase().includes(search.toLowerCase()));
  const trend = useMemo(() => {
    const days = new Map<string, { date: string; cash: number; expenses: number }>();
    if (!data) return [];
    for (let date = new Date(from + 'T00:00:00Z'); date <= new Date(to + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10); days.set(key, { date: key, cash: 0, expenses: 0 });
    }
    for (const row of data.cash.rows) { const point = days.get(row.date.slice(0, 10)); if (point) point.cash += amount(row.amountUsd) * multiplier; }
    for (const row of data.expenses) { const point = days.get(row.expenseDate.slice(0, 10)); if (point) point.expenses += amount(row.amount) * multiplier; }
    return [...days.values()];
  }, [data, from, to, multiplier]);
  function exportCsv() {
    const rows = [['Date (UTC)', 'Type', 'Description', 'Reference', 'Staff', 'Amount USD', `Display amount ${displayCurrency}`, 'Display Leones/USD rate'],
      ...filtered.map(r => [r.date, r.type, r.description, r.reference, r.staff, r.usd.toFixed(2), (r.usd * multiplier).toFixed(2), data?.rate || 'Not configured'])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `finance-activity-${from}-${to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Layout><div className="finance-page">
    <GuestSettlements revision={revision}/>
    <CorporateInvoices/>
    <PaymentRegister/>
    {receipt && <PaymentReceipt id={receipt} onClose={() => setReceipt('')}/>}
    {can('view_inventory') && <div className="finance-actions" style={{ justifyContent: 'flex-end', marginBottom: 12 }}><Link className="finance-action" to="/inventory?new=item">Add inventory</Link></div>}
    <div className="finance-heading"><div><h1>Your business at a glance</h1><p className="finance-muted">Cash collections, spending and balances. One clear view.</p></div><div className="finance-actions"><button disabled={loading || !data} onClick={exportCsv}>Export activity CSV</button>{can('manage_expenses') && <Link className="finance-action finance-primary" to="/expenses">Record an expense</Link>}</div></div>
    <div className="finance-tabs" role="tablist" aria-label="Finance views">{['overview', 'activity'].map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'overview' ? 'Business overview' : 'Transaction activity'}</button>)}</div>
    <div className="finance-filters"><label>From (UTC)<input type="date" aria-label="Finance from date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>To (UTC)<input type="date" aria-label="Finance to date" value={to} onChange={e => setTo(e.target.value)}/></label><label>Display currency<select aria-label="Finance currency" value={displayCurrency} onChange={e => setCurrency(e.target.value)}><option value="USD">USD</option><option value="SLL" disabled={!data?.rate}>Leones</option></select></label><button onClick={() => { setFrom(today().slice(0, 8) + '01'); setTo(today()); }}>This month</button><button disabled={loading} onClick={() => setRevision(v => v + 1)}>Refresh finance</button></div>
    {error && <div role="alert" className="finance-error">{error} <button onClick={() => setRevision(v => v + 1)}>Retry</button></div>}
    {loading && <p role="status" className="finance-empty">Loading your finance workspace…</p>}
    {data && <>
      {!data.rate && <p className="finance-notice">No exchange rate is configured. Figures are displayed in USD.</p>}
      {tab === 'overview' && <>
        <section className="finance-cards" aria-label="Finance summary">
          {[['Cash received', money(Number(data.cash.totalUsd)), 'Guest folios + house accounts · selected dates'], ['Recorded expenses', money(expenseTotal), 'Operating expense records · selected dates'], ['In-house balances', money(data.balances), 'Currently outstanding · not date-filtered'], ['House-account credit', money(houseTotal), 'Positive balances · not date-filtered']].map(([title, value, note]) => <article className="finance-card" key={title}><h2>{title}</h2><p className="finance-metric">{value}</p><small>{note}</small></article>)}
        </section>
        <div className="finance-chart-grid"><section className="finance-card"><div className="finance-card-title"><h2>Cash collections & recorded expenses</h2><small>{displayCurrency}</small></div><div className="finance-legend"><span>Cash received</span><span>Expenses recorded</span></div><div className="finance-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={v => String(v).slice(5)} tick={{ fontSize: 10 }}/><YAxis tick={{ fontSize: 10 }} width={60}/><Tooltip formatter={v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}/><Bar name="Cash received" dataKey="cash" fill="#25a96a" radius={[3, 3, 0, 0]}/><Bar name="Expenses recorded" dataKey="expenses" fill="#e4a43c" radius={[3, 3, 0, 0]}/></BarChart></ResponsiveContainer></div><details><summary>View chart data</summary><div className="finance-table-wrap"><table><thead><tr><th>Date</th><th>Cash ({displayCurrency})</th><th>Expenses ({displayCurrency})</th></tr></thead><tbody>{trend.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.cash.toFixed(2)}</td><td>{d.expenses.toFixed(2)}</td></tr>)}</tbody></table></div></details></section>
        <section className="finance-card"><div className="finance-card-title"><h2>Where your spending goes</h2><Link to="/expenses" className="finance-muted">View expenses →</Link></div><p className="finance-metric">{money(expenseTotal)}</p>{!categories.length && <p className="finance-empty">No expenses in this date range.</p>}{categories.map(([name, value]) => <div key={name}><div className="finance-category"><span>{name}</span><strong>{money(value)}</strong></div><div className="finance-track"><span style={{ width: `${expenseTotal > 0 ? Math.min(100, Math.max(0, value / expenseTotal * 100)) : 0}%` }}/></div></div>)}</section></div>
      </>}
      <section className="finance-card"><div className="finance-card-title"><h2>{tab === 'overview' ? 'Recent activity' : 'Transaction activity'}</h2><input aria-label="Search finance activity" placeholder="Search receipt, name or expense" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="finance-table-wrap"><table><thead><tr><th>Date (UTC)</th><th>Type</th><th>Customer / description</th><th>Reference</th><th>Recorded by</th><th>Amount ({displayCurrency})</th><th>Receipt</th></tr></thead><tbody>{(tab === 'overview' ? filtered.slice(0, 8) : filtered).map(r => <tr key={r.id}><td>{r.date.slice(0, 10)}</td><td>{r.type}</td><td>{r.description}</td><td>{r.reference}</td><td>{r.staff || '—'}</td><td className={r.usd >= 0 ? 'finance-positive' : 'finance-negative'}>{money(r.usd)}</td><td>{r.type === 'Cash received' && <button onClick={() => setReceipt(r.id.slice(5))}>Print receipt</button>}</td></tr>)}</tbody></table></div>{!filtered.length && <p className="finance-empty">No matching transactions.</p>}<p className="finance-muted">{filtered.length} matching records{tab === 'overview' && filtered.length > 8 ? ' · showing the latest 8' : ''}</p></section>
      <p className="finance-scope">Scope: cash receipts from guest folios and house accounts only; voided receipts are excluded. POS receipts, card/mobile/bank payments and POS refunds are not included. Expenses are existing USD-based records, not bank reconciliations. This is not a profit-and-loss statement or bank balance. Leones figures use the current display rate ({data.rate > 0 ? `Le ${data.rate} / USD` : 'not configured'}); stored payment conversions are unchanged.</p>
    </>}
  </div></Layout>;
}
