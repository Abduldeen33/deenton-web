import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';

export default function PaymentReceipt({ id, onClose }: { id: string; onClose: () => void }) {
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api.get(`/billing/receipts/${id}`).then(r => { if (active) setReceipt(r.data); }).catch(e => { if (active) setError(e.response?.data?.message || 'Unable to load receipt'); }); return () => { active = false; }; }, [id]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  const amount = (value: any) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return createPortal(<div id="payment-receipt-overlay" role="dialog" aria-modal="true" aria-label="Payment receipt" className="fixed inset-0 z-[200] bg-black/40 overflow-auto p-6">
    <style>{`@media print { body > *:not(#payment-receipt-overlay) { display: none !important; } #payment-receipt-overlay { position: static !important; background: white !important; padding: 0 !important; } #payment-receipt-overlay .receipt-controls { display: none !important; } #payment-receipt-overlay article { box-shadow: none; max-width: 100%; } }`}</style>
    <article className="mx-auto max-w-lg rounded border bg-white p-6 text-sm text-slate-800 shadow-xl">
      <div className="receipt-controls flex justify-between mb-6"><button autoFocus onClick={onClose}>Close</button><button disabled={!receipt} onClick={() => window.print()} className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-40">Print receipt</button></div>
      {error && <p role="alert">{error}</p>}{!receipt && !error && <p>Loading receipt…</p>}
      {receipt && <><h1 className="text-lg font-semibold">{receipt.propertyName}</h1><p>{receipt.propertyCode} · Anzak Cloud</p><h2 className="mt-5 font-semibold">{receipt.isVoided ? 'VOIDED RECEIPT' : 'PAYMENT RECEIPT'} · {receipt.receiptNumber}</h2><p>{new Date(receipt.date).toLocaleString()}</p><hr className="my-4" /><p>Customer: {receipt.customer}</p>{receipt.reservation && <p>Reservation: {receipt.reservation} · Room {receipt.room}</p>}<p>Received by: {receipt.staffName}</p><p>{receipt.description}</p><p>Method: {receipt.method}</p><p>Reference: {receipt.reference || '—'}</p><hr className="my-4" /><p className="font-semibold">Received: {receipt.currency} {amount(receipt.amount)}</p><p>USD value: {amount(receipt.amountUsd)}</p><p>Leones value: {receipt.amountSll == null ? 'Historical exchange rate unavailable' : amount(receipt.amountSll)}</p>{receipt.exchangeRate && <p>Recorded rate: 1 USD = {amount(receipt.exchangeRate)} Leones</p>}<p className="mt-4 text-xs text-slate-500">Currency equivalents describe the same payment, not two separate payments.</p></>}
    </article>
  </div>, document.body);
}
