import { SplitBreakdown, type SplitRecord } from './PosSplitBill';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { posButton as button, posPrimary as primary, posError, posMoney, type Currency } from '../api/pos';

export type ReceiptTarget = { id: string; copy: 'RESTAURANT' | 'KITCHEN' | 'BAR' };
type Receipt = {
  copy: ReceiptTarget['copy']; propertyName: string; orderNumber: string; createdAt: string;
  servedByName?: string | null; paidByName?: string | null; orderType: string; guestName?: string; serviceLocation?: string; roomNumber?: string; notes?: string;
  currency?: Currency; total?: string; totalUsd?: string; exchangeRate?: string;
  splitBill?: SplitRecord | null;
  billingStatus?: string; paymentMethod?: string; paymentCurrency?: Currency; paymentAmount?: string;
  reversalStatus?: string | null;
  reversal?: { refundSplitBill?: SplitRecord | null; kind: string; status: string; refundAmount: string | null; refundCurrency: Currency | null; refundMethod: string | null; refundReference: string | null; completedAt: string | null; completedByName: string | null } | null;
  items: { name: string; quantity: number; price?: string; total?: string }[];
};
export default function PosReceipt({ target, onClose }: { target: ReceiptTarget; onClose: () => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setReceipt(null); setError('');
    api.get<Receipt>('/pos/orders/' + encodeURIComponent(target.id) + '/receipt', { params: { copy: target.copy }, signal: controller.signal, timeout: 15000 })
      .then(r => { if (!controller.signal.aborted) setReceipt(r.data); })
      .catch(e => { if (!controller.signal.aborted) setError(posError(e)); });
    return () => controller.abort();
  }, [target.id, target.copy, retry]);
  const restaurant = receipt?.copy === 'RESTAURANT';
  const paid = receipt?.billingStatus === 'PAID';
  const roomPosted = receipt?.billingStatus === 'ROOM_POSTED';
  const refunded = receipt?.billingStatus === 'REFUNDED';
  const cancelled = receipt?.billingStatus === 'CANCELLED';
  return createPortal(<div id="pos-receipt-root" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <style>{`@media print {
      @page { margin: 8mm; }
      body > :not(#pos-receipt-root) { display: none !important; }
      #pos-receipt-root { position: static !important; display: block !important; background: white !important; padding: 0 !important; }
      #pos-receipt-root .receipt-panel { max-height: none !important; overflow: visible !important; width: 100% !important; max-width: 76mm !important; padding: 0 !important; margin: 0 auto !important; box-shadow: none !important; border: 0 !important; color: black !important; }
      #pos-receipt-root .no-print { display: none !important; }
      #pos-receipt-root tr { break-inside: avoid; }
    }`}</style>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Order receipt" onKeyDown={e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const controls = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }} className="receipt-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-sm text-slate-900 shadow-xl">
      <div className="no-print mb-5 flex justify-between gap-3"><button className={primary} disabled={!receipt || !!error} onClick={() => window.print()}>Print / Save PDF</button><button className={button} onClick={onClose}>Close receipt</button></div>
      {error ? <div role="alert"><p>{error}</p><button className={button + ' mt-3'} onClick={() => setRetry(n => n + 1)}>Retry receipt</button></div> : !receipt ? <p>Loading receipt…</p> : <>
        <header className="border-b border-dashed border-slate-400 pb-4 text-center"><p className="font-semibold">{receipt.propertyName}</p><h2 className="mt-2 text-lg font-bold">{restaurant ? refunded ? 'Refund receipt' : cancelled ? 'Cancelled guest check' : paid ? 'Guest receipt' : 'Guest check' : receipt.copy === 'KITCHEN' ? 'Kitchen order slip' : 'Bar order slip'}</h2><p className="mt-2 break-all text-xs">{receipt.orderNumber}</p><p className="mt-1 text-xs">{new Date(receipt.createdAt).toLocaleString()}</p></header>
        <div className="space-y-1 py-4"><p className="text-lg font-semibold">{receipt.serviceLocation || (receipt.roomNumber ? 'Room ' + receipt.roomNumber : receipt.orderType.replaceAll('_', ' '))}</p>{receipt.roomNumber && receipt.serviceLocation && <p>Room {receipt.roomNumber}</p>}<p>Guest: {receipt.guestName || 'Not recorded'}</p><p>Served by: {receipt.servedByName || 'Not assigned / not recorded'}</p><p className="text-xs">{receipt.orderType.replaceAll('_', ' ')}</p></div>
        <table className="w-full text-left text-xs"><thead><tr className="border-y border-dashed border-slate-400"><th className="py-2 pr-2">Qty</th><th className="py-2">Item</th>{restaurant && <><th className="py-2 text-right">Price</th><th className="py-2 pl-2 text-right">Amount</th></>}</tr></thead><tbody>{receipt.items.map((item, i) => <tr key={i}><td className="py-2 pr-2 align-top font-bold">{item.quantity}</td><td className="py-2 align-top break-words">{item.name}</td>{restaurant && <><td className="py-2 pl-2 text-right align-top">{posMoney(item.price || 0, receipt.currency)}</td><td className="py-2 pl-2 text-right align-top">{posMoney(item.total || 0, receipt.currency)}</td></>}</tr>)}</tbody></table>
        {receipt.notes && <p className="mt-3 whitespace-pre-wrap border-t border-dashed border-slate-400 pt-3">Notes: {receipt.notes}</p>}
        {restaurant ? <div className="mt-4 space-y-2 border-t border-dashed border-slate-400 pt-4">
          <p className="flex justify-between gap-2 font-bold"><span>{refunded || cancelled ? 'Original order total' : 'Total'}</span><span>{posMoney(receipt.total || 0, receipt.currency)}</span></p>
          {receipt.currency === 'SLL' && <p className="text-xs">USD equivalent: {posMoney(receipt.totalUsd || 0, 'USD')} · Recorded rate: 1 USD = {receipt.exchangeRate} Leones</p>}
          <p className="font-semibold">{refunded ? 'REFUNDED — FULL PAYMENT RETURNED' : cancelled ? 'CANCELLED — NO PAYMENT DUE' : paid ? 'PAID' : roomPosted ? 'POSTED TO ROOM' : receipt.billingStatus === 'ROOM_REQUESTED' ? 'ROOM BILL AWAITING APPROVAL' : 'UNPAID'}</p>
          {refunded && receipt.reversal?.refundCurrency && <div className="space-y-1 text-xs"><p>Original payment: {posMoney(receipt.paymentAmount || 0, receipt.paymentCurrency)}</p><p>Returned: {posMoney(receipt.reversal.refundAmount || 0, receipt.reversal.refundCurrency)} · {receipt.reversal.refundMethod}</p><p>Recorded by: {receipt.reversal.completedByName}</p>{receipt.reversal.completedAt && <p>{new Date(receipt.reversal.completedAt).toLocaleString()}</p>}{receipt.reversal.refundReference && <p>Refund reference: {receipt.reversal.refundReference}</p>}</div>}
          {receipt.reversalStatus === 'PENDING_REVIEW_OR_REFUND' && <p className="text-xs font-semibold">Reversal pending — do not collect another payment. Approval alone is not proof of repayment.</p>}
          {(paid || refunded) && receipt.splitBill && <SplitBreakdown bill={receipt.splitBill} />}
          {refunded && receipt.reversal?.refundSplitBill && <><SplitBreakdown bill={receipt.reversal.refundSplitBill} refunded /><p className="text-xs">Refund recorded by: {receipt.reversal.completedByName} · {receipt.reversal.completedAt && new Date(receipt.reversal.completedAt).toLocaleString()}</p>{receipt.reversal.refundReference && <p className="text-xs">Refund reference: {receipt.reversal.refundReference}</p>}</>}
          {paid && <p>Payment collected by: {receipt.paidByName || 'Not recorded'}</p>}
          {paid && receipt.paymentCurrency && receipt.paymentAmount != null && <p>Received: {posMoney(receipt.paymentAmount, receipt.paymentCurrency)} · {receipt.paymentMethod?.replaceAll('_', ' ')}</p>}
          {roomPosted && <p className="text-xs">Charged to the guest folio in USD. This is not a cash-payment receipt.</p>}
          {!paid && !roomPosted && !refunded && !cancelled && <p className="text-xs">Payment has not been recorded. This guest check is not proof of payment.</p>}
          <p className="pt-3 text-center text-xs">Thank you for dining with us.</p>
        </div> : <p className="mt-4 border-t border-dashed border-slate-400 pt-3 text-xs">{receipt.reversalStatus && <strong className="block">STOP PREPARATION — {receipt.reversalStatus.replaceAll('_', ' ')}</strong>}Preparation copy only — not a payment receipt.</p>}
        <p className="no-print mt-5 text-xs text-slate-500">Printing does not change order status or record a payment. Choose your printer and paper size in the print dialog.</p>
      </>}
    </div>
  </div>, document.body);
}
