import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

type Row = { reservationId: string; resNumber: string; status: string; arrival: string; cachedTotalUsd: string; cachedPaidUsd: string; cachedBalanceUsd: string; chargesUsd: string | null; paidUsd: string | null; balanceUsd: string | null; issues: { code: string; message: string; references: string[] }[] };
type Report = { propertyName: string; generatedAt: string; from: string; to: string; currency: string; scanned: number; flagged: number; issueCount: number; nextCursor: string | null; rows: Row[]; scope: string };
const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/^\s*[=+@-]/, "'$&").replaceAll('"', '""') + '"';
export default function FinanceReconciliation({ from, to }: { from: string; to: string }) {
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [onlyIssues, setOnlyIssues] = useState(true);
  const controller = useRef<AbortController | null>(null), pending = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const current = report?.from === from && report.to === to ? report : null;
  const rows = current?.rows.filter(row => !onlyIssues || row.issues.length) || [];
  async function run(after?: string) {
    if (pending.current) return;
    pending.current = true; controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setError(''); setReport(null);
    try {
      const response = await api.get<Report>('/billing/finance-reconciliation', { params: { from, to, ...(after ? { after } : {}) }, signal: request.signal, timeout: 20000 });
      if (!Array.isArray(response.data.rows) || !response.data.propertyName || !Number.isInteger(response.data.scanned)) throw new Error('Reconciliation response is incomplete.');
      if (!request.signal.aborted) setReport(response.data);
    } catch (e) {
      if (!request.signal.aborted) { const failure = e as { response?: { data?: { message?: string } }; message?: string }; setError(failure.response?.data?.message || failure.message || 'Unable to run finance checks. Please retry.'); }
    } finally { pending.current = false; if (!request.signal.aborted) setBusy(false); }
  }
  function exportReview() {
    if (!current) return;
    const csv = [
      ['Hotel', current.propertyName], ['Generated UTC', current.generatedAt], ['From UTC', current.from], ['To UTC', current.to], ['Scope', current.scope], ['Export', 'Current page / visible rows only; not a financial statement'],
      ['Reservation', 'Arrival', 'Status', 'Charges USD', 'Paid USD', 'Balance USD', 'Cached paid USD', 'Cached balance USD', 'Issue code', 'Finding', 'Source references'],
      ...rows.flatMap(row => (row.issues.length ? row.issues : [{ code: 'NO_FLAG', message: 'No exceptions detected by these limited checks', references: [] }]).map(issue => [row.resNumber, row.arrival, row.status, row.chargesUsd ?? 'Unresolved', row.paidUsd ?? 'Unresolved', row.balanceUsd ?? 'Unresolved', row.cachedPaidUsd, row.cachedBalanceUsd, issue.code, issue.message, issue.references.join('; ')])),
    ].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `finance-review-${from}-${to}-page.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="finance-card" aria-label="Finance reconciliation review">
    <div className="finance-card-title"><div><h2>Reconciliation review</h2><p className="finance-muted">Read-only checks · guest folios · USD ledger values</p></div><button className="finance-action finance-primary" disabled={busy} onClick={() => void run()}>{busy ? 'Checking records…' : 'Run finance checks'}</button></div>
    <p className="finance-notice">Find cached balance differences, missing historical conversions and possible duplicate accommodation charges. Nothing is corrected, deleted or reposted automatically. Pattern warnings need accountant review.</p>
    {!current && !busy && !error && <p className="finance-empty">Choose the dates above, then run the checks. This is not a general ledger, trial balance or bank reconciliation.</p>}
    {busy && <p role="status">Reading the hotel’s posted records…</p>}
    {error && <p role="alert" className="finance-error">{error} <button onClick={() => void run()}>Retry finance checks</button></p>}
    {current && !busy && <>
      <p className="finance-muted">{current.propertyName} · Generated {current.generatedAt} · {current.from} to {current.to} (UTC)</p>
      <div className="finance-cards" aria-label="Reconciliation page counts">{[['Reservations checked', current.scanned], ['Reservations flagged', current.flagged], ['Findings to review', current.issueCount]].map(([label, value]) => <article className="finance-card" key={label}><h3>{label}</h3><p className="finance-metric">{value}</p><small>This page only</small></article>)}</div>
      <p className="finance-muted">{current.scope}</p>
      <div className="finance-actions" style={{ margin: '14px 0' }}><label><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)}/> Only records with findings</label><button className="finance-action" onClick={exportReview}>Export review CSV</button></div>
      <div className="finance-table-wrap"><table><thead><tr>{['Reservation', 'Posted charges USD', 'Posted paid USD', 'Ledger balance USD', 'Cached balance USD', 'Findings'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.reservationId}>
        <td><Link to={'/billing?reservation=' + encodeURIComponent(row.reservationId)} className="underline">{row.resNumber}</Link><small className="block">{row.arrival} · {row.status.replaceAll('_', ' ')}</small></td>
        {[row.chargesUsd, row.paidUsd, row.balanceUsd, row.cachedBalanceUsd].map((value, index) => <td key={index}>{value ?? 'Unresolved'}</td>)}
        <td style={{ minWidth: 250 }}>{row.issues.length ? <ul>{row.issues.map((issue, i) => <li key={i} className="mb-2"><strong>{issue.code.replaceAll('_', ' ')}</strong><p>{issue.message}</p>{issue.references.length > 0 && <details><summary>Source records ({issue.references.length})</summary><p style={{ overflowWrap: 'anywhere' }}>{issue.references.join(', ')}</p></details>}</li>)}</ul> : 'No exceptions detected by these checks'}</td>
      </tr>)}</tbody></table></div>
      {!rows.length && <p className="finance-empty">{current.scanned ? 'No findings on this page. This does not certify the full accounts.' : 'No reservations or folio activity matched these dates.'}</p>}
      <div className="finance-actions"><button className="finance-action" disabled={!current.nextCursor || busy} onClick={() => void run(current.nextCursor || undefined)}>Next 100 reservations</button><button className="finance-action" onClick={() => void run()}>Restart review</button></div>
    </>}
  </section>;
}
