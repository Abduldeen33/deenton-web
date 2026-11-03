import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getUser } from '../store/auth';
import { canSellPos } from '../store/permissions';
import { posButton as button, posError } from '../api/pos';

type SavedOrder = { payload: Record<string, unknown>; savedAt: string; blocked?: string; attempts?: number; retryAt?: number };
export function posDeviceKey(kind: string) { const u = getUser(); return `anzak-pos-${kind}:${u?.propertyCode}:${u?.id}`; }
function read(key = posDeviceKey('outbox')): SavedOrder[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value) || value.some(r => !r?.payload?.requestKey || !r.savedAt)) throw new Error();
    return value;
  } catch { throw new Error('Saved orders could not be read. Do not clear this device; contact your manager.'); }
}
async function updateOutbox(change: (rows: SavedOrder[]) => SavedOrder[], key = posDeviceKey('outbox')) {
  if (!navigator.locks) throw new Error('Safe offline capture requires HTTPS (or localhost).');
  await navigator.locks.request(key, () => localStorage.setItem(key, JSON.stringify(change(read(key)))));
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
  const callback = useRef(onSynced); callback.current = onSynced;
  const syncing = useRef(false);
  const load = () => { try { setRows(read()); } catch (e) { setMessage((e as Error).message); } };
  async function sync(only?: string) {
    if (syncing.current || !navigator.onLine || !canSellPos() || !getUser()?.id || !navigator.locks) return;
    const key = posDeviceKey('outbox');
    syncing.current = true; setBusy(true);
    try {
      await navigator.locks.request(key + ':delivery', { ifAvailable: true }, async lock => {
        if (!lock) return;
        for (const row of read(key)) {
          if (posDeviceKey('outbox') !== key || !getUser()?.id || !canSellPos() || !navigator.onLine) break;
          if (only ? row.payload.requestKey !== only : row.blocked || (row.retryAt || 0) > Date.now()) continue;
          try {
            const result = await api.post('/pos/orders', row.payload, { timeout: 20000 });
            if (!result.data?.id || !result.data?.orderNumber) throw new Error('Server did not confirm the order.');
            await updateOutbox(rows => rows.filter(r => r.payload.requestKey !== row.payload.requestKey), key);
            if (posDeviceKey('outbox') === key) { callback.current(); setMessage(`Delivered: ${result.data.orderNumber}. Payment is still due.`); }
          } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            const blocked = status && status >= 400 && status < 500 && status !== 429 ? posError(e) : undefined;
            const attempts = (row.attempts || 0) + 1;
            await updateOutbox(rows => rows.map(r => r.payload.requestKey === row.payload.requestKey ? { ...r, blocked, attempts, retryAt: Date.now() + Math.min(300000, 15000 * 2 ** Math.min(attempts - 1, 5)) } : r), key);
            if (posDeviceKey('outbox') === key) setMessage(blocked ? 'An order needs review before retrying. It remains saved.' : 'Connection not confirmed. Saved orders will retry automatically.');
            if (!blocked) break;
          }
        }
      });
    } catch (e) { setMessage((e as Error).message); }
    finally { syncing.current = false; setBusy(false); load(); }
  }
  useEffect(() => {
    const changed = () => { load(); void sync(); };
    changed();
    window.addEventListener('pos-outbox-change', changed); window.addEventListener('storage', changed); window.addEventListener('online', changed);
    const timer = setInterval(changed, 15000);
    return () => { clearInterval(timer); window.removeEventListener('pos-outbox-change', changed); window.removeEventListener('storage', changed); window.removeEventListener('online', changed); };
  }, []);
  if (!rows.length && !message) return null;
  return <section className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 space-y-3">
    <h3 className="font-semibold">Device order outbox · {rows.length} awaiting confirmation</h3>
    <p className="text-xs">Automatically syncs while this POS is open and connected. Saved orders have NOT been confirmed by Kitchen/Bar. Keep this browser data until delivery is confirmed. Payments are never collected offline. Open POS online before using offline capture.</p>
    {message && <p role="status">{message}</p>}
    {rows.map(row => <div key={String(row.payload.requestKey)} className="flex flex-wrap items-center gap-3 border-t pt-3">
      <span>{String(row.payload.guestName || 'Guest')} · {new Date(row.savedAt).toLocaleString()} · Not confirmed delivered</span>
      {row.blocked && <p role="alert" className="text-red-700">Needs review: {row.blocked}. Check stock, menu availability and permissions before retrying.</p>}
      <button disabled={busy || !canSellPos()} className={button} onClick={() => void sync(String(row.payload.requestKey))}>Sync saved order</button>
      <button disabled={busy} className={button} onClick={async () => {
        if (!window.confirm('A lost response may mean this order was received. Check order history first. Remove only this local copy? This does not cancel a server order.')) return;
        try { await updateOutbox(rows => rows.filter(r => r.payload.requestKey !== row.payload.requestKey)); } catch(e) { setMessage((e as Error).message); }
      }}>Remove local copy</button>
    </div>)}
  </section>;
}
