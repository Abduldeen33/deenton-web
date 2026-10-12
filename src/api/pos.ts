import { isAxiosError } from 'axios';
export type Station = 'KITCHEN' | 'BAR' | 'FRONT_DESK';
export type Ticket = {
  id: string; course?: number; held?: boolean; timerStartedAt?: string; preparationMinutes?: number; station: Station; status: 'NEW' | 'PREPARING' | 'READY' | 'DONE'; createdAt: string;
  order: { id: string; orderNumber: string; source: string; guestName?: string; serviceLocation?: string;
    servedByName?: string | null; roomNumber?: string; notes?: string; total: string; currency: Currency; currencyTotal: string; exchangeRate?: string | null; billingStatus: string; reversalPending?: boolean;
    items: { name: string; quantity: number }[] };
};
export function stationsFor(role: string): Station[] {
  if (['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(role)) return ['KITCHEN', 'BAR', 'FRONT_DESK'];
  if (role === 'RESTAURANT') return ['KITCHEN', 'BAR'];
  return ['KITCHEN', 'BAR', 'FRONT_DESK'].includes(role) ? [role as Station] : [];
}
export function requestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function posError(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('. ');
  }
  return 'Unable to contact the restaurant. Please retry.';
}
export const posField = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm';
export const posButton = 'rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-50';
export const posPrimary = 'rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50';
export type Currency = 'USD' | 'SLL';
export type CurrencySettings = { exchangeRate: string | null; baseCurrency: 'USD' };
export const posMoney = (amount: number | string, currency: Currency = 'USD') =>
  `${currency === 'SLL' ? 'Le' : 'USD'} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Convert cents using integer arithmetic so displayed unit prices match server half-up rounding.
export function convertPrice(usd: number | string, currency: Currency, rate: number | string | null | undefined): number {
  if (currency === 'USD') return Number(usd);
  if (!rate || Number(rate) <= 0) return 0;
  const cents = BigInt(Math.round(Number(usd) * 100));
  const scaledRate = BigInt(Math.round(Number(rate) * 10000));
  return Number((cents * scaledRate + 5000n) / 10000n) / 100;
}
export function fromLeones(leones: string, rate: string | null): number {
  if (!rate || Number(rate) <= 0 || !Number.isFinite(Number(leones))) return 0;
  const cents = BigInt(Math.round(Number(leones) * 100));
  const scaledRate = BigInt(Math.round(Number(rate) * 10000));
  return Number((cents * 10000n + scaledRate / 2n) / scaledRate) / 100;
}
