import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Plus, UtensilsCrossed, QrCode, X, ImagePlus, RefreshCw } from 'lucide-react';
import { requestKey, convertPrice, fromLeones, posMoney, type Currency, type CurrencySettings } from '../api/pos';
import { Link } from 'react-router-dom';
import PosReceipt, { type ReceiptTarget } from '../components/PosReceipt';
import PosReceiptHistory from '../components/PosReceiptHistory';
import PosItemOptions, { menuLabels, type Modifier, type CustomLine } from '../components/PosItemOptions';
import PosOfflineOrders, { posDeviceKey, saveOfflineOrder } from '../components/PosOfflineOrders';
import PosMenuSetup from '../components/PosMenuSetup';
import RestaurantPosShell from '../components/RestaurantPosShell';
import RestaurantPosDashboard from '../components/RestaurantPosDashboard';
import type { RestaurantTable } from '../components/PosTables';
import Layout from '../components/Layout';
import PosTables from '../components/PosTables';
import PosOrderSummary from '../components/PosOrderSummary';
import PosMyPayments from '../components/PosMyPayments';
import PosCashierShift from '../components/PosCashierShift';
import PosReversals from '../components/PosReversals';
import api from '../api/client';
import { getUser } from '../store/auth';
import { can, canSellPos } from '../store/permissions';

type Item = CustomLine & { modifiers?: Modifier[]; menuType?: string; station: 'KITCHEN' | 'BAR'; id: string; name: string; price: string; description?: string; imageUrl?: string };
type Category = { id: string; name: string; items: Item[] };
type Guest = { id: string; room: { roomNumber: string }; guest: { firstName: string; lastName: string } };
type Qr = { image: string; url: string; propertyName: string; localOnly: boolean };
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50';
const primary = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
function errorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'Something went wrong. Please try again.';
  if (error.response?.status === 413) return 'Choose a food photo smaller than 512 KB.';
  if (error.response?.status === 403) return 'Your account does not have permission for this action.';
  const message = error.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join('. ');
  return `Unable to contact POS (${error.response?.status || 'network error'}). Please retry.`;
}

export default function Pos() {
  const [orderDetails, setOrderDetails] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeSection, setActiveSection] = useState('menu');
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [configure, setConfigure] = useState<Item | null>(null);
  const [menuType, setMenuType] = useState('ALL');
  const [showSetup, setShowSetup] = useState(false);
  const canConfigure = ['ADMIN','SUPER_ADMIN','CEO'].includes(getUser()?.role || '') || (['RESTAURANT','BAR'].includes(getUser()?.role || '') && getUser()?.accessLevel === 'MANAGER');
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(null);
  const [lastOrderId, setLastOrderId] = useState('');
  const role = getUser()?.role || '';
  const canManage = ['ADMIN', 'SUPER_ADMIN', 'CEO'].includes(role);
  const canUse = canManage || ['RESTAURANT', 'BAR'].includes(role);
  const [menu, setMenu] = useState<Category[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [cart, setCart] = useState<(Item & { quantity: number })[]>([]);
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableState, setTableState] = useState({ ready: false, hasTables: false });
  const [tableRevision, setTableRevision] = useState(0);
  const [notes, setNotes] = useState('');
  const tableRequired = orderType === 'DINE_IN' && (!tableState.ready || (tableState.hasTables && !tableId));
  const [guestName, setGuestName] = useState('');
  const [method, setMethod] = useState('CASH');
  const [preferredCurrency, setCurrency] = useState<Currency>('SLL');
  const [preferredPaymentCurrency, setPaymentCurrency] = useState<Currency>('SLL');
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const currency: Currency = exchangeRate ? preferredCurrency : 'USD';
  const paymentCurrency: Currency = exchangeRate ? preferredPaymentCurrency : 'USD';
  const [rateDraft, setRateDraft] = useState('');
  const price = (usd: number | string) => convertPrice(usd, currency, exchangeRate);
  const money = (amount: number | string) => posMoney(amount, currency);
  const [reservationId, setReservationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [guestError, setGuestError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const pendingOrder = useRef<{ payload: string; key: string } | null>(null);
  const [dialog, setDialog] = useState<'category' | 'food' | 'qr' | null>(null);
  const [formError, setFormError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [food, setFood] = useState({ name: '', categoryId: '', price: '', description: '', station: 'KITCHEN', currency: 'USD' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [qr, setQr] = useState<Qr | null>(null);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const total = useMemo(() => cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0), [cart]);
  const shownTotal = cart.reduce((sum, i) => sum + Math.round(price(i.price) * 100) * i.quantity, 0) / 100;
  const paymentDue = paymentCurrency === currency ? shownTotal : convertPrice(total, paymentCurrency, exchangeRate);
  const itemCount = menu.reduce((sum, c) => sum + c.items.length, 0);

  async function loadMenu() {
    setLoading(true); setLoadError('');
    try {
      const [items, settings] = await Promise.all([api.get<Category[]>('/pos/menu'), api.get<CurrencySettings>('/pos/currency-settings')]);
      try { localStorage.setItem(posDeviceKey('menu-cache'), JSON.stringify({ items: items.data, settings: settings.data })); } catch { /* Menu caching is optional; order saving reports storage errors. */ }
      setMenu(items.data); setExchangeRate(settings.data.exchangeRate); setRateDraft(settings.data.exchangeRate || '');
    }
    catch (error) { try { const cached = JSON.parse(localStorage.getItem(posDeviceKey('menu-cache')) || 'null'); if (cached) { setMenu(cached.items); setExchangeRate(cached.settings.exchangeRate); } } catch { /* No cache available. */ } setLoadError(errorMessage(error)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!canUse) { setLoading(false); return; }
    void loadMenu();
    api.get<Guest[]>('/pos/in-house').then(r => setGuests(r.data))
      .catch(error => setGuestError(errorMessage(error)));
  }, [canUse]);
  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function openDialog(value: typeof dialog) {
    if (!canManage) return;
    setFormError(''); setQr(null); setDialog(value);
    if (value === 'food') {
      setFood({ name: '', categoryId: menu[0]?.id || '', price: '', description: '', station: 'KITCHEN', currency: 'USD' }); setPhoto(null);
    }
  }
  function add(item: Item) {
    setOrderDetails(true);
    if (item.modifiers?.length && !item.menuItemId) { setConfigure(item); return; }
    setCart(current => current.some(i => i.id === item.id)
      ? current.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...current, { ...item, quantity: 1 }]);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (working.current) return;
    working.current = true; setBusy(true); setFormError('');
    try {
      if (dialog === 'category') {
        const created = (await api.post<Category>('/pos/categories', { name: categoryName })).data;
        setCategoryName(''); await loadMenu();
        setFood({ name: '', categoryId: created.id, price: '', description: '', station: 'KITCHEN', currency: 'USD' });
        setPhoto(null); setDialog('food');
        setMessage('Category created. Add your first food or drink below.');
      } else if (dialog === 'food') {
        const data = new FormData();
        Object.entries(food).forEach(([key, value]) => data.append(key, value));
        if (food.currency === 'SLL') data.append('expectedExchangeRate', exchangeRate || '');
        if (photo) data.append('image', photo);
        await api.post('/pos/menu-items', data);
        setDialog(null); setPhoto(null); await loadMenu(); setMessage('Menu item added.');
      } else {
        setQr((await api.get<Qr>('/pos/qr-code', { params: { baseUrl } })).data);
      }
    } catch (error) { setFormError(errorMessage(error)); }
    finally { working.current = false; setBusy(false); }
  }
  async function saveRate(event: FormEvent) {
    event.preventDefault(); if (working.current) return;
    working.current = true; setBusy(true); setMessage('');
    try {
      const result = await api.patch<CurrencySettings>('/pos/currency-settings', { exchangeRate: Number(rateDraft) });
      setExchangeRate(result.data.exchangeRate); setRateDraft(result.data.exchangeRate || '');
      setMessage('Exchange rate saved. Existing orders keep their recorded rate.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { working.current = false; setBusy(false); }
  }
  function orderData() {
    return {
        expectedTotalUsd: Number(total.toFixed(2)),
        guestName: method === 'ROOM_CHARGE' ? undefined : guestName.trim(),
        paymentMethod: method, reservationId: reservationId || undefined,
        currency, paymentCurrency, orderType, tableId: orderType === 'DINE_IN' ? tableId || undefined : undefined, notes,
        ...((currency === 'SLL' || paymentCurrency === 'SLL') && { expectedExchangeRate: Number(exchangeRate) }),
        items: cart.map(i => ({ menuItemId: i.menuItemId || i.id, quantity: i.quantity, options: i.options, cookingNotes: i.cookingNotes, allergyNotes: i.allergyNotes, course: i.course })),
      };
  }
  async function captureOffline() {
    if (!cart.length || !canSellPos() || working.current) return;
    if (method !== 'PAY_AT_COUNTER' || !guestName.trim() || (orderType === 'DINE_IN' && !tableId)) { setMessage('For offline capture, select Pay later, enter the guest name, and select a table (or Takeaway / Room service).'); return; }
    try { const data = orderData(); const payload = JSON.stringify(data); if (pendingOrder.current?.payload !== payload) pendingOrder.current = { payload, key: requestKey() }; await saveOfflineOrder({ ...data, requestKey: pendingOrder.current.key }); pendingOrder.current = null; setCart([]); setGuestName(''); setNotes(''); setMessage('Saved on this device — NOT confirmed delivered to Kitchen/Bar. Use Sync saved order when connected.'); } catch (e) { setMessage((e as Error).message); }
  }
  async function pay() {
    if (!cart.length || working.current || tableRequired) return;
    if (method === 'ROOM_CHARGE' && !reservationId) { setMessage('Select an in-house guest.'); return; }
    if (method !== 'ROOM_CHARGE' && !guestName.trim()) { setMessage('Enter the guest name or Walk-in guest.'); return; }
    working.current = true; setBusy(true); setMessage('');
    try {
      const data = orderData();
      const payload = JSON.stringify(data);
      if (pendingOrder.current?.payload !== payload) pendingOrder.current = { payload, key: requestKey() };
      const result = await api.post('/pos/orders', { ...data, requestKey: pendingOrder.current.key });
      pendingOrder.current = null;
      setLastOrderId(result.data.id);
      setTableRevision(n => n + 1); setNotes(''); setTableId(''); setGuestName('');
      setMessage(`Order ${result.data.orderNumber} recorded. ${result.data.paymentCurrency ? 'Payment: ' + posMoney(result.data.paymentAmount, result.data.paymentCurrency) : result.data.billingStatus === 'AWAITING_PAYMENT' ? 'Awaiting payment: ' + posMoney(result.data.currencyTotal, result.data.currency) : 'Room charge: ' + posMoney(result.data.total, 'USD')}`); setCart([]); setReservationId('');
    } catch (error) { setMessage(errorMessage(error)); if (isAxiosError(error) && error.response?.status === 409) await loadMenu(); }
    finally { working.current = false; setBusy(false); }
  }
  if (!canUse) return <Layout><p className="p-6">Restaurant POS is available to restaurant staff, bar staff and administrators.</p></Layout>;

  function navigateRestaurant(section: string) {
    if (section === 'qr' && canManage) { openDialog('qr'); return; }
    setActiveSection(section); setShowDashboard(['dashboard','reports'].includes(section));
    if (['settings','modifiers'].includes(section) && canConfigure) setShowSetup(true);
    requestAnimationFrame(() => document.getElementById(['dashboard','reports'].includes(section) ? 'restaurant-dashboard' : section === 'tables' ? 'restaurant-tables' : section === 'categories' ? 'restaurant-categories' : section === 'menu' ? 'restaurant-menu' : 'restaurant-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  return <RestaurantPosShell active={activeSection} onNavigate={navigateRestaurant} search={restaurantSearch} onSearch={setRestaurantSearch} busy={busy} hasDraft={cart.length > 0}><div className="text-sm text-slate-700">
    <header className="rp-action-bar">
      <div><h2 className="text-lg font-semibold text-slate-900">Restaurant POS</h2><p className="mt-1 text-xs text-slate-500">Food, drinks and room charges · USD / Leones</p></div>
      <div className="flex flex-wrap gap-2">
        {can('view_pos_queue') && <Link to="/pos-queues" className={button}>Order queues & payments</Link>}
        {canManage && <button className={button} onClick={() => openDialog('qr')}><QrCode size={15} className="inline mr-2" />Guest menu QR</button>}
        {canManage && <><button className={button} onClick={() => openDialog('category')}>+ Category</button>
          <button className={primary} onClick={() => openDialog(menu.length ? 'food' : 'category')}><Plus size={15} className="inline mr-1" />Add food / drink</button></>}
      </div>
    </header>
    {loadError && !!menu.length && <p role="alert" className="mb-4 rounded bg-amber-50 p-3">Offline/cached menu: {loadError} Prices and stock will be validated when you sync. No payments can be recorded offline.</p>}
    {message && <div role="status" className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">{message}</div>}
    {showDashboard && <RestaurantPosDashboard currency={currency} rate={exchangeRate} revision={tableRevision} onCurrencyChange={setCurrency} />}
    <div className="restaurant-workspace">
    <div className="restaurant-order-column">
      <section id="restaurant-categories" className="rp-category-rail" aria-label="Menu categories"><h3>Categories</h3><div className="rp-category-tabs"><button aria-pressed={categoryFilter === 'ALL'} onClick={() => setCategoryFilter('ALL')}>All</button>{menu.map(c => <button key={c.id} aria-pressed={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>{c.name}</button>)}</div></section>
      <section id="restaurant-menu" className="rp-menu-panel">
        <div className="rp-menu-heading"><h3><UtensilsCrossed size={20}/>Food Menu</h3><input aria-label="Search food menu" placeholder="Search menu items…" value={restaurantSearch} onChange={e => setRestaurantSearch(e.target.value)} /></div>
    <label className="mb-4 block">Service menu<select aria-label="Service menu" className={field + ' max-w-sm'} value={menuType} onChange={e => setMenuType(e.target.value)}><option value="ALL">All enabled menus</option>{Object.entries(menuLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="rp-menu-scroll">
        {loading ? <p className="p-8">Loading menu…</p> : loadError && !menu.length ? <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-6"><p>{loadError}</p><button className={button + ' mt-3'} onClick={() => void loadMenu()}><RefreshCw size={14} className="inline mr-2" />Retry</button></div> : <>
          {!itemCount && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <UtensilsCrossed size={36} className="mx-auto mb-4 text-indigo-400" /><h3 className="font-semibold text-slate-900">Your restaurant menu is ready to set up</h3>
            <p className="mt-2 mb-5 text-slate-500">{canManage ? 'Create a category, then add your food and drinks with prices and photos.' : 'An administrator needs to add food and drinks before you can take orders.'}</p>
            {canManage && <button className={primary} onClick={() => openDialog(menu.length ? 'food' : 'category')}>{menu.length ? 'Add your first food or drink' : 'Create your first category'}</button>}
          </div>}
          {menu.filter(c => categoryFilter === 'ALL' || categoryFilter === c.id).map(category => <div key={category.id} className="mb-3">
            <h3 className="mb-3 font-semibold">{category.name} <span className="text-xs font-normal text-slate-400">({category.items.length})</span></h3>
            {!category.items.length && <p className="text-slate-400 text-xs">No items in this category yet.</p>}
            <div className="rp-food-grid">{category.items.filter(item => (menuType === 'ALL' || (item.menuType || 'REGULAR') === menuType) && (!restaurantSearch || (item.name + ' ' + (item.description || '')).toLowerCase().includes(restaurantSearch.toLowerCase()))).map(item => <div key={item.id} className="rp-food-card"><button disabled={busy || !canSellPos()} onClick={() => add(item)} className="overflow-hidden rounded-lg border border-slate-200 text-left hover:border-indigo-400 hover:shadow-sm">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-32 w-full object-cover" /> : <div className="h-24 bg-slate-50 flex items-center justify-center"><UtensilsCrossed className="text-slate-300" /></div>}
              <div className="p-3"><p className="font-medium text-slate-900">{item.name}</p>{item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}<p className="mt-2 font-semibold text-indigo-600">{money(price(item.price))}</p></div>
            </button><button disabled={busy || !canSellPos()} className={button + ' mt-1 w-full'} onClick={() => setConfigure(item)}>Customize / allergy notes</button>{canManage && <label className="mt-2 block text-xs">Send to<select aria-label={`Preparation station for ${item.name}`} className={field + ' mt-1'} value={item.station} disabled={busy} onChange={async e => {
                setBusy(true);
                try { await api.patch(`/pos/menu-items/${item.id}/station`, { station: e.target.value }); await loadMenu(); }
                catch (error) { setMessage(errorMessage(error)); }
                finally { setBusy(false); }
              }}><option value="KITCHEN">Kitchen (food)</option><option value="BAR">Bar (drinks)</option></select></label>}</div>)}</div>
          </div>)}
        </>}
      </div><div className="rp-register-checkout"><button disabled={busy || !canSellPos() || !cart.length} onClick={() => { setMethod('PAY_AT_COUNTER'); setOrderDetails(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Order guest name"]')?.focus()); }}>Review &amp; send · {cart.reduce((n, item) => n + item.quantity, 0)} items</button><button disabled={busy || !canSellPos() || !cart.length} onClick={() => { setMethod('CASH'); setOrderDetails(true); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Order guest name"]')?.focus()); }}>Review &amp; pay · {money(shownTotal)}</button></div></section>
      <aside className="rp-order-summary" id="restaurant-register">
        <PosOrderSummary table={selectedTable} disabled={busy || !tableState.ready} total={money(shownTotal)} hasItems={!!cart.length} cart={<div className="my-4 space-y-3">{cart.length ? cart.map(item => <div className="rp-register-line" key={item.id}>
          <div className="flex justify-between gap-2"><span>{item.name}</span><span>{money(price(item.price) * item.quantity)}</span></div><p className="text-xs">Course {item.course || 1} {item.cookingNotes && '· ' + item.cookingNotes}</p>{item.allergyNotes && <p className="text-xs font-semibold text-red-700">ALLERGY: {item.allergyNotes}</p>}
          <div className="mt-1 flex items-center gap-3"><button className={button} disabled={busy} aria-label={`Remove one ${item.name}`} onClick={() => setCart(c => c.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0))}>−</button><span>{item.quantity}</span><button className={button} disabled={busy} aria-label={`Add one ${item.name}`} onClick={() => add(item)}>+</button></div>
        </div>) : <p className="rp-cart-empty">Choose menu items to begin.</p>}</div>} onChange={() => setTableRevision(n => n + 1)} onReceipt={id => setReceiptTarget({ id, copy: 'RESTAURANT' })} onAdd={() => { setOrderDetails(true); requestAnimationFrame(() => { const input = document.querySelector<HTMLInputElement>('[aria-label="Order guest name"]'); input?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); input?.focus({ preventScroll: true }); }); }} />
        <span className="sr-only">Current order</span>
        <details className="rp-order-details" open={orderDetails} onToggle={e => setOrderDetails(e.currentTarget.open)}>
        <summary>Order details &amp; payment</summary>
        <p className="mt-2 text-xs text-slate-500">Served by: {selectedTable?.assignedWaiterName || `${getUser()?.firstName || ''} ${getUser()?.lastName || ''}`} {selectedTable?.assignedWaiterId ? '(assigned table waiter)' : '(your signed-in account)'}</p>
        {method !== 'ROOM_CHARGE' && <label className="block mt-3 text-xs">Guest name<input aria-label="Order guest name" maxLength={100} required value={guestName} disabled={busy} onChange={e => setGuestName(e.target.value)} placeholder="Guest name or Walk-in guest" className={field + ' mt-1'} /></label>}
        <label className="block mt-3 text-xs">Order type<select aria-label="Order type" value={orderType} disabled={busy} onChange={e => { setOrderType(e.target.value); setTableId(''); }} className={field + ' mt-1'}><option value="DINE_IN">Dine in</option><option value="TAKEAWAY">Takeaway</option><option value="ROOM_SERVICE">Room service</option></select></label>
        {tableRequired && <p className="mt-2 text-xs text-amber-700">{tableState.ready ? 'Select a table above for this order.' : 'Waiting for table availability. Use Refresh tables to retry.'}</p>}
        <label className="block mt-3 text-xs">Kitchen / bar notes<textarea maxLength={1000} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} className={field + ' mt-1'} /></label>
        <div className="border-t pt-3 flex justify-between font-semibold"><span>Total</span><span>{money(shownTotal)}</span></div>
        <label className="block mt-4 text-xs">Payment method<select value={method} disabled={busy} onChange={e => setMethod(e.target.value)} className={field + ' mt-1'}>{['CASH', 'CARD', 'ORANGE_MONEY', 'AFRIMONEY', 'ROOM_CHARGE', 'PAY_AT_COUNTER'].map(m => <option key={m} value={m}>{m === 'PAY_AT_COUNTER' ? 'Pay later / at counter' : m.replaceAll('_', ' ')}</option>)}</select></label>
        {method === 'PAY_AT_COUNTER' ? <p className="mt-3 text-xs text-slate-500">Send to Kitchen / Bar now. Record payment later in My orders awaiting payment below. Authorized cashiers can also use Order queues &amp; payments.</p> : method !== 'ROOM_CHARGE' ? <label className="block mt-3 text-xs">Payment currency<select aria-label="Payment currency" value={paymentCurrency} disabled={busy} onChange={e => setPaymentCurrency(e.target.value as Currency)} className={field + ' mt-1'}><option value="SLL" disabled={!exchangeRate}>SLL — Leones</option><option value="USD">USD — US Dollar</option></select><span className="mt-2 block font-semibold text-sm">Collect {posMoney(paymentDue, paymentCurrency)}</span></label> : <p className="mt-3 text-xs text-slate-500">The guest folio will be charged {posMoney(total, 'USD')}.</p>}
        {method === 'ROOM_CHARGE' && (guestError ? <p className="mt-3 text-red-600">{guestError}</p> : <label className="block mt-3 text-xs">In-house guest<select value={reservationId} disabled={busy} onChange={e => setReservationId(e.target.value)} className={field + ' mt-1'}><option value="">Select guest</option>{guests.map(g => <option key={g.id} value={g.id}>Room {g.room.roomNumber} — {g.guest.firstName} {g.guest.lastName}</option>)}</select></label>)}
        {canSellPos() && method === 'PAY_AT_COUNTER' && <button disabled={busy || !cart.length} className={button + ' mt-3 w-full'} onClick={() => void captureOffline()}>Save offline — not sent to Kitchen</button>}
        {!['ROOM_CHARGE', 'PAY_AT_COUNTER'].includes(method) && <p className="mt-3 text-xs text-slate-500">Only record payment after receiving the amount shown above. This does not process a card or mobile-money transfer.</p>}
        <button disabled={!canSellPos() || busy || loading || !!loadError || tableRequired || !cart.length || (method !== 'ROOM_CHARGE' && !guestName.trim()) || (method === 'ROOM_CHARGE' && (!reservationId || !!guestError))} onClick={() => void pay()} className={primary + ' mt-4 w-full'}>{busy ? 'Please wait…' : method === 'PAY_AT_COUNTER' ? 'Place order — pay later' : method === 'ROOM_CHARGE' ? 'Place order — charge room' : 'Place order & record payment'}</button>
        </details>
      </aside>
    </div></div>
    <PosTables search={restaurantSearch} onSelected={setSelectedTable} value={tableId} onChange={id => { setTableId(id); setOrderType('DINE_IN'); }} onAvailability={setTableState} canManage={canManage} disabled={busy} revision={tableRevision} />
    <section id="restaurant-tools" className="rp-operations rp-settings-heading"><h2>Restaurant tools & settings</h2>
    {canConfigure && <button className={button + ' mb-4'} onClick={() => setShowSetup(!showSetup)}>{showSetup ? 'Close menu setup' : 'Menu & recipe setup'}</button>}
    {showSetup && canConfigure && <PosMenuSetup onChange={() => void loadMenu()} />}
    {configure && <PosItemOptions item={configure} currency={currency} rate={exchangeRate} onClose={() => setConfigure(null)} onAdd={item => { add(item); setConfigure(null); }} />}
    <PosCashierShift revision={tableRevision} />
    {canSellPos() && <PosMyPayments revision={tableRevision} onPaid={id => { setTableRevision(n => n + 1); setReceiptTarget({ id, copy: 'RESTAURANT' }); }} />}
    <PosReversals onChange={() => setTableRevision(n => n + 1)} onReceipt={setReceiptTarget} />
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs">Display prices in<select aria-label="Price currency" value={currency} disabled={busy} onChange={e => { setCurrency(e.target.value as Currency); setPaymentCurrency(e.target.value as Currency); }} className={field + ' mt-1'}><option value="SLL" disabled={!exchangeRate}>SLL — Leones</option><option value="USD">USD — US Dollar</option></select></label>
        <p className="text-xs text-slate-500">{exchangeRate ? `1 USD = ${Number(exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 4 })} Leones` : 'An administrator must set the exchange rate to enable Leones.'}</p>
        <button className={button} disabled={busy} onClick={() => void loadMenu()}>Refresh prices</button>
      </div>
      {canManage && <form onSubmit={saveRate} className="mt-4 flex flex-wrap items-end gap-3 border-t pt-3">
        <label className="text-xs">Exchange rate: Leones per 1 USD<input aria-label="Leones per USD" required type="number" min="0.0001" max="99999999.9999" step="0.0001" value={rateDraft} disabled={busy} onChange={e => setRateDraft(e.target.value)} className={field + ' mt-1'} /></label>
        <button disabled={busy} className={primary}>Save exchange rate</button>
      </form>}
    </section>
    <PosOfflineOrders onSynced={() => { setTableRevision(n => n + 1); void loadMenu(); }} />
    <PosReceiptHistory onOpen={setReceiptTarget} preparationStations={role === 'BAR' ? ['BAR'] : undefined} />
    {canSellPos() && <p className="mb-4 text-xs">For split bills or multiple payment methods, place the order with Pay later, then use My orders awaiting payment below or your authorized cashier workspace.</p>}
    {lastOrderId && <button className={button + ' mb-4'} onClick={() => setReceiptTarget({ id: lastOrderId, copy: 'RESTAURANT' })}>Last order receipt</button>}
    {receiptTarget && <PosReceipt target={receiptTarget} onClose={() => setReceiptTarget(null)} />}

    </section>
    {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="pos-dialog-title" className="max-h-[90vh] overflow-y-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5"><h3 id="pos-dialog-title" className="font-semibold text-slate-900">{dialog === 'category' ? 'New category' : dialog === 'food' ? 'Add food / drink' : 'Guest menu QR code'}</h3><button disabled={busy} aria-label="Close" onClick={() => setDialog(null)}><X size={20} /></button></div>
        {formError && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{formError}</p>}
        <form onSubmit={save} className="space-y-4">
          {dialog === 'category' && <label className="block">Category name<input autoFocus required maxLength={100} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Main dishes, Drinks, Desserts" className={field + ' mt-1'} /></label>}
          {dialog === 'food' && <>
            <label className="block">Category<select required value={food.categoryId} onChange={e => setFood({ ...food, categoryId: e.target.value })} className={field + ' mt-1'}><option value="">Choose category</option>{menu.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="block">Food or drink name<input autoFocus required maxLength={150} value={food.name} onChange={e => setFood({ ...food, name: e.target.value })} className={field + ' mt-1'} /></label>
            <label className="block">Preparation station<select value={food.station} onChange={e => setFood({ ...food, station: e.target.value })} className={field + ' mt-1'}><option value="KITCHEN">Kitchen (food)</option><option value="BAR">Bar (drinks)</option></select></label>
            <label className="block">Price currency<select aria-label="New item currency" value={food.currency} onChange={e => setFood({ ...food, currency: e.target.value })} className={field + ' mt-1'}><option value="SLL" disabled={!exchangeRate}>SLL — Leones</option><option value="USD">USD — US Dollar</option></select></label>
            {food.currency === 'SLL' && <p className="text-xs text-slate-500">Converted and saved in USD, rounded to cents: {posMoney(fromLeones(food.price, exchangeRate), 'USD')}. Displayed Leones prices follow the saved rate.</p>}
            <label className="block">Price ({food.currency === 'SLL' ? 'Leones' : 'USD'})<input required type="number" min="0.01" max="99999999.99" step="0.01" value={food.price} onChange={e => setFood({ ...food, price: e.target.value })} className={field + ' mt-1'} /></label>
            <label className="block">Description<textarea maxLength={2000} value={food.description} onChange={e => setFood({ ...food, description: e.target.value })} className={field + ' mt-1'} /></label>
            <label className="block"><ImagePlus size={16} className="inline mr-2" />Food photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" className={field + ' mt-1'} onChange={e => {
              const file = e.target.files?.[0] || null;
              if (file && (file.size > 512 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
                setFormError('Choose a JPG, PNG or WebP photo smaller than 512 KB.'); e.target.value = ''; setPhoto(null); return;
              }
              setFormError(''); setPhoto(file);
            }} /></label>
            <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 512 KB.</p>
            {preview && <img src={preview} alt="Food photo preview" className="h-36 w-full rounded-lg object-cover" />}
          </>}
          {dialog === 'qr' && <>
            <p>Guests scan this code to browse and order food and drinks without logging in.</p>
            <label className="block">Website address<input required type="url" value={baseUrl} onChange={e => { setBaseUrl(e.target.value); setQr(null); }} className={field + ' mt-1'} /></label>
            <p className="text-xs text-slate-500">Use your published website or a network address reachable from guests’ phones.</p>
          </>}
          <button disabled={busy} className={primary + ' w-full'}>{busy ? 'Please wait…' : dialog === 'qr' ? 'Generate QR code' : dialog === 'category' ? 'Create category' : 'Save menu item'}</button>
        </form>
        {qr && <div className="mt-4 text-center">
          <img src={qr.image} alt={`Menu QR code for ${qr.propertyName}`} className="w-64 mx-auto" />
          {qr.localOnly && <p className="text-amber-700 bg-amber-50 p-3 mb-3">This localhost address works only on this computer. Enter your public website or local network address before sharing with guests.</p>}
          <a href={qr.url} target="_blank" rel="noreferrer" className="block text-indigo-600 break-all mb-4">Preview guest menu</a>
          <a href={qr.image} download="restaurant-menu-qr.png" className={button}>Download QR code</a>
        </div>}
      </section>
    </div>}
  </div></RestaurantPosShell>;
}
