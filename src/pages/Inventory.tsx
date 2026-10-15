import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';

type Access = { departments: string[]; canWrite: boolean; canAssign: boolean; canCreateDepartment: boolean };
type CurrencySettings = { exchangeRate: string | null; canEdit: boolean };
type Category = { id: string; name: string };
type Item = {
  id: string;
  department: string;
  name: string;
  category: Category;
  sku?: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  costPrice: string | null;
  sellingPrice: string | null;
  reorderQuantity: string | null;
  supplierName?: string;
  storageLocation?: string;
};
type Movement = {
  id: string;
  item: Item;
  type: string;
  quantity: string;
  stockBefore: string | null;
  stockAfter: string | null;
  notes?: string;
  reason?: string;
  reference?: string;
  recordedBy?: string;
  recordedByName?: string;
  issuedTo?: string;
  createdAt: string;
};
const label = (value: string) =>
  value === 'ALL'
    ? 'All departments'
    : value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/^It$/, 'IT');
const field =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm';
const button =
  'rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-50';
const primary =
  'rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50';
const cell = 'whitespace-nowrap border border-slate-200 px-3 py-2 text-left';
function errorMessage(e: unknown) {
  const message = isAxiosError(e) ? e.response?.data?.message : null;
  return Array.isArray(message)
    ? message.join('. ')
    : typeof message === 'string'
      ? message
      : 'Unable to load inventory. Please retry.';
}
const emptyItem = {
  name: '',
  categoryId: '',
  department: '',
  unit: 'pcs',
  sku: '',
  description: '',
  storageLocation: '',
  supplierName: '',
  currentStock: '0',
  minimumStock: '0',
  reorderQuantity: '',
  costPrice: '',
  sellingPrice: '',
};

export default function Inventory() {
  const [searchParams,setSearchParams]=useSearchParams();
  const openingFromDashboard=useRef(false);
  const [entryItemId,setEntryItemId]=useState('');
  const [stockMethod,setStockMethod]=useState<'IN'|'OUT'|'COUNT'>('IN');
  const [currency, setCurrency] = useState<'SLL' | 'USD'>('SLL');
  const [settings, setSettings] = useState<CurrencySettings | null>(null);
  const [rateMode, setRateMode] = useState('SAVED');
  const [rateDraft, setRateDraft] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<'SLL' | 'USD'>('SLL');
  const [entryRate, setEntryRate] = useState<number | undefined>();
  const rate = Number(settings?.exchangeRate);
  const hasRate = Number.isFinite(rate) && rate > 0;
  const money = (value: string | null, unit = currency) =>
    value == null
      ? '—'
      : unit === 'SLL' && !hasRate
        ? 'Leones: rate not set'
        : `${unit === 'SLL' ? 'Le' : 'USD'} ${(Number(value) * (unit === 'SLL' ? rate : 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const [access, setAccess] = useState<Access | null>(null);
  const [department, setDepartment] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState({
    departments: [] as {department:string;totalItems:number;lowStock:number;unpricedItems:number;totalValue:string}[],
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: '0',
  });
  const [tab, setTab] = useState('ITEMS');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [dialog, setDialog] = useState<
    'ITEM' | 'CATEGORY' | 'DEPARTMENT' | 'IN' | 'OUT' | 'COUNT' | 'ASSIGN' | null
  >(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [draft, setDraft] = useState(emptyItem);
  const [category, setCategory] = useState({ name: '', description: '' });
  const [departmentName, setDepartmentName] = useState('');
  const [movement, setMovement] = useState({
    issuedTo: '',
    quantity: '',
    reason: '',
    reference: '',
    department: '',
  });
  useEffect(() => {
    const controller = new AbortController();
    api
      .get<Access>('/inventory/access', {
        signal: controller.signal,
        timeout: 15000,
      })
      .then((r) => {
        if (!controller.signal.aborted) {
          setAccess(r.data);
          setDepartment((previous) =>
            r.data.departments.includes(previous) ||
            (previous === 'ALL' && r.data.departments.length > 1)
              ? previous
              : r.data.departments.length > 1
                ? 'ALL'
                : r.data.departments[0],
          );
          setLoadError('');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(e));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!access || !department) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setItems([]);
    setMovements([]);
    const config = {
      params: { department, page },
      signal: controller.signal,
      timeout: 15000,
    };
    Promise.all([
      api.get('/inventory/summary', config),
      api.get<Category[]>('/inventory/categories', config),
      api.get<Item[]>('/inventory/items', config),
      api.get<Movement[]>('/inventory/transactions', config),
      api.get<CurrencySettings>('/inventory/currency-settings', config),
    ])
      .then(([sum, cats, stock, ledger, pricing]) => {
        if (!controller.signal.aborted) {
          setSummary(sum.data);
          setCategories(cats.data);
          setItems(stock.data);
          setMovements(ledger.data);
          setSettings(pricing.data);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [access, department, page, revision]);
  useEffect(()=>{
    if(searchParams.get('new')!=='item') {openingFromDashboard.current=false;return;}
    if(openingFromDashboard.current || !access?.canWrite || !department || loading || loadError)return;
    openingFromDashboard.current=true;
    const next=new URLSearchParams(searchParams);next.delete('new');setSearchParams(next,{replace:true});
    if(categories.length)open('ITEM');
    else {setMessage('Create your first category, then choose Add inventory item to enter stock.');open('CATEGORY');}
  },[searchParams,access,department,loading,loadError,categories,setSearchParams]);
  async function action(work: () => Promise<unknown>, success: string) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
      setMessage(success);
      setDialog(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  function open(kind: typeof dialog, item?: Item) {
    setEntryCurrency(hasRate ? currency : 'USD');
    setEntryRate(hasRate ? rate : undefined);
    setError('');
    setDialog(kind);
    setSelected(item || null);
    setDraft({
      ...emptyItem,
      department:
        department !== 'ALL' && department !== 'UNASSIGNED'
          ? department
          : access?.departments.find((d) => d !== 'UNASSIGNED') || '',
      categoryId: categories[0]?.id || '',
    });
    setMovement({
      issuedTo: '',
      quantity: kind === 'COUNT' ? item?.currentStock || '0' : '',
      reason: '',
      reference: '',
      department: access?.departments.find((d) => d !== 'UNASSIGNED') || '',
    });
    setCategory({ name: '', description: '' });
    setDepartmentName('');
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      if (dialog === 'DEPARTMENT') {
        const { data } = await api.post<{ code: string }>('/inventory/departments', { name: departmentName.trim() });
        setAccess(previous => previous ? { ...previous, departments: [...new Set([...previous.departments, data.code])] } : previous);
        setDepartment(data.code);
        setPage(1);
        setSearch('');
        setTab('ITEMS');
      } else if (dialog === 'CATEGORY')
        await api.post('/inventory/categories', category);
      else if (dialog === 'ITEM') {
        const data = {
          ...draft,
          currency: entryCurrency,
          expectedExchangeRate: entryCurrency === 'SLL' ? entryRate : undefined,
          currentStock: Number(draft.currentStock),
          minimumStock: Number(draft.minimumStock),
          reorderQuantity:
            draft.reorderQuantity === ''
              ? undefined
              : Number(draft.reorderQuantity),
          costPrice:
            draft.costPrice === '' ? undefined : Number(draft.costPrice),
          sellingPrice:
            draft.sellingPrice === '' ? undefined : Number(draft.sellingPrice),
        };
        await api.post('/inventory/items', data);
      } else if (selected) {
        if (dialog === 'ASSIGN')
          await api.patch(`/inventory/items/${selected.id}/department`, {
            department: movement.department,
          });
        else if (dialog === 'COUNT')
          await api.post(`/inventory/items/${selected.id}/stock-count`, {
            countedStock: Number(movement.quantity),
            reason: movement.reason,
            reference: movement.reference,
          });
        else
          await api.post(
            `/inventory/items/${selected.id}/stock-${dialog === 'IN' ? 'in' : 'out'}`,
            {
              quantity: Number(movement.quantity),
              notes: movement.reason,
              ...(dialog === 'OUT' ? {issuedTo:movement.issuedTo} : {}),
              reference: movement.reference,
            },
          );
      }
    }, dialog === 'DEPARTMENT' ? 'Department added. You can now add inventory items to its sheet.' : 'Inventory record saved.');
  }
  async function download() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.get('/inventory/export', {
        params: { department },
        responseType: 'blob',
        timeout: 60000,
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${department.toLowerCase()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(
        'Excel workbook downloaded. Export includes the selected department sheets and stock movement history; on-screen search does not limit the export.',
      );
    } catch (e) {
      if (isAxiosError(e) && e.response?.data instanceof Blob) {
        try {
          const data = JSON.parse(await e.response.data.text());
          setError(data.message || 'Export failed.');
        } catch {
          setError('Export failed. Please retry.');
        }
      } else setError(errorMessage(e));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  const visible = items.filter(
    (i) =>
      (tab !== 'LOW' || Number(i.currentStock) <= Number(i.minimumStock)) &&
      `${i.name} ${i.sku || ''} ${i.category.name} ${i.supplierName || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Layout>
      <main className="p-5 text-sm text-slate-700">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Department inventory
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Department stock sheets, movements and Excel export · Leones and
              USD
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {access?.canCreateDepartment && (
              <button className={button} disabled={busy || loading || !!loadError} onClick={() => open('DEPARTMENT')}>Add department</button>
            )}
            {access?.canWrite && <>
              <button className={primary} disabled={busy || loading || !!loadError} onClick={()=>{
                if(categories.length)open('ITEM');
                else {setMessage('Create your first category, then choose Add inventory item to enter stock.');open('CATEGORY');}
              }}>Add inventory item</button>
              <button className={button} disabled={busy || loading || !!loadError} onClick={()=>open('CATEGORY')}>Add category</button>
            </>}
            <button
              className={button}
              disabled={busy}
              onClick={() => setRevision((n) => n + 1)}
            >
              Refresh inventory
            </button>
            <button
              className={primary}
              disabled={!access || loading || !!loadError || busy}
              onClick={() => void download()}
            >
              Export Excel workbook
            </button>
          </div>
        </header>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded border bg-white p-3">
          <label className="text-xs">
            Display currency
            <select
              aria-label="Inventory currency"
              className={field}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'SLL' | 'USD')}
            >
              <option value="SLL">Leones (SLL)</option>
              <option value="USD">US Dollars (USD)</option>
            </select>
          </label>
          <label className="text-xs">
            Exchange rate
            <select
              aria-label="Exchange rate mode"
              className={field}
              value={rateMode}
              disabled={loading || busy || !!loadError}
              onChange={(e) => {
                setRateMode(e.target.value);
                setRateDraft(settings?.exchangeRate || '');
              }}
            >
              <option value="SAVED">
                {hasRate ? `Saved: 1 USD = ${rate} Leones` : 'Not configured'}
              </option>
              {settings?.canEdit && (
                <option value="EDIT">Edit exchange rate manually</option>
              )}
            </select>
          </label>
          {rateMode === 'EDIT' && settings?.canEdit && (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  const response = await api.patch<CurrencySettings>(
                    '/inventory/currency-settings',
                    { exchangeRate: Number(rateDraft) },
                  );
                  setSettings(response.data);
                  setRateMode('SAVED');
                }, 'Shared inventory / POS exchange rate saved.');
              }}
            >
              <label className="text-xs">
                Leones per 1 USD
                <input
                  aria-label="Leones per USD"
                  className={field}
                  type="number"
                  required
                  min="0.0001"
                  max="99999999.9999"
                  step="0.0001"
                  value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value)}
                />
              </label>
              <button
                className={primary}
                disabled={busy || loading || !!loadError}
              >
                Save exchange rate
              </button>
            </form>
          )}
          <p className="w-full text-xs text-slate-500">
            Shared with POS. USD is the stored base price; Leones are converted
            at the saved rate. Changing the rate does not rewrite existing USD
            prices or past POS payments.
          </p>
          {!hasRate && !loading && (
            <p className="text-xs text-amber-700">
              A manager must set the exchange rate before Leones prices can be
              entered or displayed. USD remains available.
            </p>
          )}
        </div>
        {loadError && (
          <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">
            {loadError}
          </p>
        )}
        {error && !dialog && (
          <p role="alert" className="mb-4 text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mb-4 text-indigo-700">
            {message}
          </p>
        )}
        {access && (
          <>
            <div
              role="tablist"
              aria-label="Inventory department sheets"
              className="flex flex-wrap gap-1 border-b border-slate-200"
            >
              {(access.departments.length > 1
                ? ['ALL', ...access.departments]
                : access.departments
              ).map((d) => (
                <button
                  role="tab"
                  aria-selected={department === d}
                  key={d}
                  disabled={busy}
                  onClick={() => {
                    setDepartment(d);
                    setPage(1);
                    setSearch('');
                  }}
                  className={`border-b-2 px-4 py-3 text-xs ${department === d ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700' : 'border-transparent hover:bg-slate-50'}`}
                >
                  {label(d)}
                </button>
              ))}
            </div>
            {!access.canWrite && (
              <p className="my-3 text-xs text-slate-500">
                Read-only access: you can view and export every permitted
                department sheet.
              </p>
            )}
            {department === 'UNASSIGNED' && (
              <p className="my-3 rounded bg-amber-50 p-3 text-xs">
                Existing stock has been preserved here. Use Assign department to
                classify it without changing quantities. Classification is
                recorded in the movement history.
              </p>
            )}
            {!loading && !loadError && (
              <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Items', summary.totalItems],
                  ['Low stock', summary.lowStock],
                  ['Out of stock', summary.outOfStock],
                  ['Stock value', money(summary.totalValue)],
                ].map(([name, value]) => (
                  <div key={name} className="rounded border bg-white p-3">
                    <p className="text-xs text-slate-500">{name}</p>
                    <p className="mt-1 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            )}
            {access.canWrite && !loading && !loadError && <section aria-label="Stock entry" className="my-4 rounded border bg-white p-4"><h2 className="font-semibold">Stock entry</h2><p className="my-2 text-xs text-slate-500">Add a category and inventory item first. Then record stock received, issued to a named recipient, or a physical count. Balances update automatically.</p><div className="flex flex-wrap items-end gap-3"><label className="text-xs">Inventory item<select aria-label="Stock entry item" className={field} value={entryItemId} onChange={e=>setEntryItemId(e.target.value)}><option value="">Select inventory item</option>{items.map(item=><option key={item.id} value={item.id}>{label(item.department)} · {item.name} ({item.currentStock} {item.unit})</option>)}</select></label><label className="text-xs">Stock method<select aria-label="Stock method" className={field} value={stockMethod} onChange={e=>setStockMethod(e.target.value as 'IN'|'OUT'|'COUNT')}><option value="IN">Stock received (in)</option><option value="OUT">Stock issued (out)</option><option value="COUNT">Physical stock count</option></select></label><button className={primary} disabled={busy || !items.some(i=>i.id===entryItemId)} onClick={()=>{const item=items.find(i=>i.id===entryItemId);if(item)open(stockMethod,item);}}>Record stock movement</button></div>{!items.length && <p className="mt-2 text-xs text-amber-700">No inventory items in this department yet. Use Add category / Add inventory item below to begin.</p>}</section>}
            <div className="my-4 flex flex-wrap items-center gap-2">
              {/* Values are calculated on the server from the scoped stock sheet. */}
              {[
                ['OVERVIEW', 'Department overview'],
                ['ITEMS', 'Stock sheet'],
                ['LOW', 'Low stock'],
                ['HISTORY', 'Movement history'],
              ].map(([value, name]) => (
                <button
                  key={value}
                  className={tab === value ? primary : button}
                  onClick={() => setTab(value)}
                >
                  {name}
                </button>
              ))}
              <input
                aria-label="Search inventory"
                placeholder="Search item, SKU, category or supplier"
                className={field + ' max-w-sm'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={tab === 'HISTORY' || tab === 'OVERVIEW'}
              />
            </div>
            {loading ? (
              <p className="p-8">Loading department inventory…</p>
            ) : (
              !loadError &&
              (tab === 'OVERVIEW' ? (
                <section aria-label="Department stock overview" className="overflow-auto rounded border bg-white">
                  <p className="p-3 text-xs text-slate-500">Current stock value = quantity × cost price. Missing costs are excluded from value totals. Quantities in different units are not added together.</p>
                  <table className="w-full border-collapse text-xs"><thead><tr>{['Department','Items','Low stock','Items without cost','Stock value USD','Stock value Leones'].map(h=><th className={cell} key={h}>{h}</th>)}</tr></thead><tbody>
                    {(summary.departments || []).map(d=><tr key={d.department}><td className={cell}>{label(d.department)}</td><td className={cell}>{d.totalItems}</td><td className={cell}>{d.lowStock}</td><td className={cell}>{d.unpricedItems}</td><td className={cell}>{money(d.totalValue,'USD')}</td><td className={cell}>{money(d.totalValue,'SLL')}</td></tr>)}
                  </tbody><tfoot><tr><th className={cell}>Total</th><td className={cell}>{summary.totalItems}</td><td className={cell}>{summary.lowStock}</td><td className={cell}>{(summary.departments || []).reduce((n,d)=>n+d.unpricedItems,0)}</td><td className={cell}>{money(summary.totalValue,'USD')}</td><td className={cell}>{money(summary.totalValue,'SLL')}</td></tr></tfoot></table>
                </section>
              ) : tab === 'HISTORY' ? (
                <>
                  <div className="max-h-[65vh] overflow-auto border">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr>
                          {[
                            'Date',
                            'Department',
                            'Item',
                            'Type',
                            'Quantity',
                            'Unit',
                            'Before',
                            'After',
                            'Reason / notes',
                            'Reference',
                            'Recorded by account ID',
                            'Recorded by name',
                            'Issued to / received by',
                          ].map((h) => (
                            <th key={h} className={cell}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((t) => (
                          <tr key={t.id}>
                            <td className={cell}>
                              {new Date(t.createdAt).toLocaleString()}
                            </td>
                            <td className={cell}>{label(t.item.department)}</td>
                            <td className={cell}>{t.item.name}</td>
                            <td className={cell}>{t.type}</td>
                            <td className={cell}>{Number(t.quantity)}</td>
                            <td className={cell}>{t.item.unit}</td>
                            <td className={cell}>{t.stockBefore ?? '—'}</td>
                            <td className={cell}>{t.stockAfter ?? '—'}</td>
                            <td className={cell}>{t.reason || t.notes}</td>
                            <td className={cell}>{t.reference}</td>
                            <td className={cell}>
                              {t.recordedBy || 'Not recorded'}
                            </td>
                            <td className={cell}>{t.recordedByName || 'Not recorded'}</td>
                            <td className={cell}>{t.issuedTo || 'Not recorded'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!movements.length && (
                    <p className="p-5">No movements on this page.</p>
                  )}
                  <div className="mt-3 flex gap-3">
                    <button
                      className={button}
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous movements
                    </button>
                    <span>Page {page} · 100 per page</span>
                    <button
                      className={button}
                      disabled={movements.length < 100}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next movements
                    </button>
                  </div>
                </>
              ) : (
                <div className="max-h-[65vh] overflow-auto rounded border">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr>
                        {[
                          '#',
                          'Department',
                          'Item / SKU',
                          'Category',
                          'Unit',
                          'Stock',
                          'Minimum',
                          'Reorder qty',
                          `Cost (${currency === 'SLL' ? 'Leones / USD' : 'USD / Leones'})`,
                          `Selling (${currency === 'SLL' ? 'Leones / USD' : 'USD / Leones'})`,
                          'Location',
                          'Supplier',
                          ...(access.canWrite ? ['Actions'] : []),
                        ].map((h) => (
                          <th key={h} className={cell}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item, i) => (
                        <tr
                          key={item.id}
                          className={
                            Number(item.currentStock) <=
                            Number(item.minimumStock)
                              ? 'bg-amber-50'
                              : i % 2
                                ? 'bg-slate-50'
                                : 'bg-white'
                          }
                        >
                          <td className={cell}>{i + 1}</td>
                          <td className={cell}>{label(item.department)}</td>
                          <td className={cell}>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-slate-400">{item.sku}</p>
                          </td>
                          <td className={cell}>{item.category.name}</td>
                          <td className={cell}>{item.unit}</td>
                          <td className={cell + ' font-semibold'}>
                            {Number(item.currentStock)}
                          </td>
                          <td className={cell}>{Number(item.minimumStock)}</td>
                          <td className={cell}>
                            {item.reorderQuantity ?? '—'}
                          </td>
                          <td className={cell}>
                            {money(item.costPrice)}
                            <p className="text-slate-400">
                              {money(
                                item.costPrice,
                                currency === 'SLL' ? 'USD' : 'SLL',
                              )}
                            </p>
                          </td>
                          <td className={cell}>
                            {money(item.sellingPrice)}
                            <p className="text-slate-400">
                              {money(
                                item.sellingPrice,
                                currency === 'SLL' ? 'USD' : 'SLL',
                              )}
                            </p>
                          </td>
                          <td className={cell}>{item.storageLocation}</td>
                          <td className={cell}>{item.supplierName}</td>
                          {access.canWrite && (
                            <td className={cell}>
                              <div className="flex gap-1">
                                {(['IN', 'OUT', 'COUNT'] as const).map(
                                  (kind) => (
                                    <button
                                      key={kind}
                                      className={button}
                                      disabled={busy}
                                      onClick={() => open(kind, item)}
                                    >
                                      {kind === 'IN'
                                        ? 'Stock in'
                                        : kind === 'OUT'
                                          ? 'Stock out'
                                          : 'Count'}
                                    </button>
                                  ),
                                )}
                                {access.canAssign &&
                                  item.department === 'UNASSIGNED' && (
                                    <button
                                      className={button}
                                      onClick={() => open('ASSIGN', item)}
                                    >
                                      Assign department
                                    </button>
                                  )}
                                {access.canAssign &&
                                  Number(item.currentStock) === 0 && (
                                    <button
                                      className={button}
                                      disabled={busy}
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            'Archive this zero-stock item? Movement history will be retained.',
                                          )
                                        )
                                          void action(
                                            () =>
                                              api.delete(
                                                `/inventory/items/${item.id}`,
                                              ),
                                            'Item archived; history retained.',
                                          );
                                      }}
                                    >
                                      Archive
                                    </button>
                                  )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <p className="p-8 text-center text-slate-500">
                      No items in this sheet.{' '}
                      {access.canWrite
                        ? categories.length
                          ? 'Add an inventory item to begin.'
                          : 'Add a category first.'
                        : ''}
                    </p>
                  )}
                </div>
              ))
            )}
          </>
        )}
        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Inventory record"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5"
            >
              <h2 className="mb-4 font-semibold">
                {dialog === 'DEPARTMENT' ? 'Add department' : dialog === 'ITEM'
                  ? 'Add inventory item'
                  : dialog === 'CATEGORY'
                    ? 'Add category'
                    : dialog === 'ASSIGN'
                      ? 'Assign department'
                      : dialog === 'COUNT'
                        ? 'Record physical stock count'
                        : dialog === 'IN'
                          ? 'Stock in'
                          : 'Stock out'}
                {selected && ` — ${selected.name}`}
              </h2>
              {error && (
                <p role="alert" className="mb-3 text-red-700">
                  {error}
                </p>
              )}
              <form onSubmit={save} className="space-y-3">
                {dialog === 'ITEM' && (
                  <div className="rounded bg-slate-50 p-3">
                    <label className="text-xs">
                      Price entry currency
                      <select
                        aria-label="Price entry currency"
                        className={field}
                        value={entryCurrency}
                        onChange={(e) => {
                          setEntryCurrency(e.target.value as 'SLL' | 'USD');
                          setDraft((v) => ({
                            ...v,
                            costPrice: '',
                            sellingPrice: '',
                          }));
                        }}
                      >
                        <option value="SLL" disabled={!entryRate}>
                          Leones (SLL)
                        </option>
                        <option value="USD">US Dollars (USD)</option>
                      </select>
                    </label>
                    <p className="mt-2 text-xs">
                      {entryRate
                        ? `1 USD = ${entryRate} Leones. Converted USD prices are rounded to 2 decimals.`
                        : 'Exchange rate not configured. Select USD to enter prices.'}{' '}
                      Changing currency clears the price fields to prevent
                      relabelling an amount.
                    </p>
                  </div>
                )}
                {dialog === 'DEPARTMENT' ? (
                  <>
                    <label className="block text-xs">
                      Department name
                      <input aria-label="Department name" autoFocus required minLength={2} maxLength={31} className={field} value={departmentName} onChange={e => setDepartmentName(e.target.value)} placeholder="For example: Spa or Laundry Store" />
                    </label>
                    <p className="text-xs text-slate-500">Use 2–31 letters, numbers, spaces or hyphens, starting with a letter. This creates an inventory sheet for this hotel only; staff roles and permissions stay unchanged.</p>
                  </>
                ) : dialog === 'CATEGORY' ? (
                  <>
                    <label className="block text-xs">
                      Category name
                      <input
                        aria-label="Category name"
                        autoFocus
                        required
                        maxLength={100}
                        className={field}
                        value={category.name}
                        onChange={(e) =>
                          setCategory((v) => ({ ...v, name: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Description
                      <input
                        maxLength={500}
                        className={field}
                        value={category.description}
                        onChange={(e) =>
                          setCategory((v) => ({
                            ...v,
                            description: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                ) : dialog === 'ITEM' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      Department
                      <select
                        aria-label="Item department"
                        className={field}
                        required
                        value={draft.department}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            department: e.target.value,
                          }))
                        }
                      >
                        {access?.departments
                          .filter((d) => d !== 'UNASSIGNED')
                          .map((d) => (
                            <option key={d} value={d}>
                              {label(d)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-xs">
                      Category
                      <select
                        className={field}
                        required
                        value={draft.categoryId}
                        onChange={(e) =>
                          setDraft((v) => ({
                            ...v,
                            categoryId: e.target.value,
                          }))
                        }
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        'name',
                        'sku',
                        'unit',
                        'storageLocation',
                        'supplierName',
                        'description',
                        'currentStock',
                        'minimumStock',
                        'reorderQuantity',
                        'costPrice',
                        'sellingPrice',
                      ] as const
                    ).map((key) => {
                      const numeric = [
                        'currentStock',
                        'minimumStock',
                        'reorderQuantity',
                        'costPrice',
                        'sellingPrice',
                      ].includes(key);
                      return (
                        <label className="text-xs" key={key}>
                          {
                            {
                              name: 'Item name',
                              sku: 'SKU / code',
                              unit: 'Unit',
                              storageLocation: 'Storage location',
                              supplierName: 'Supplier',
                              description: 'Description',
                              currentStock: 'Opening stock',
                              minimumStock: 'Minimum stock',
                              reorderQuantity: 'Reorder quantity',
                              costPrice: `Cost price (${entryCurrency === 'SLL' ? 'Leones' : 'USD'})`,
                              sellingPrice: `Selling price (${entryCurrency === 'SLL' ? 'Leones' : 'USD'})`,
                            }[key]
                          }
                          <input
                            aria-label={key}
                            className={field}
                            type={numeric ? 'number' : 'text'}
                            min={numeric ? 0 : undefined}
                            max={numeric ? 99999999.99 : undefined}
                            step={numeric ? '0.01' : undefined}
                            maxLength={
                              key === 'description'
                                ? 500
                                : key === 'unit'
                                  ? 30
                                  : 100
                            }
                            required={[
                              'name',
                              'unit',
                              'currentStock',
                              'minimumStock',
                            ].includes(key)}
                            value={draft[key]}
                            onChange={(e) =>
                              setDraft((v) => ({ ...v, [key]: e.target.value }))
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : dialog === 'ASSIGN' ? (
                  <label className="block text-xs">
                    Department
                    <select
                      aria-label="Assign department"
                      className={field}
                      value={movement.department}
                      onChange={(e) =>
                        setMovement((v) => ({
                          ...v,
                          department: e.target.value,
                        }))
                      }
                    >
                      {access?.departments
                        .filter((d) => d !== 'UNASSIGNED')
                        .map((d) => (
                          <option key={d} value={d}>
                            {label(d)}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">
                      Current stock: {selected?.currentStock} {selected?.unit}.{' '}
                      {dialog === 'COUNT'
                        ? 'Enter the physical count, not the difference.'
                        : 'Record only actual stock movements.'}
                    </p>
                    <label className="block text-xs">
                      {dialog === 'COUNT' ? 'Counted stock' : 'Quantity'}
                      <input
                        aria-label="Stock quantity"
                        className={field}
                        type="number"
                        min={dialog === 'COUNT' ? 0 : 0.01}
                        max="99999999.99"
                        step="0.01"
                        required
                        value={movement.quantity}
                        onChange={(e) =>
                          setMovement((v) => ({
                            ...v,
                            quantity: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Reason / notes
                      <input
                        aria-label="Stock reason"
                        className={field}
                        required
                        minLength={3}
                        maxLength={1000}
                        value={movement.reason}
                        onChange={(e) =>
                          setMovement((v) => ({ ...v, reason: e.target.value }))
                        }
                      />
                    </label>
                    {dialog === 'OUT' && <label className="block text-xs">Issued to / received by<input aria-label="Stock recipient" className={field} required minLength={2} maxLength={150} value={movement.issuedTo} onChange={e=>setMovement(v=>({...v,issuedTo:e.target.value}))}/></label>}
                    <p className="text-xs text-slate-600">Calculated balance after this record: {movement.quantity !== '' && selected ? (dialog === 'COUNT' ? Number(movement.quantity) : Number(selected.currentStock) + (dialog === 'IN' ? 1 : -1) * Number(movement.quantity)).toLocaleString('en-US',{maximumFractionDigits:2}) : '—'} {selected?.unit}. The server checks the latest balance before saving.</p>
                    <label className="block text-xs">
                      Reference
                      <input
                        className={field}
                        maxLength={100}
                        value={movement.reference}
                        onChange={(e) =>
                          setMovement((v) => ({
                            ...v,
                            reference: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={button}
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={
                      busy ||
                      (dialog === 'ITEM' &&
                        entryCurrency === 'SLL' &&
                        !entryRate)
                    }
                    className={primary}
                  >
                    {busy ? 'Saving…' : 'Save inventory record'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </Layout>
  );
}
