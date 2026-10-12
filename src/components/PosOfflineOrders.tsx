import { useEffect, useState } from 'react';
import api from '../api/client';
import { getUser } from '../store/auth';
import { canSellPos } from '../store/permissions';
import { posButton as button, posError } from '../api/pos';
type SavedOrder = { payload: Record<string, unknown>; savedAt: string };
export function posDeviceKey(kind: string) { const u = getUser(); return `anzak-pos-${kind}:${u?.propertyCode}:${u?.id}`; }
function read(): SavedOrder[] { try { const value = JSON.parse(localStorage.getItem(posDeviceKey('outbox')) || '[]'); if (!Array.isArray(value) || value.some(r => !r?.payload?.requestKey || !r.savedAt)) throw new Error('Invalid outbox'); return value; } catch { throw new Error('Saved orders could not be read. Do not clear this device; contact your manager.'); } }
async function updateOutbox(change: (rows: SavedOrder[]) => SavedOrder[]) {
  if (!navigator.locks) throw new Error('Safe offline capture requires HTTPS (or localhost). Ask your administrator to enable HTTPS on this device.');
  await navigator.locks.request(posDeviceKey('outbox'), () => { localStorage.setItem(posDeviceKey('outbox'), JSON.stringify(change(read()))); });
  window.dispatchEvent(new Event('pos-outbox-change'));
}
export async function saveOfflineOrder(payload: Record<string, unknown>) {
  if (!getUser()?.id || !canSellPos() || payload.paymentMethod !== 'PAY_AT_COUNTER') throw new Error('Only authorized staff pay-later orders can be saved offline.');
  await updateOutbox(rows => {
    if (rows.some(row => row.payload.requestKey === payload.requestKey)) return rows;
    if (rows.length >= 50) throw new Error('Sync existing saved orders before adding more.');
    return [...rows, { payload, savedAt: new Date().toISOString() }];
  });
}
export default function PosOfflineOrders({ onSynced }: { onSynced: () => void }) {
  const [rows, setRows] = useState<SavedOrder[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const load = () => { try { setRows(read()); } catch (e) { setMessage((e as Error).message); } };
  useEffect(() => { load(); window.addEventListener('pos-outbox-change', load); window.addEventListener('storage', load); return () => { window.removeEventListener('pos-outbox-change', load); window.removeEventListener('storage', load); }; }, []);
  async function sync(row: SavedOrder) {
    if (busy || !canSellPos()) return;
    setBusy(true); setMessage('');
    try {
      const result = await api.post('/pos/orders', row.payload, { timeout: 20000 });
      // Same key is reused on every retry, including a lost success response.
      await updateOutbox(rows => rows.filter(r => r.payload.requestKey !== row.payload.requestKey));
      load(); onSynced(); setMessage(`Delivered: ${result.data.orderNumber}. Payment is still due.`);
    } catch (e) { setMessage(posError(e) + ' Order remains saved; it has not been confirmed delivered. Retry the same saved order.'); }
    finally { setBusy(false); }
  }
  if (!rows.length && !message) return null;
  return <section className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 space-y-3"><h3 className="font-semibold">Device order outbox · {rows.length} awaiting confirmation</h3><p className="text-xs">Saved on this device only. Kitchen/Bar have NOT confirmed receipt. Stock is deducted only after the server accepts an order. Keep this browser data until every order is confirmed. Offline capture requires POS to have been opened while online.</p>{message && <p role="status">{message}</p>}{rows.map(row => <div key={String(row.payload.requestKey)} className="flex flex-wrap items-center gap-3 border-t pt-3"><span>{String(row.payload.guestName)} · {new Date(row.savedAt).toLocaleString()} · Not confirmed delivered</span><button disabled={busy || !canSellPos()} className={button} onClick={() => void sync(row)}>Sync saved order</button><button disabled={busy} className={button} onClick={async () => { if (!window.confirm('Check order history with your manager first: a lost response may mean the server already received this order. Removing this local copy does not cancel a server order. Remove this saved copy?')) return; try { await updateOutbox(rows => rows.filter(r => r.payload.requestKey !== row.payload.requestKey)); load(); } catch (e) { setMessage((e as Error).message); } }}>Remove local copy</button></div>)}</section>;
}
