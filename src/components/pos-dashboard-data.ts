export type DashboardOrder = {
  id: string; orderNumber: string; guestName?: string; serviceLocation?: string;
  total: string; billingStatus: string; createdAt: string; source?: string;
  paymentMethod?: string; splitBill?: { shares: { tenders: { method: string; amountUsd: string }[] }[] } | null;
};
export const paymentLabels = ['Cash', 'Card', 'Mobile / other', 'Unclassified'];
export function paymentValues(order: DashboardOrder): number[] {
  const values = [0, 0, 0, 0];
  if (order.billingStatus !== 'PAID') return values;
  const total = Number(order.total);
  if (!Number.isFinite(total) || total < 0) return values;
  const bucket = (method?: string) => method === 'CASH' ? 0 : method === 'CARD' ? 1 : method && method !== 'SPLIT' ? 2 : 3;
  if (order.paymentMethod !== 'SPLIT') { values[bucket(order.paymentMethod)] = total; return values; }
  const tenders = order.splitBill?.shares?.flatMap(s => s.tenders || []) || [];
  // Saved USD amounts already use the exchange rate at settlement, never today's rate.
  if (!tenders.length || tenders.some(t => !Number.isFinite(Number(t.amountUsd)) || Number(t.amountUsd) < 0) || Math.abs(tenders.reduce((n,t) => n + Number(t.amountUsd),0) - total) > 0.011) { values[3] = total; return values; }
  tenders.forEach(t => { values[bucket(t.method)] += Number(t.amountUsd); });
  return values;
}
export function dashboardData(orders: DashboardOrder[]) {
  const payments = orders.map(paymentValues);
  const totals = paymentLabels.map((_,i) => payments.reduce((n,p) => n + p[i],0));
  const blocks = Array.from({ length: 6 }, (_,i) => ({ id: String(i), label: `${String(i*4).padStart(2,'0')}:00`, values: paymentLabels.map((_,j) => orders.reduce((n,o,k) => n + (Math.floor(new Date(o.createdAt).getHours()/4) === i ? payments[k][j] : 0),0)) }));
  const sources = [{ id: 'STAFF', label: 'Staff orders', color: '#2bc77b' }, { id: 'QR', label: 'Guest QR', color: '#ffbd45' }, { id: 'OTHER', label: 'Other / unknown', color: '#8c70ed' }].map(s => ({ ...s, count: orders.filter(o => s.id === 'OTHER' ? !['STAFF','QR'].includes(o.source || '') : o.source === s.id).length }));
  return { totals, blocks, sources };
}
