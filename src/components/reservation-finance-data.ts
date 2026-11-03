export type ReservationFinancials = {
  currency: string; folioId: string | null; roomTotalUsd: string | null; roomRateUsd: string | null;
  rateBasis: string; paidUsd: string | null; roomBalanceUsd: string | null; totalChargesUsd: string | null;
  totalOutstandingUsd: string | null; otherChargesUsd: string | null; otherOutstandingUsd: string | null;
  taxUsd: string | null; accommodationCreditsUsd: string | null; recordedRefundsUsd: string | null;
  status: string; allocation: string; issues: string[];
  chargeLines?: { id: string; date: string; type: string; description: string; quantity: number; unitAmountUsd: string; totalUsd: string }[];
  paymentLines?: { id: string; date: string; method: string; receiptNumber: string | null; currency: string; amount: string; exchangeRate: string | null; amountUsd: string | null; isVoided: boolean }[];
};
export const financeColumns = [
  { key: 'roomRateUsd', label: 'Room Rate', tooltip: 'Average posted accommodation charge per booked night, including recorded adjustments. Actual nightly rate snapshots are not stored.' },
  { key: 'roomTotalUsd', label: 'Room Total', tooltip: 'All posted accommodation charges and accommodation credits. Excludes separately posted tax and other services.' },
  { key: 'paidUsd', label: 'Paid', tooltip: 'Net posted folio payments using each payment’s saved conversion; voids excluded.' },
  { key: 'roomBalanceUsd', label: 'Room Balance', tooltip: 'Accommodation outstanding only when allocation can be determined. Mixed-service partial payments require allocation.' },
  { key: 'totalOutstandingUsd', label: 'Total Outstanding', tooltip: 'All posted folio charges minus net payments. Negative amounts are guest credits.' },
] as const;
export type FinanceKey = typeof financeColumns[number]['key'];
export function financeValue(value: string | null | undefined, currency = 'USD', rate?: string | null) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  if (currency === 'SLE' && (!rate || !Number.isFinite(Number(rate)) || Number(rate) <= 0)) return 'Rate needed';
  return `${currency} ${(Number(value) * (currency === 'SLE' ? Number(rate) : 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function paymentClass(status?: string) {
  return status === 'PAID' ? 'text-green-700' : status === 'PARTIAL' ? 'text-amber-700' : status === 'CREDIT' ? 'text-violet-700' : status === 'OUTSTANDING' ? 'text-red-700' : 'text-slate-500';
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
