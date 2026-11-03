import { useEffect, useState } from 'react';
import api from '../api/client';
import { financeValue, paymentClass } from './reservation-finance-data';
import type { ReservationFinancials } from './reservation-finance-data';

export default function ReservationFinancialDetails({ id, revision }: { id: string; revision: string }) {
  const [data, setData] = useState<ReservationFinancials | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/reservations/${encodeURIComponent(id)}`, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) { setData(result.data.financials ?? null); setError(result.data.financials ? '' : 'Financial detail is not available for this account or record.'); }
    }).catch(() => { if (!controller.signal.aborted) setError('Unable to refresh posted financial details. Reopen this booking to retry.'); });
    return () => controller.abort();
  }, [id, revision]);
  const money = (value: string | null | undefined) => financeValue(value);
  return <section className="my-4 border-t pt-3" aria-label="Reservation financial details">
    <h3 className="font-semibold">Posted guest folio · USD</h3>
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    {!data ? !error && <p>Loading posted charges and payments…</p> : <>
      <dl className="my-3 grid grid-cols-2 gap-2">
        {[['Accommodation subtotal', data.roomTotalUsd], ['Accommodation credits / adjustments (included)', data.accommodationCreditsUsd], ['Recorded taxes (included in folio)', data.taxUsd], ['Other charges incl. tax', data.otherChargesUsd], ['Net payments', data.paidUsd], ['Recorded negative-payment refunds', data.recordedRefundsUsd], ['Room outstanding', data.roomBalanceUsd], ['Other services outstanding', data.otherOutstandingUsd]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd>{value == null && label?.includes('outstanding') && data.allocation === 'UNALLOCATED' ? 'Allocation needed' : money(value)}</dd></div>)}
        <div className="col-span-2 border-t pt-2"><dt>Total outstanding</dt><dd className={`font-semibold ${paymentClass(data.status)}`}>{money(data.totalOutstandingUsd)} {data.status === 'CREDIT' ? 'Guest credit' : data.status.replaceAll('_', ' ')}</dd></div>
      </dl>
      <details open><summary className="cursor-pointer font-medium">Posted accommodation and service charges</summary>
        <p className="my-1 text-xs text-slate-500">Recorded ledger entries, not an invented nightly schedule. Discounts appear only where posted as accommodation credits. No separate refund/transfer ledger is linked to this folio.</p>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="p-1 text-left">Posted</th><th className="p-1 text-left">Particular</th><th className="p-1 text-right">Qty</th><th className="p-1 text-right">USD</th></tr></thead><tbody>
          {data.chargeLines?.map(line => <tr key={line.id} className="border-t"><td className="p-1">{line.date.slice(0, 10)}</td><td className="p-1">{line.description}<small className="block text-slate-500">{line.type} · unit USD {line.unitAmountUsd}</small></td><td className="p-1 text-right">{line.quantity}</td><td className="p-1 text-right">{line.totalUsd}</td></tr>)}
        </tbody></table></div>
      </details>
      <details className="mt-3"><summary className="cursor-pointer font-medium">Payments and voids</summary><ul>{data.paymentLines?.map(p => <li key={p.id} className={`border-b py-2 ${p.isVoided ? 'text-slate-500' : ''}`}>
        {p.date.slice(0, 10)} · {p.receiptNumber || p.id} · {p.method.replaceAll('_', ' ')}<br />
        {p.currency} {p.amount} → {money(p.amountUsd)} {p.isVoided ? '(Voided — excluded)' : ''}{p.exchangeRate && <small className="block">Recorded rate: {p.exchangeRate} Leones / USD</small>}
      </li>)}</ul></details>
      {data.issues.length > 0 && <details className="mt-3 text-slate-500"><summary className="cursor-pointer">Ledger notes / limitations</summary><ul className="list-disc pl-4">{data.issues.map(note => <li key={note}>{note}</li>)}</ul></details>}
    </>}
  </section>;
}
