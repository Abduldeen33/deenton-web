import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import InvoicePrint from './InvoicePrint';

type Invoice = { id: string; invoiceNumber: string; createdAt: string; description: string; accountId: string; account: { name: string; type: string }; currency: string; amount: string; amountUsd: string; paidUsd: string; balanceUsd: string };
export default function CorporateInvoices() {
  const [rows, setRows] = useState<Invoice[] | null>(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0), [printId, setPrintId] = useState('');
  useEffect(() => { const c = new AbortController(); setRows(null); setError(''); api.get('/billing/invoices', { signal: c.signal }).then(r => { if (!c.signal.aborted) setRows(r.data); }).catch(e => { if (!c.signal.aborted) setError(String(e.response?.data?.message || 'Unable to load invoices')); }); return () => c.abort(); }, [refresh]);
  return <section className="finance-card"><div className="finance-card-title"><h2>Corporate / Conference invoices</h2><div className="finance-actions"><Link to="/front-desk-cash?tab=corporate" className="finance-action">Accounts, invoices & payments</Link><button onClick={() => setRefresh(n => n + 1)}>Refresh invoices</button></div></div>
    <p className="finance-muted">Separate numbered invoices, linked payments and outstanding balances. New company/conference charges create invoices; existing credit entries remain in their account statements.</p>
    {error && <p role="alert">{error}</p>}{!rows && !error && <p>Loading invoices…</p>}
    {rows && <div className="finance-table-wrap"><table><thead><tr>{['Invoice', 'Company / event', 'Description', 'Invoice amount', 'Paid USD', 'Balance USD', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.invoiceNumber}<p>{r.createdAt.slice(0, 10)}</p></td><td>{r.account.name}<p>{r.account.type}</p></td><td>{r.description}</td><td>{r.currency} {Number(r.amount).toFixed(2)}</td><td>{Number(r.paidUsd).toFixed(2)}</td><td>{Number(r.balanceUsd).toFixed(2)}</td><td><button onClick={() => setPrintId(r.id)}>View / print invoice</button> <Link to={'/front-desk-cash?tab=corporate&account=' + encodeURIComponent(r.accountId)}>Payments / statement</Link></td></tr>)}</tbody></table>{!rows.length && <p className="finance-empty">No corporate or conference invoices yet. Open Accounts, invoices & payments to create one.</p>}</div>}
    {printId && <InvoicePrint id={printId} onClose={() => setPrintId('')}/>}
  </section>;
}
