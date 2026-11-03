import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import FinanceShell from '../components/FinanceShell';
import { canReviewFinance } from '../components/finance-access';
import {
  cents,
  rateUnits,
  convertCents,
  money as formatMoney,
  decimal,
} from '../components/finance-money';
import PaymentReceipt from '../components/PaymentReceipt';
import GuestSettlements from '../components/GuestSettlements';
import CorporateInvoices from '../components/CorporateInvoices';
import PaymentRegister from '../components/PaymentRegister';
import FinanceReconciliation from '../components/FinanceReconciliation';
import '../components/finance.css';
import api from '../api/client';
import { can } from '../store/permissions';

type CashRow = {
  id: string;
  date: string;
  customer: string;
  receiptNumber: string;
  source: string;
  staffName: string;
  amountUsd: string | number;
};
type Expense = {
  id: string;
  expenseDate: string;
  description: string;
  category: string;
  paidTo?: string;
  amount: string | number;
  staffName?: string;
};
type House = { id: string; name: string; balanceUsd: string | number };
type Summary = {
  cash: { rows: CashRow[]; totalUsd: number | string };
  expenses: Expense[];
  balances: string | number;
  houses: House[];
  rate: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const amount = cents;
const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const cell = (value: unknown) =>
  '"' +
  String(value ?? '')
    .replace(/^[=+@\-\t\r]/, "'$&")
    .replaceAll('"', '""') +
  '"';

export default function Finance() {
  const canReview = canReviewFinance();
  const [params, setParams] = useSearchParams();
  const change = (values: Record<string, string>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(values).forEach(([key, value]) => next.set(key, value));
        return next;
      },
      { replace: true },
    );
  const from = params.get('from') ?? today().slice(0, 8) + '01',
    to = params.get('to') ?? today();
  const currency = params.get('currency') === 'USD' ? 'USD' : 'SLL';
  const tabs = [
    'overview',
    'activity',
    'guests',
    'invoices',
    'payments',
    ...(canReview ? ['reconciliation'] : []),
  ];
  const requestedTab = params.get('tab') || 'overview',
    tab = tabs.includes(requestedTab) ? requestedTab : 'overview';
  const search = params.get('q') || '',
    setSearch = (q: string) => change({ q });
  const setFrom = (from: string) => change({ from }),
    setTo = (to: string) => change({ to }),
    setTab = (tab: string) => change({ tab }),
    setCurrency = (currency: string) => change({ currency });
  const [receipt, setReceipt] = useState(''),
    [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: Summary;
    error?: string;
  }>({ key: '' });
  const key = from + '|' + to + '|' + revision,
    needsSummary = tab === 'overview' || tab === 'activity';
  const span = Date.parse(to) - Date.parse(from);
  const dateError =
    !validDate(from) || !validDate(to) || span < 0 || span > 365 * 86400000
      ? 'Choose a valid date range of up to 366 days.'
      : '';
  const data = !dateError && result.key === key ? result.data : null;
  const error = dateError || (result.key === key ? result.error : '') || '';
  const loading = needsSummary && !dateError && result.key !== key;
  useEffect(() => {
    if (dateError || !needsSummary) return;
    const controller = new AbortController(),
      config = { signal: controller.signal };
    Promise.all([
      api.get('/billing/cash-summary', { ...config, params: { from, to } }),
      api.get('/expenses', {
        ...config,
        params: { from: from + 'T00:00:00.000Z', to: to + 'T23:59:59.999Z' },
      }),
      api.get('/billing/outstanding', config),
      api.get('/billing/house-accounts', config),
      api.get('/billing/settings', config),
    ])
      .then(([cash, exp, outstanding, houses, settings]) => {
        if (controller.signal.aborted) return;
        if (
          !Array.isArray(cash.data?.rows) ||
          !Array.isArray(exp.data?.expenses) ||
          !Array.isArray(houses.data)
        )
          throw new Error(
            'Finance data is incomplete. Refresh or contact your administrator.',
          );
        cents(outstanding.data.total);
        cents(cash.data.totalUsd);
        cash.data.rows.forEach((r: CashRow) => cents(r.amountUsd));
        exp.data.expenses.forEach((r: Expense) => cents(r.amount));
        houses.data.forEach((r: House) => cents(r.balanceUsd));
        const rate = String(settings.data.posExchangeRate || '0');
        rateUnits(rate);
        setResult({
          key,
          data: {
            cash: cash.data,
            expenses: exp.data.expenses,
            balances: outstanding.data.total,
            houses: houses.data,
            rate,
          },
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error: String(
              err.response?.data?.message ||
                err.message ||
                'Unable to load finance data.',
            ),
          });
      });
    return () => controller.abort();
  }, [from, to, key, dateError, needsSummary]);
  const rate = data ? rateUnits(data.rate) : 0n;
  const displayCurrency = currency === 'SLL' && rate > 0n ? 'SLL' : 'USD';
  const multiplier = displayCurrency === 'SLL' ? rate : 10000n;
  const money = (value: bigint) =>
    formatMoney(convertCents(value, multiplier), displayCurrency);
  const expenseTotal =
    data?.expenses.reduce((n, e) => n + amount(e.amount), 0n) || 0n;
  const houseTotal =
    data?.houses.reduce(
      (n, h) => n + (amount(h.balanceUsd) > 0n ? amount(h.balanceUsd) : 0n),
      0n,
    ) || 0n;
  const categories = useMemo(() => {
    const totals: Record<string, bigint> = {};
    for (const e of data?.expenses || [])
      totals[e.category] = (totals[e.category] || 0n) + amount(e.amount);
    return Object.entries(totals).sort((a, b) =>
      a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1,
    );
  }, [data]);
  const activity = useMemo(
    () =>
      [
        ...(data?.cash.rows || []).map((r) => ({
          id: 'cash-' + r.id,
          date: r.date,
          type: 'Cash received',
          description: r.customer,
          reference: r.receiptNumber,
          staff: r.staffName,
          usd: amount(r.amountUsd),
        })),
        ...(data?.expenses || []).map((e) => ({
          id: 'expense-' + e.id,
          date: e.expenseDate,
          type: 'Expense',
          description: e.description,
          reference: e.paidTo || e.category,
          staff: e.staffName || '',
          usd: -amount(e.amount),
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [data],
  );
  const filtered = activity.filter((r) =>
    `${r.description} ${r.reference} ${r.type} ${r.staff}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const trend = useMemo(() => {
    const days = new Map<
      string,
      { date: string; cash: bigint; expenses: bigint }
    >();
    if (!data) return [];
    for (
      let date = new Date(from + 'T00:00:00Z');
      date <= new Date(to + 'T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      const key = date.toISOString().slice(0, 10);
      days.set(key, { date: key, cash: 0n, expenses: 0n });
    }
    for (const row of data.cash.rows) {
      const point = days.get(row.date.slice(0, 10));
      if (point) point.cash += amount(row.amountUsd);
    }
    for (const row of data.expenses) {
      const point = days.get(row.expenseDate.slice(0, 10));
      if (point) point.expenses += amount(row.amount);
    }
    return [...days.values()].map((d) => ({
      date: d.date,
      cashExact: decimal(convertCents(d.cash, multiplier)),
      expensesExact: decimal(convertCents(d.expenses, multiplier)),
      cash: Number(convertCents(d.cash, multiplier)) / 100,
      expenses: Number(convertCents(d.expenses, multiplier)) / 100,
    })); // Numbers here are chart coordinates only.
  }, [data, from, to, multiplier]);
  function exportCsv() {
    const rows = [
      [
        'Date (UTC)',
        'Type',
        'Description',
        'Reference',
        'Staff',
        'Amount USD',
        `Display amount ${displayCurrency}`,
        'Display Leones/USD rate',
      ],
      ...filtered.map((r) => [
        r.date,
        r.type,
        r.description,
        r.reference,
        r.staff,
        decimal(r.usd),
        decimal(convertCents(r.usd, multiplier)),
        data?.rate || 'Not configured',
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-activity-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const controls =
    needsSummary || tab === 'reconciliation' ? (
      <div className="finance-filters">
        <span className="fw-period-label">Reporting period</span>
        <label>
          From (UTC)
          <input
            type="date"
            aria-label="Finance from date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To (UTC)
          <input
            type="date"
            aria-label="Finance to date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {needsSummary && (
          <label>
            Display currency
            <select
              aria-label="Finance currency"
              value={displayCurrency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="SLL" disabled={rate <= 0n}>
                Leones
              </option>
            </select>
          </label>
        )}
        <button
          onClick={() =>
            change({ from: today().slice(0, 8) + '01', to: today() })
          }
        >
          This month
        </button>
        {needsSummary && (
          <button disabled={loading} onClick={() => setRevision((v) => v + 1)}>
            Refresh finance
          </button>
        )}
      </div>
    ) : (
      <p className="finance-muted">
        Use the filters in this view. Original transaction currencies and rates
        are preserved.
      </p>
    );
  const labels: Record<string, string> = {
    overview: 'Business overview',
    activity: 'Transaction activity',
    guests: 'Guest receivables',
    invoices: 'Invoices',
    payments: 'Payments received',
    reconciliation: 'Reconciliation review',
  };
  return (
    <FinanceShell
      controls={controls}
      notices={
        error
          ? [error]
          : data && rate <= 0n
            ? ['No saved exchange rate; overview uses USD.']
            : []
      }
    >
      <div className="finance-page">
        {receipt && (
          <PaymentReceipt id={receipt} onClose={() => setReceipt('')} />
        )}
        <div className="finance-heading">
          <div>
            <p className="fw-eyebrow">ANZAK CLOUD / FINANCE</p>
            <h1>
              {tab === 'overview' ? 'Your business at a glance' : labels[tab]}
            </h1>
            <p className="finance-muted">
              {tab === 'overview'
                ? 'Cash collections, spending and balances. One clear view.'
                : 'Existing hotel records, scoped to your authorized property.'}
            </p>
          </div>
          <div className="finance-actions">
            {needsSummary && (
              <button disabled={loading || !data} onClick={exportCsv}>
                Export activity CSV
              </button>
            )}
            {can('manage_expenses') && (
              <Link
                className="finance-action finance-primary"
                to="/expenses?new=1"
              >
                Record an expense
              </Link>
            )}
            {can('view_inventory') && (
              <Link className="finance-action" to="/inventory?new=item">
                Add inventory
              </Link>
            )}
          </div>
        </div>
        <div className="finance-tabs" role="tablist" aria-label="Finance views">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {labels[t]}
            </button>
          ))}
        </div>
        {tab === 'guests' && <GuestSettlements revision={revision} />}
        {tab === 'invoices' && <CorporateInvoices />}
        {tab === 'payments' && <PaymentRegister />}
        {needsSummary && error && (
          <div role="alert" className="finance-error">
            {error}{' '}
            <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
          </div>
        )}
        {needsSummary && loading && (
          <p role="status" className="finance-empty">
            Loading your finance workspace…
          </p>
        )}
        {tab === 'reconciliation' && canReview && (
          <FinanceReconciliation from={from} to={to} />
        )}
        {data && needsSummary && (
          <>
            {rate <= 0n && (
              <p className="finance-notice">
                No exchange rate is configured. Figures are displayed in USD.
              </p>
            )}
            {tab === 'overview' && (
              <>
                <aside className="fw-accounting-readiness">
                  <strong>Operational finance overview</strong>
                  <p>
                    Cash collected is not earned revenue. Profit, supplier
                    balances and bank balances are not shown until the
                    accounting ledger is approved and connected.
                  </p>
                  <Link to="/finance?tab=payments">
                    See all-method payment register →
                  </Link>
                </aside>
                <section className="finance-cards" aria-label="Finance summary">
                  {[
                    [
                      'Cash received',
                      money(cents(data.cash.totalUsd)),
                      'Guest folios + house accounts · selected dates',
                    ],
                    [
                      'Recorded expenses',
                      money(expenseTotal),
                      'Operating expense records · selected dates',
                    ],
                    [
                      'In-house balances',
                      money(cents(data.balances)),
                      'Currently outstanding · not date-filtered',
                    ],
                    [
                      'House-account credit',
                      money(houseTotal),
                      'Positive balances · not date-filtered',
                    ],
                  ].map(([title, value, note]) => (
                    <article className="finance-card" key={title}>
                      <h2>{title}</h2>
                      <p className="finance-metric">{value}</p>
                      <small>{note}</small>
                    </article>
                  ))}
                </section>
                <div className="finance-chart-grid">
                  <section className="finance-card">
                    <div className="finance-card-title">
                      <h2>Cash collections & recorded expenses</h2>
                      <small>{displayCurrency}</small>
                    </div>
                    <div className="finance-legend">
                      <span>Cash received</span>
                      <span>Expenses recorded</span>
                    </div>
                    <div className="finance-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(v) => String(v).slice(5)}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis tick={{ fontSize: 10 }} width={60} />
                          <Tooltip
                            formatter={(v) =>
                              Number(v).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                              })
                            }
                          />
                          <Bar
                            name="Cash received"
                            dataKey="cash"
                            fill="#25a96a"
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            name="Expenses recorded"
                            dataKey="expenses"
                            fill="#e4a43c"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <details>
                      <summary>View chart data</summary>
                      <div className="finance-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Cash ({displayCurrency})</th>
                              <th>Expenses ({displayCurrency})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trend.map((d) => (
                              <tr key={d.date}>
                                <td>{d.date}</td>
                                <td>{d.cashExact}</td>
                                <td>{d.expensesExact}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                  <section className="finance-card">
                    <div className="finance-card-title">
                      <h2>Where your spending goes</h2>
                      <Link to="/expenses" className="finance-muted">
                        View expenses →
                      </Link>
                    </div>
                    <p className="finance-metric">{money(expenseTotal)}</p>
                    {!categories.length && (
                      <p className="finance-empty">
                        No expenses in this date range.
                      </p>
                    )}
                    {categories.map(([name, value]) => (
                      <div key={name}>
                        <div className="finance-category">
                          <span>{name}</span>
                          <strong>{money(value)}</strong>
                        </div>
                        <div className="finance-track">
                          <span
                            style={{
                              width: `${expenseTotal > 0 ? Math.min(100, Math.max(0, (Number(value) / Number(expenseTotal)) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              </>
            )}
            <section className="finance-card">
              <div className="finance-card-title">
                <h2>
                  {tab === 'overview'
                    ? 'Recent activity'
                    : 'Transaction activity'}
                </h2>
                <input
                  aria-label="Search finance activity"
                  placeholder="Search receipt, name or expense"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="finance-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Type</th>
                      <th>Customer / description</th>
                      <th>Reference</th>
                      <th>Recorded by</th>
                      <th>Amount ({displayCurrency})</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === 'overview' ? filtered.slice(0, 8) : filtered).map(
                      (r) => (
                        <tr key={r.id}>
                          <td>{r.date.slice(0, 10)}</td>
                          <td>{r.type}</td>
                          <td>{r.description}</td>
                          <td>{r.reference}</td>
                          <td>{r.staff || '—'}</td>
                          <td
                            className={
                              r.usd >= 0
                                ? 'finance-positive'
                                : 'finance-negative'
                            }
                          >
                            {money(r.usd)}
                          </td>
                          <td>
                            {r.type === 'Cash received' && (
                              <button onClick={() => setReceipt(r.id.slice(5))}>
                                Print receipt
                              </button>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <p className="finance-empty">No matching transactions.</p>
              )}
              <p className="finance-muted">
                {filtered.length} matching records
                {tab === 'overview' && filtered.length > 8
                  ? ' · showing the latest 8'
                  : ''}
              </p>
            </section>
            <p className="finance-scope">
              Scope: cash receipts from guest folios and house accounts only;
              voided receipts are excluded. POS receipts, card/mobile/bank
              payments and POS refunds are not included. Expenses are existing
              USD-based records, not bank reconciliations. This is not a
              profit-and-loss statement or bank balance. Leones figures use the
              current display rate (
              {rate > 0n ? `Le ${data.rate} / USD` : 'not configured'}); stored
              payment conversions are unchanged.
            </p>
          </>
        )}
      </div>
    </FinanceShell>
  );
}
