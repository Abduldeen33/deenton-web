import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PosItemOptions, { menuLabels, type Modifier, type CustomLine } from '../components/PosItemOptions';
import { UtensilsCrossed } from 'lucide-react';
import { posButton as button, posField as field, posPrimary as primary, posError, requestKey, convertPrice, posMoney, type Currency } from '../api/pos';

type Item = CustomLine & { modifiers?: Modifier[]; menuType?: string; id: string; name: string; description?: string; imageUrl?: string; price: string };
type Menu = { tables?: { id: string; name: string; seats: number }[]; propertyName: string; currency: string; exchangeRate: string | null; categories: { id: string; name: string; items: Item[] }[] };
type Receipt = { orderNumber: string; total: string; currency: Currency; currencyTotal: string; exchangeRate: string | null; billingStatus: string };
export default function PublicMenu() {
  const [configure, setConfigure] = useState<Item | null>(null);
  const [menuType, setMenuType] = useState('ALL');
  const { propertyCode } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [cart, setCart] = useState<(Item & { quantity: number })[]>([]);
  const [guestName, setGuestName] = useState('');
  const [tableId, setTableId] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredCurrency, setCurrency] = useState<Currency>('SLL');
  const currency: Currency = menu?.exchangeRate ? preferredCurrency : 'USD';
  const price = (usd: number | string) => convertPrice(usd, currency, menu?.exchangeRate);
  const [paymentMethod, setPaymentMethod] = useState('PAY_AT_COUNTER');
  const [orderError, setOrderError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const total = cart.reduce((sum, item) => sum + Math.round(price(item.price) * 100) * item.quantity, 0) / 100;
  useEffect(() => {
    setCart([]); setReceipt(null); setTableId(''); setServiceLocation(''); pending.current = null;
  }, [propertyCode]);
  useEffect(() => {
    const controller = new AbortController();
    setMenu(null); setError('');
    axios.get<Menu>(`/api/public-menu/${encodeURIComponent(propertyCode || '')}`, { signal: controller.signal })
      .then(r => setMenu(r.data))
      .catch(e => { if (!controller.signal.aborted) setError(e.response?.status === 404 ? 'This restaurant menu is unavailable.' : 'Could not load the menu. Please try again.'); });
    return () => controller.abort();
  }, [propertyCode, retry]);
  function change(item: Item, delta: number) {
    if (delta > 0 && item.modifiers?.length && !item.menuItemId) { setConfigure(item); return; }
    setReceipt(null);
    setCart(current => current.some(i => i.id === item.id)
      ? current.map(i => i.id === item.id ? { ...i, quantity: Math.min(99, i.quantity + delta) } : i).filter(i => i.quantity > 0)
      : delta > 0 ? [...current, { ...item, quantity: 1 }] : current);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (working.current || !cart.length) return;
    working.current = true; setBusy(true); setOrderError('');
    const data = { tableId: tableId || undefined, guestName: guestName.trim(), serviceLocation: serviceLocation.trim(), notes: notes.trim(), paymentMethod, currency, ...(currency === 'SLL' && { expectedExchangeRate: Number(menu?.exchangeRate) }), items: cart.map(i => ({ menuItemId: i.menuItemId || i.id, quantity: i.quantity, options: i.options, cookingNotes: i.cookingNotes, allergyNotes: i.allergyNotes, course: i.course })) };
    const payload = JSON.stringify(data);
    if (pending.current?.payload !== payload) pending.current = { payload, key: requestKey() };
    try {
      const result = await axios.post<Receipt>(`/api/public-menu/${encodeURIComponent(propertyCode || '')}/orders`, { ...data, requestKey: pending.current.key }, { timeout: 20000 });
      setReceipt(result.data); setCart([]); setNotes(''); pending.current = null;
    } catch (e) { if (axios.isAxiosError(e) && e.response?.status === 409) setRetry(n => n + 1); setOrderError(posError(e) + ' If the connection failed, retry the same order without changing it to avoid duplicates.'); }
    finally { working.current = false; setBusy(false); }
  }
  return <div className="min-h-screen bg-slate-50 text-sm text-slate-800">
    {configure && <PosItemOptions item={configure} currency={currency} rate={menu?.exchangeRate || null} onClose={() => setConfigure(null)} onAdd={item => { change(item, 1); setConfigure(null); }} />}
    <header className="border-b border-slate-200 bg-white p-6 text-center"><UtensilsCrossed className="mx-auto mb-3 text-indigo-600" /><h1 className="text-xl font-semibold">{menu?.propertyName || 'Restaurant menu'}</h1><p className="mt-2 text-slate-500">Order food and drinks directly to your table or room.</p></header>
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      {error ? <div role="alert" className="p-6 text-center"><p>{error}</p><button onClick={() => setRetry(n => n + 1)} className={primary + ' mt-3'}>Retry</button></div> : !menu ? <p className="p-8 text-center">Loading menu…</p> : <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm">Menu currency<select aria-label="Menu currency" className={field + ' mt-1'} value={currency} disabled={busy} onChange={e => setCurrency(e.target.value as Currency)}><option value="SLL" disabled={!menu.exchangeRate}>SLL — Leones</option><option value="USD">USD — US Dollar</option></select></label>
          <div className="text-xs text-slate-500">{menu.exchangeRate ? `1 USD = ${Number(menu.exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 4 })} Leones` : 'Leones pricing is not configured yet.'}<button disabled={busy} className={button + ' ml-2'} onClick={() => setRetry(n => n + 1)}>Refresh prices</button></div>
        </div>
        <label className="mb-4 block">Service menu<select aria-label="Service menu" className={field} value={menuType} onChange={e => setMenuType(e.target.value)}><option value="ALL">All enabled menus</option>{Object.entries(menuLabels).filter(([key]) => menu.categories.some(c => c.items.some(i => (i.menuType || 'REGULAR') === key))).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        {receipt && <section role="status" className="mb-6 rounded-lg border border-green-300 bg-green-50 p-5"><h2 className="font-semibold">Order received — thank you!</h2><p className="my-2 break-all">{receipt.orderNumber}</p><p>{posMoney(receipt.currencyTotal, receipt.currency)} · {receipt.billingStatus === 'ROOM_REQUESTED' ? 'Front Desk will verify your room-bill request. No room charge has been posted yet.' : receipt.billingStatus === 'ROOM_POSTED' ? 'This order has been charged to your room.' : receipt.billingStatus === 'PAID' ? 'Payment has already been recorded.' : 'Please pay at the restaurant counter.'}</p><p className="mt-2 text-xs">Keep this order number for your server.</p></section>}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-6">
          {!menu.categories.some(c => c.items.length) && <p className="p-10 text-center">Our menu is being prepared. Please ask your server for today’s options.</p>}
          {menu.categories.filter(c => c.items.length).map(c => <section key={c.id}><h2 className="mb-3 font-semibold">{c.name}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{c.items.filter(item => menuType === 'ALL' || (item.menuType || 'REGULAR') === menuType).map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-44 w-full object-cover" />}
            <div className="p-4"><div className="flex justify-between gap-3"><h3 className="font-medium">{item.name}</h3><span className="font-semibold text-indigo-600">{posMoney(price(item.price), currency)}</span></div>{item.description && <p className="mt-2 text-xs text-slate-500">{item.description}</p>}<button disabled={busy || (cart.find(i => i.id === item.id)?.quantity || 0) >= 99 || (cart.length >= 50 && !cart.some(i => i.id === item.id))} onClick={() => change(item, 1)} className={button + ' mt-4 w-full'}>Add to order</button><button type="button" className={button + ' mt-2 w-full'} onClick={() => setConfigure(item)}>Customize / allergy notes</button></div>
          </article>)}</div></section>)}
        </div><form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-4"><h2 className="mb-4 font-semibold">Your order</h2><fieldset disabled={busy} className="space-y-4">
          {!cart.length && <p className="text-slate-500">Choose food and drinks to begin.</p>}
          {cart.map(item => <div key={item.id}><p className="text-xs">Course {item.course || 1} {item.cookingNotes}</p>{item.allergyNotes && <p className="text-xs text-red-700">ALLERGY: {item.allergyNotes}</p>}<div className="flex justify-between gap-2"><span>{item.name}</span><span>{posMoney(price(item.price) * item.quantity, currency)}</span></div><div className="mt-2 flex items-center gap-3"><button type="button" className={button} aria-label={`Remove one ${item.name}`} onClick={() => change(item, -1)}>−</button><span>{item.quantity}</span><button type="button" className={button} aria-label={`Add one ${item.name}`} disabled={item.quantity >= 99} onClick={() => change(item, 1)}>+</button></div></div>)}
          <p className="flex justify-between border-t pt-3 font-semibold"><span>Total ({currency === 'SLL' ? 'Leones' : 'USD'})</span><span>{posMoney(total, currency)}</span></p>
          <label className="block">Your name<input required maxLength={100} value={guestName} onChange={e => setGuestName(e.target.value)} className={field + ' mt-1'} /></label>
          {!!menu.tables?.length && <label className="block">Choose your table<select aria-label="Guest table" value={tableId} onChange={e => { const id = e.target.value; setTableId(id); setServiceLocation(id ? 'Table ' + menu.tables!.find(t => t.id === id)!.name : ''); }} className={field + ' mt-1'}><option value="">Room / other location</option>{menu.tables.map(t => <option key={t.id} value={t.id}>Table {t.name} · {t.seats} seats</option>)}</select></label>}
          <label className="block">Table or room number<input readOnly={!!tableId} required maxLength={100} value={serviceLocation} onChange={e => setServiceLocation(e.target.value)} placeholder="e.g. Table 5 or Room 203" className={field + ' mt-1'} /></label>
          <label className="block">Notes<textarea maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requests — discuss allergies with your server" className={field + ' mt-1'} /></label>
          <label className="block">Payment<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={field + ' mt-1'}><option value="PAY_AT_COUNTER">Pay at counter</option><option value="ROOM_CHARGE">Request charge to my room</option></select></label>
          <p className="text-xs text-slate-500">{paymentMethod === 'ROOM_CHARGE' ? 'Front Desk must verify your stay and approve the room charge.' : 'Pay your server or cashier. No payment is collected online.'}</p>
          {orderError && <p role="alert" className="text-red-700">{orderError}</p>}
          <button disabled={busy || !cart.length} className={primary + ' w-full'}>{busy ? 'Sending order…' : 'Send order'}</button>
        </fieldset></form></div>
      </>}
    </main>
  </div>;
}
