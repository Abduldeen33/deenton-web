import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { useSearchParams } from 'react-router-dom';
import InvoicePrint from '../components/InvoicePrint';
import PaymentReceipt from '../components/PaymentReceipt';
import api from '../api/client';
import { can, canOperate } from '../store/permissions';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: any) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const input = 'rounded border border-slate-300 bg-white px-3 py-2 text-sm';
const button =
  'rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40';
const emptyEntry = {
  description: '',
  amount: '',
  currency: 'SLL',
  exchangeRate: '',
  method: 'CASH',
  reference: '',
};
function exportCsv(rows: any[]) {
  const cell = (v: any) =>
    '"' +
    String(v ?? '')
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const data = [
    [
      'Receipt',
      'Date (UTC)',
      'Customer',
      'Source',
      'Staff',
      'Currency',
      'Amount',
      'USD value',
      'Recorded rate',
      'Reference',
    ],
    ...rows.map((r) => [
      r.receiptNumber,
      r.date,
      r.customer,
      r.source,
      r.staffName,
      r.currency,
      r.amount,
      r.amountUsd,
      r.exchangeRate,
      r.reference,
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ['\ufeff' + data.map((row) => row.map(cell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    ),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'front-desk-cash.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FrontDeskFinance() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'corporate' ? 'corporate' : 'cash');
  const [invoiceId, setInvoiceId] = useState(''), [printInvoice, setPrintInvoice] = useState('');
  const [from, setFrom] = useState(today),
    [to, setTo] = useState(today);
  const [summary, setSummary] = useState<any>(null),
    [accounts, setAccounts] = useState<any[]>([]),
    [account, setAccount] = useState<any>(null);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState('');
  const [staff, setStaff] = useState(''),
    [query, setQuery] = useState('');
  const [newAccount, setNewAccount] = useState(false),
    [createForm, setCreateForm] = useState({
      name: '',
      type: 'COMPANY',
      email: '',
      phone: '',
    });
  const [kind, setKind] = useState('PAYMENT'),
    [showEntry, setShowEntry] = useState(false),
    [entry, setEntry] = useState(emptyEntry);
  const [savedRate, setSavedRate] = useState('');
  const requestKey = useRef(crypto.randomUUID()),
    submitted = useRef(false);
  const fail = (e: any) =>
    setError(
      String(
        e.response?.data?.message ||
          'Unable to load or save data. Please retry.',
      ),
    );
  const loadSummary = async () => {
    setError('');
    setSummary(null);
    try {
      setSummary(
        (await api.get('/billing/cash-summary', { params: { from, to } })).data,
      );
    } catch (e) {
      fail(e);
    }
  };
  const loadAccounts = async () => {
    setAccounts((await api.get('/billing/house-accounts')).data);
  };
  const openAccount = async (id: string) => {
    setError('');
    setAccount(null);
    setShowEntry(false);
    try {
      setAccount((await api.get(`/billing/house-accounts/${id}`)).data);
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => {
    if (!can('view_billing')) return;
    void loadSummary();
    void loadAccounts().catch(fail);
    api
      .get('/billing/settings')
      .then((r) =>
        setSavedRate(
          r.data.posExchangeRate ? String(r.data.posExchangeRate) : '',
        ),
      )
      .catch(fail);
  }, []);
  const requestedAccount = params.get('account');
  useEffect(() => { if (requestedAccount) { setTab('corporate'); void openAccount(requestedAccount); } }, [requestedAccount]);
  const startEntry = (nextKind: string) => {
    setInvoiceId('');
    requestKey.current = crypto.randomUUID();
    setKind(nextKind);
    setEntry({ ...emptyEntry, exchangeRate: savedRate });
    setShowEntry(true);
    setError('');
    setNotice('');
  };
  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted.current || !account) return;
    submitted.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post(
        `/billing/house-accounts/${account.id}/${kind === 'PAYMENT' ? 'payments' : 'charges'}`,
        {
          ...entry,
          invoiceId: kind === 'PAYMENT' && invoiceId ? invoiceId : undefined,
          amount: Number(entry.amount),
          exchangeRate: entry.exchangeRate
            ? Number(entry.exchangeRate)
            : undefined,
          idempotencyKey: requestKey.current,
        },
      );
      setShowEntry(false);
      setNotice(
        kind === 'PAYMENT' ? 'Payment recorded.' : 'Credit charge posted.',
      );
      if (kind === 'PAYMENT') setReceipt(result.data.id);
      else if (result.data.invoiceNumber) setPrintInvoice(result.data.id);
      await Promise.all([
        openAccount(account.id),
        loadAccounts(),
        loadSummary(),
      ]);
    } catch (e) {
      fail(e);
    } finally {
      submitted.current = false;
      setBusy(false);
    }
  };
  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/billing/house-accounts', {
        ...createForm,
        email: createForm.email || undefined,
      });
      setNewAccount(false);
      setCreateForm({ name: '', type: 'COMPANY', email: '', phone: '' });
      await loadAccounts();
      await openAccount(result.data.id);
    } catch (e) {
      fail(e);
    } finally {
      submitted.current = false;
      setBusy(false);
    }
  };
  if (!can('view_billing'))
    return (
      <Layout>
        <p>Access restricted.</p>
      </Layout>
    );
  const rows = (summary?.rows || []).filter(
    (r: any) => !staff || r.staffId === staff,
  );
  return (
    <Layout>
      <section className="p-4 text-sm text-slate-800 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              Front Desk Cash & House Accounts
            </h1>
            <p className="text-xs text-slate-500">
              Guest payments, company credit and customer settlement
            </p>
          </div>
          <a href="/billing" className={button}>
            Guest folios / Record payment
          </a>
        </header>
        <nav className="flex gap-2 border-b pb-3">
          <button
            onClick={() => setTab('cash')}
            className={button}
            aria-pressed={tab === 'cash'}
          >
            Cash summary
          </button>
          <button
            onClick={() => setTab('accounts')}
            className={button}
            aria-pressed={tab === 'accounts'}
          >
            House accounts
          </button>
          <button className={button} aria-pressed={tab === 'corporate'} onClick={() => { setTab('corporate'); setAccount(null); setShowEntry(false); }}>Corporate / Conference</button>
          <a href="/guests" className={button}>
            Guest history
          </a>
        </nav>
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-green-700">
            {notice}
          </p>
        )}
        {tab === 'cash' ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStaff('');
                void loadSummary();
              }}
              className="flex gap-3 items-end flex-wrap"
            >
              <label>
                From (UTC)
                <input
                  aria-label="From date"
                  type="date"
                  required
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setSummary(null);
                  }}
                  className={input + ' block'}
                />
              </label>
              <label>
                To (UTC)
                <input
                  aria-label="To date"
                  type="date"
                  required
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setSummary(null);
                  }}
                  className={input + ' block'}
                />
              </label>
              <button className={button}>Refresh</button>
              <select
                aria-label="Cashier"
                className={input}
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
              >
                <option value="">All cashiers</option>
                {Array.from(
                  new Map<string, string>(
                    (summary?.rows || [])
                      .filter((r: any) => r.staffId)
                      .map((r: any) => [r.staffId, r.staffName]),
                  ).entries(),
                ).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!summary}
                className={button}
                onClick={() => exportCsv(rows)}
              >
                Export CSV
              </button>
            </form>
            <p className="text-xs text-slate-500">
              Cash received at Front Desk only; excludes POS sales, voids,
              card/mobile money and unpaid credit charges. Date boundaries are
              UTC. Totals below follow the cashier filter.
            </p>
            {summary && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [
                    'Leones cash',
                    rows
                      .filter((r: any) => r.currency === 'SLL')
                      .reduce((n: number, r: any) => n + Number(r.amount), 0),
                  ],
                  [
                    'USD cash',
                    rows
                      .filter((r: any) => r.currency === 'USD')
                      .reduce((n: number, r: any) => n + Number(r.amount), 0),
                  ],
                  [
                    'Combined USD equivalent',
                    rows.reduce(
                      (n: number, r: any) => n + Number(r.amountUsd),
                      0,
                    ),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded border bg-white p-4">
                    <p>{label}</p>
                    <strong className="text-lg">{fmt(value)}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="overflow-auto rounded border bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs">
                  <tr>
                    {[
                      'Receipt',
                      'Date',
                      'Customer / source',
                      'Staff',
                      'Cash received',
                      'USD value',
                      'Reference',
                      '',
                    ].map((h, i) => (
                      <th className="p-3" key={i}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{r.receiptNumber}</td>
                      <td className="p-3">
                        {new Date(r.date).toLocaleString()}
                      </td>
                      <td className="p-3">
                        {r.customer}
                        <p className="text-xs text-slate-500">{r.source}</p>
                      </td>
                      <td className="p-3">{r.staffName}</td>
                      <td className="p-3">
                        {r.currency} {fmt(r.amount)}
                      </td>
                      <td className="p-3">{fmt(r.amountUsd)}</td>
                      <td className="p-3">{r.reference || '—'}</td>
                      <td className="p-3">
                        <button
                          className={button}
                          onClick={() => setReceipt(r.id)}
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {summary && !rows.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-slate-500"
                      >
                        No cash payments in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Company/customer credit ledger. Charges are settled later; they do
              not transfer or settle a guest folio automatically. Balances are
              maintained in USD using the rate recorded for each entry.
            </p>
            <div className="flex gap-3">
              <input
                className={input}
                aria-label="Find house account"
                placeholder="Find company or customer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {canOperate() && (
                <button
                  className={button}
                  onClick={() => setNewAccount(!newAccount)}
                >
                  New house account
                </button>
              )}
            </div>
            {newAccount && canOperate() && (
              <form
                onSubmit={saveAccount}
                className="flex gap-3 flex-wrap rounded border bg-white p-4"
              >
                <input
                  required
                  maxLength={160}
                  aria-label="Account name"
                  placeholder="Account name"
                  className={input}
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                />
                <select
                  aria-label="Account type"
                  className={input}
                  value={createForm.type}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, type: e.target.value })
                  }
                >
                  <option>COMPANY</option>
                  <option>CONFERENCE</option>
                  <option>CUSTOMER</option>
                </select>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  aria-label="Account email"
                  className={input}
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                />
                <input
                  placeholder="Phone (optional)"
                  aria-label="Account phone"
                  className={input}
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                />
                <button disabled={busy} className={button}>
                  Create account
                </button>
              </form>
            )}
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="rounded border bg-white">
                {accounts
                  .filter(a => tab !== 'corporate' || ['COMPANY', 'CONFERENCE'].includes(a.type))
                  .filter((a) =>
                    a.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => void openAccount(a.id)}
                      className={
                        'block w-full border-b p-3 text-left ' +
                        (account?.id === a.id ? 'bg-indigo-50' : '')
                      }
                    >
                      <strong>{a.name}</strong>
                      <p className="text-xs">
                        {a.type} · USD {fmt(a.balanceUsd)} outstanding
                      </p>
                    </button>
                  ))}
                {!accounts.length && (
                  <p className="p-4">No house accounts yet.</p>
                )}
              </div>
              <div className="rounded border bg-white p-4">
                {!account ? (
                  <p>Select an account to view its statement.</p>
                ) : (
                  <>
                    <h2 className="font-semibold">{account.name}</h2>
                    <p>
                      {account.email} {account.phone}
                    </p>
                    <p className="my-3">
                      Outstanding: USD {fmt(account.balanceUsd)}
                      {savedRate && (
                        <>
                          {' '}
                          · Leones{' '}
                          {fmt(
                            Number(account.balanceUsd) * Number(savedRate),
                          )}{' '}
                          at current rate (indicative)
                        </>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {canOperate() && (
                        <button
                          className={button}
                          onClick={() => startEntry('CHARGE')}
                        >
                          {['COMPANY', 'CONFERENCE'].includes(account.type) ? 'Create invoice' : 'Post credit charge'}
                        </button>
                      )}
                      {can('record_payments') && (
                        <button
                          className={button}
                          disabled={Number(account.balanceUsd) <= 0}
                          onClick={() => startEntry('PAYMENT')}
                        >
                          Record settlement
                        </button>
                      )}
                    </div>
                    {showEntry && (
                      <form
                        onSubmit={saveEntry}
                        className="my-4 space-y-3 rounded border p-3"
                      >
                        <h3>
                          {kind === 'PAYMENT'
                            ? 'Record payment received'
                            : 'Post charge to credit account'}
                        </h3>
                        <fieldset
                          disabled={busy}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          {kind === 'PAYMENT' && <label>Invoice to settle
                            <select aria-label="Invoice to settle" className={input + ' block w-full'} value={invoiceId} onChange={e => setInvoiceId(e.target.value)}>
                              <option value="">Legacy / non-invoice balance</option>
                              {account.entries.filter((e: any) => e.invoiceNumber).map((invoice: any) => {
                                const balance = Number(invoice.amountUsd) - account.entries.filter((p: any) => p.invoiceId === invoice.id).reduce((sum: number, p: any) => sum + Number(p.amountUsd), 0);
                                return <option key={invoice.id} value={invoice.id} disabled={balance <= 0}>{invoice.invoiceNumber} · USD {fmt(balance)} outstanding</option>;
                              })}
                            </select>
                          </label>}
                          <label>
                            Description
                            <input
                              required
                              maxLength={500}
                              className={input + ' block w-full'}
                              value={entry.description}
                              onChange={(e) =>
                                setEntry({
                                  ...entry,
                                  description: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Currency
                            <select
                              className={input + ' block w-full'}
                              value={entry.currency}
                              onChange={(e) =>
                                setEntry({ ...entry, currency: e.target.value })
                              }
                            >
                              <option value="SLL">Leones (SLL)</option>
                              <option value="USD">USD</option>
                            </select>
                          </label>
                          <label>
                            Amount
                            <input
                              required
                              type="number"
                              min="0.01"
                              step="0.01"
                              max="99999999.99"
                              className={input + ' block w-full'}
                              value={entry.amount}
                              onChange={(e) =>
                                setEntry({ ...entry, amount: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Leones per 1 USD (editable)
                            <input
                              list="front-desk-rates"
                              required={entry.currency === 'SLL'}
                              type="number"
                              min="0.0001"
                              step="0.0001"
                              className={input + ' block w-full'}
                              value={entry.exchangeRate}
                              onChange={(e) =>
                                setEntry({
                                  ...entry,
                                  exchangeRate: e.target.value,
                                })
                              }
                            />
                            <datalist id="front-desk-rates">
                              {savedRate && (
                                <option value={savedRate}>
                                  Hotel saved rate
                                </option>
                              )}
                            </datalist>
                          </label>
                          {kind === 'PAYMENT' && (
                            <label>
                              Payment method
                              <select
                                className={input + ' block w-full'}
                                value={entry.method}
                                onChange={(e) =>
                                  setEntry({ ...entry, method: e.target.value })
                                }
                              >
                                {[
                                  'CASH',
                                  'CARD',
                                  'BANK_TRANSFER',
                                  'ORANGE_MONEY',
                                  'AFRIMONEY',
                                  'MOBILE_MONEY',
                                ].map((m) => (
                                  <option key={m}>{m}</option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label>
                            Reference
                            <input
                              maxLength={200}
                              className={input + ' block w-full'}
                              value={entry.reference}
                              onChange={(e) =>
                                setEntry({
                                  ...entry,
                                  reference: e.target.value,
                                })
                              }
                            />
                          </label>
                        </fieldset>
                        <p>
                          USD value:{' '}
                          {fmt(
                            entry.currency === 'SLL'
                              ? Number(entry.amount) /
                                  (Number(entry.exchangeRate) || 1)
                              : entry.amount,
                          )}
                        </p>
                        <button className={button} disabled={busy}>
                          {busy ? 'Saving…' : 'Save entry'}
                        </button>{' '}
                        <button
                          type="button"
                          disabled={busy}
                          className={button}
                          onClick={() => setShowEntry(false)}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                    <div className="overflow-auto mt-4">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs">
                          <tr>
                            {[
                              'Date',
                              'Entry / description',
                              'Original amount',
                              'USD value',
                              'Staff',
                              'Receipt',
                            ].map((h) => (
                              <th key={h} className="p-2">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {account.entries.map((e: any) => (
                            <tr key={e.id} className="border-t">
                              <td className="p-2">
                                {new Date(e.createdAt).toLocaleString()}
                              </td>
                              <td className="p-2">
                                {e.kind}
                                <p>{e.description}</p>
                                {e.invoiceId && <p className="text-xs">Invoice: {account.entries.find((invoice: any) => invoice.id === e.invoiceId)?.invoiceNumber || e.invoiceId}</p>}
                                <p className="text-xs">{e.reference}</p>
                              </td>
                              <td className="p-2">
                                {e.currency} {fmt(e.amount)}
                              </td>
                              <td className="p-2">
                                {e.kind === 'PAYMENT' ? '−' : '+'}
                                {fmt(e.amountUsd)}
                              </td>
                              <td className="p-2">{e.staffName}</td>
                              <td className="p-2">
                                {e.invoiceNumber && <button className={button} onClick={() => setPrintInvoice(e.id)}>View / print {e.invoiceNumber}</button>}
                                {e.receiptNumber && (
                                  <button
                                    className={button}
                                    onClick={() => setReceipt(e.id)}
                                  >
                                    {e.receiptNumber}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {receipt && (
        <PaymentReceipt id={receipt} onClose={() => setReceipt('')} />
      )}
      {printInvoice && <InvoicePrint id={printInvoice} onClose={() => setPrintInvoice('')}/>}
    </Layout>
  );
}
