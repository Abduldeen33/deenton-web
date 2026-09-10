import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

const categories = ['Utilities','Salaries','Food & Beverage','Maintenance','Cleaning Supplies','Laundry','Marketing','Transport','Office Supplies','Security','Internet & Phone','Other'];

export default function Expenses() {
  const [data, setData] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: 'Utilities', description: '', amount: '', paidTo: '',
    paymentMethod: 'CASH', expenseDate: new Date().toISOString().split('T')[0],
  });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/expenses'), api.get('/expenses/monthly')])
      .then(([exp, mon]) => { setData(exp.data); setMonthly(mon.data); })
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
      setForm({ category: 'Utilities', description: '', amount: '', paidTo: '', paymentMethod: 'CASH', expenseDate: new Date().toISOString().split('T')[0] });
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
            <p className="text-slate-500 text-sm mt-1">Track operational costs</p>
          </div>
          {can('manage_expenses') && (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              + Record Expense
            </button>
          )}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">This Month</p>
                <p className="text-3xl font-bold text-red-500">${monthly?.total?.toLocaleString() ?? '0'}</p>
                <p className="text-slate-400 text-xs mt-1">{monthly?.month}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-slate-800">${data?.total?.toLocaleString() ?? '0'}</p>
                <p className="text-slate-400 text-xs mt-1">{data?.expenses?.length ?? 0} records</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-2">By Category</p>
                {data?.byCategory && Object.entries(data.byCategory).slice(0, 3).map(([cat, amt]: any) => (
                  <div key={cat} className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">{cat}</span>
                    <span className="text-slate-800 font-medium">${amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-slate-800 font-semibold">All Expenses</h3>
              </div>
              {data?.expenses?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No expenses recorded yet</div>
              ) : (
                data?.expenses?.map((expense: any, i: number) => (
                  <div key={expense.id} className={`flex justify-between items-center p-4 ${i < data.expenses.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">{expense.category}</span>
                        <span className="text-slate-400 text-xs">{formatDate(expense.expenseDate)}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{expense.description}</p>
                      {expense.paidTo && <p className="text-slate-500 text-sm">Paid to: {expense.paidTo}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-red-500 font-bold">${Number(expense.amount).toLocaleString()}</p>
                      {can('manage_expenses') && (
                        <button onClick={async () => { await api.delete(`/expenses/${expense.id}`); load(); }}
                          className="text-slate-300 hover:text-red-400 text-sm">✕</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {showForm && can('manage_expenses') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Record Expense</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description *</label>
                <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Amount ($) *</label>
                  <input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Date *</label>
                  <input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Paid To</label>
                <input value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Payment Method</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm">
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