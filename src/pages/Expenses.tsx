import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const categories = [
  'Utilities', 'Salaries', 'Food & Beverage', 'Maintenance',
  'Cleaning Supplies', 'Laundry', 'Marketing', 'Transport',
  'Office Supplies', 'Security', 'Internet & Phone', 'Other'
];

export default function Expenses() {
  const [data, setData] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: 'Utilities',
    description: '',
    amount: '',
    paidTo: '',
    paymentMethod: 'CASH',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/expenses'),
      api.get('/expenses/monthly'),
    ])
      .then(([exp, mon]) => {
        setData(exp.data);
        setMonthly(mon.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm({
        category: 'Utilities', description: '', amount: '',
        paidTo: '', paymentMethod: 'CASH',
        expenseDate: new Date().toISOString().split('T')[0],
      });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Expenses</h2>
            <p className="text-slate-400 text-sm mt-1">Track operational costs</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Record Expense
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <p className="text-slate-400 text-sm mb-1">This Month</p>
                <p className="text-3xl font-bold text-red-400">${monthly?.total?.toLocaleString() ?? '0'}</p>
                <p className="text-slate-500 text-xs mt-1">{monthly?.month}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <p className="text-slate-400 text-sm mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-white">${data?.total?.toLocaleString() ?? '0'}</p>
                <p className="text-slate-500 text-xs mt-1">{data?.expenses?.length ?? 0} records</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <p className="text-slate-400 text-sm mb-2">By Category</p>
                {data?.byCategory && Object.entries(data.byCategory).slice(0, 3).map(([cat, amt]: any) => (
                  <div key={cat} className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{cat}</span>
                    <span className="text-white">${amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-semibold">All Expenses</h3>
              </div>
              {data?.expenses?.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400">No expenses recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {data?.expenses?.map((expense: any) => (
                    <div key={expense.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                            {expense.category}
                          </span>
                          <span className="text-slate-400 text-xs">{formatDate(expense.expenseDate)}</span>
                        </div>
                        <p className="text-white font-medium">{expense.description}</p>
                        {expense.paidTo && (
                          <p className="text-slate-400 text-sm">Paid to: {expense.paidTo}</p>
                        )}
                        <p className="text-slate-500 text-xs">{expense.paymentMethod?.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-red-400 font-bold text-lg">${Number(expense.amount).toLocaleString()}</p>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-slate-500 hover:text-red-400 text-sm transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Record Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Record Expense</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description *</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What was this expense for?"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Paid To</label>
                <input
                  value={form.paidTo}
                  onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                  placeholder="Vendor or person paid"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg text-sm">
                  {submitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}