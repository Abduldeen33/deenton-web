import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

export default function Inventory() {
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ITEMS');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState<{ item: any; type: 'IN' | 'OUT' } | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    categoryId: '', name: '', description: '', unit: 'pcs',
    currentStock: '', minimumStock: '', costPrice: '', sellingPrice: '',
  });
  const [stockForm, setStockForm] = useState({ quantity: '', notes: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/summary'),
      api.get('/inventory/categories'),
      api.get('/inventory/items'),
      api.get('/inventory/low-stock'),
      api.get('/inventory/transactions'),
    ])
      .then(([sum, cats, itms, low, trans]) => {
        setSummary(sum.data);
        setCategories(cats.data);
        setItems(itms.data);
        setLowStock(low.data);
        setTransactions(trans.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory/categories', categoryForm);
    setShowCategoryForm(false);
    setCategoryForm({ name: '', description: '' });
    load();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/inventory/items', {
      ...itemForm,
      currentStock: Number(itemForm.currentStock),
      minimumStock: Number(itemForm.minimumStock),
      costPrice: itemForm.costPrice ? Number(itemForm.costPrice) : undefined,
      sellingPrice: itemForm.sellingPrice ? Number(itemForm.sellingPrice) : undefined,
    });
    setShowItemForm(false);
    setItemForm({ categoryId: '', name: '', description: '', unit: 'pcs', currentStock: '', minimumStock: '', costPrice: '', sellingPrice: '' });
    load();
  };

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStockForm) return;
    const endpoint = showStockForm.type === 'IN'
      ? `/inventory/items/${showStockForm.item.id}/stock-in`
      : `/inventory/items/${showStockForm.item.id}/stock-out`;
    try {
      await api.post(endpoint, { quantity: Number(stockForm.quantity), notes: stockForm.notes });
      setShowStockForm(null);
      setStockForm({ quantity: '', notes: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const units = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'bottle', 'roll', 'pack', 'bag', 'can'];

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Store & Inventory</h2>
            <p className="text-slate-500 text-sm mt-1">Track stock levels and movements</p>
          </div>
          {can('manage_expenses') && (
            <div className="flex gap-3">
              <button onClick={() => setShowCategoryForm(true)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg">
                + Category
              </button>
              <button onClick={() => setShowItemForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
                + Add Item
              </button>
            </div>
          )}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">Total Items</p>
                <p className="text-3xl font-bold text-slate-800">{summary?.totalItems ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">Low Stock</p>
                <p className="text-3xl font-bold text-orange-500">{summary?.lowStock ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">Out of Stock</p>
                <p className="text-3xl font-bold text-red-500">{summary?.outOfStock ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-slate-500 text-sm mb-1">Total Value</p>
                <p className="text-3xl font-bold text-green-600">${summary?.totalValue?.toLocaleString() ?? 0}</p>
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <p className="text-orange-700 font-semibold mb-2">⚠️ Low Stock Alert — {lowStock.length} items</p>
                <div className="flex gap-2 flex-wrap">
                  {lowStock.map((item) => (
                    <span key={item.id} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg">
                      {item.name} ({Number(item.currentStock)} {item.unit})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {['ITEMS', 'CATEGORIES', 'TRANSACTIONS'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Items */}
            {activeTab === 'ITEMS' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Min Stock</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cost</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">No items yet</td></tr>
                    ) : (
                      items.map((item, i) => {
                        const isLow = Number(item.currentStock) <= Number(item.minimumStock);
                        const isOut = Number(item.currentStock) === 0;
                        return (
                          <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-4 py-3">
                              <p className="text-slate-800 font-medium">{item.name}</p>
                              {item.description && <p className="text-slate-400 text-xs">{item.description}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">{item.category?.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className={`font-bold ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-slate-800'}`}>
                                {Number(item.currentStock)} {item.unit}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-sm">{Number(item.minimumStock)} {item.unit}</td>
                            <td className="px-4 py-3 text-slate-700 text-sm">
                              {item.costPrice ? `$${Number(item.costPrice).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {isOut ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-lg font-medium">Out of Stock</span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-lg font-medium">Low Stock</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-lg font-medium">In Stock</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => setShowStockForm({ item, type: 'IN' })}
                                  className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded border border-green-200">
                                  + In
                                </button>
                                <button onClick={() => setShowStockForm({ item, type: 'OUT' })}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded border border-red-200">
                                  - Out
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Categories */}
            {activeTab === 'CATEGORIES' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.length === 0 ? (
                  <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-slate-400">No categories yet</p>
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <h4 className="text-slate-800 font-semibold">{cat.name}</h4>
                      {cat.description && <p className="text-slate-500 text-sm mt-1">{cat.description}</p>}
                      <p className="text-slate-400 text-xs mt-2">{cat._count?.items ?? 0} items</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Transactions */}
            {activeTab === 'TRANSACTIONS' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No transactions yet</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Quantity</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t, i) => (
                        <tr key={t.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(t.createdAt)}</td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800 font-medium">{t.item?.name}</p>
                            <p className="text-slate-400 text-xs">{t.item?.category?.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.type === 'IN' ? '↑ Stock In' : '↓ Stock Out'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {Number(t.quantity)} {t.item?.unit}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">{t.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">New Category</h3>
              <button onClick={() => setShowCategoryForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name *</label>
                <input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Beverages, Cleaning Supplies"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCategoryForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Add Inventory Item</h3>
              <button onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Category *</label>
                <select required value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Item Name *</label>
                <input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Heineken Beer, Toilet Paper"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Unit *</label>
                <select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Opening Stock</label>
                  <input type="number" min="0" value={itemForm.currentStock} onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Minimum Stock</label>
                  <input type="number" min="0" value={itemForm.minimumStock} onChange={(e) => setItemForm({ ...itemForm, minimumStock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Cost Price ($)</label>
                  <input type="number" min="0" step="0.01" value={itemForm.costPrice} onChange={(e) => setItemForm({ ...itemForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Selling Price ($)</label>
                  <input type="number" min="0" step="0.01" value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowItemForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {showStockForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {showStockForm.type === 'IN' ? '↑ Stock In' : '↓ Stock Out'}
                </h3>
                <p className="text-slate-500 text-sm">{showStockForm.item.name} — Current: {Number(showStockForm.item.currentStock)} {showStockForm.item.unit}</p>
              </div>
              <button onClick={() => setShowStockForm(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleStock} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Quantity *</label>
                <input required type="number" min="0.01" step="0.01" value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  placeholder={`Enter quantity in ${showStockForm.item.unit}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                <input value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="e.g. Supplier delivery, Used for bar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStockForm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className={`flex-1 py-3 text-white font-semibold rounded-xl text-sm ${showStockForm.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {showStockForm.type === 'IN' ? 'Add Stock' : 'Remove Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}