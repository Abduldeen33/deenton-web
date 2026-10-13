import { useState } from 'react';
import api from '../api/client';
import { posButton as button, posError } from '../api/pos';
import type { ReceiptTarget } from './PosReceipt';

type Order = { id: string; orderNumber: string; serviceLocation?: string; createdAt: string; billingStatus: string; items: { station: string }[] };
export default function PosReceiptHistory({ onOpen, preparationCopies = true, preparationStations = ['KITCHEN', 'BAR'] }: { onOpen: (target: ReceiptTarget) => void; preparationCopies?: boolean; preparationStations?: ('KITCHEN' | 'BAR')[] }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setOpen(true); setBusy(true); setError('');
    try { setOrders((await api.get<{ orders: Order[] }>('/pos/summary', { timeout: 15000 })).data.orders); }
    catch (e) { setError(posError(e)); }
    finally { setBusy(false); }
  }
  return <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Guest checks & receipts</h3><button className={button} disabled={busy} onClick={() => void load()}>{busy ? 'Loading…' : open ? 'Refresh receipts' : 'View today’s orders'}</button></div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {open && !busy && !error && <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">{!orders.length && <p className="text-slate-500">No orders today.</p>}{orders.map(order => <article key={order.id} className="rounded border border-slate-200 p-3"><p className="break-all text-xs">{order.orderNumber}</p><p className="my-2 text-xs">{order.serviceLocation || 'Restaurant'} · {new Date(order.createdAt).toLocaleTimeString()} · {order.billingStatus.replaceAll('_', ' ')}</p><div className="flex flex-wrap gap-2"><button className={button} onClick={() => onOpen({ id: order.id, copy: 'RESTAURANT' })}>Guest check / receipt</button>{preparationCopies && preparationStations.includes('KITCHEN') && <button className={button} onClick={() => onOpen({id:order.id,copy:'RESTAURANT_TICKET'})}>Restaurant ticket</button>}{preparationCopies && preparationStations.filter(station => order.items.some(i => i.station === station)).map(station => <button key={station} className={button} onClick={() => onOpen({ id: order.id, copy: station })}>{station === 'KITCHEN' ? 'Kitchen slip' : 'Bar slip'}</button>)}</div></article>)}</div>}
  </section>;
}
