import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can, canOperate } from '../store/permissions';

const tierConfig: any = {
  BRONZE: { color: 'text-orange-700 bg-orange-100', next: 'SILVER', pointsNeeded: 500 },
  SILVER: { color: 'text-slate-600 bg-slate-200', next: 'GOLD', pointsNeeded: 1000 },
  GOLD: { color: 'text-yellow-700 bg-yellow-100', next: 'PLATINUM', pointsNeeded: 2500 },
  PLATINUM: { color: 'text-purple-700 bg-purple-100', next: null, pointsNeeded: null },
};

export default function Loyalty() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemingAccount, setRedeemingAccount] = useState<any>(null);
  const [folios, setFolios] = useState<any[]>([]);
  const [redeemForm, setRedeemForm] = useState({ folioId: '', points: '100', amount: '10', description: 'Loyalty reward' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/loyalty/accounts'),
      api.get('/loyalty/summary'),
    ])
      .then(([a, s]) => { setAccounts(a.data); setSummary(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAccount = async (id: string) => {
    const res = await api.get(`/loyalty/accounts/${id}`);
    setSelected(res.data);
  };

  const openRedeem = async (account: any) => {
    try {
      const response = await api.get(`/loyalty/accounts/${account.id}/folios`);
      const openFolios = response.data.filter((folio: any) => Number(folio.balance) > 0);
      setFolios(openFolios);
      setRedeemingAccount(account);
      setRedeemForm({ folioId: openFolios[0]?.id ?? '', points: '100', amount: '10', description: 'Loyalty reward' });
      setShowRedeem(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to load guest folios');
    }
  };

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!redeemingAccount) return;
    try {
      await api.post(`/loyalty/accounts/${redeemingAccount.id}/redeem`, {
        folioId: redeemForm.folioId,
        points: Number(redeemForm.points),
        amount: Number(redeemForm.amount),
        description: redeemForm.description,
      });
      setShowRedeem(false);
      openAccount(redeemingAccount.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Redemption failed');
    }
  };

  const filtered = accounts.filter(a =>
    search === '' ||
    `${a.guest?.firstName} ${a.guest?.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Loyalty Program</h2>
          <p className="text-slate-500 text-sm mt-1">Guest rewards and points management</p>
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <div className="space-y-6">
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Total Members</p>
                  <p className="text-3xl font-bold text-slate-800">{summary.totalMembers}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Points Issued</p>
                  <p className="text-3xl font-bold text-blue-600">{summary.totalPointsIssued?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Points Redeemed</p>
                  <p className="text-3xl font-bold text-orange-600">{summary.totalPointsRedeemed?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-slate-500 text-sm mb-1">Active Points</p>
                  <p className="text-3xl font-bold text-green-600">{summary.totalActivePoints?.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="flex gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Members Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Guest</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tier</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Points</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Earned</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Redeemed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No loyalty members yet</td></tr>
                  ) : (
                    filtered.map((account, i) => (
                      <tr key={account.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3">
                          <p className="text-slate-800 font-medium text-sm">
                            {account.guest?.firstName} {account.guest?.lastName}
                          </p>
                          <p className="text-slate-400 text-xs">{account.guest?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierConfig[account.tier]?.color}`}>
                            {account.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 font-bold text-sm">{account.points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">{account.totalEarned.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-orange-600 text-sm">{account.totalRedeemed.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openAccount(account.id)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border border-blue-200">
                              View
                            </button>
                            <button onClick={() => openRedeem(account)} disabled={!canOperate() || !can('create_reservations') || account.points <= 0}
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs rounded border border-orange-200 disabled:opacity-50">
                              Redeem
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Account Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {selected.guest?.firstName} {selected.guest?.lastName}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${tierConfig[selected.tier]?.color}`}>
                  {selected.tier}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selected.points?.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs">Available</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{selected.totalEarned?.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs">Total Earned</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{selected.totalRedeemed?.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs">Redeemed</p>
                </div>
              </div>

              {tierConfig[selected.tier]?.next && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-600 text-sm mb-2">
                    Progress to {tierConfig[selected.tier].next}
                  </p>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((selected.totalEarned / tierConfig[selected.tier].pointsNeeded) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {selected.totalEarned} / {tierConfig[selected.tier].pointsNeeded} points
                  </p>
                </div>
              )}

              <button
                onClick={() => openRedeem(selected)}
                disabled={!canOperate() || !can('create_reservations') || selected.points <= 0}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm"
              >
                Redeem Points
              </button>

              {/* Transaction History */}
              {selected.transactions?.length > 0 && (
                <div>
                  <h4 className="text-slate-700 font-semibold mb-3">Transaction History</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.transactions.map((t: any) => (
                      <div key={t.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <div>
                          <p className="text-slate-700 text-sm">{t.description}</p>
                          <p className="text-slate-400 text-xs">
                            {new Date(t.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`font-bold text-sm ${t.type === 'EARN' ? 'text-green-600' : 'text-orange-600'}`}>
                          {t.type === 'EARN' ? '+' : '-'}{t.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showRedeem && redeemingAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Redeem Loyalty Points</h3>
                <p className="text-sm text-slate-500">{redeemingAccount.guest?.firstName} {redeemingAccount.guest?.lastName} · {redeemingAccount.points} available points</p>
              </div>
              <button onClick={() => setShowRedeem(false)} className="text-slate-400 text-xl">×</button>
            </div>
            <form onSubmit={handleRedeem} className="p-6 space-y-4">
              {folios.length === 0 ? <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">This guest has no open folio with a balance to discount.</p> : <>
                <label className="block text-sm font-medium text-slate-600">Apply to open folio
                  <select required value={redeemForm.folioId} onChange={(e) => setRedeemForm({ ...redeemForm, folioId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800">
                    {folios.map((folio) => <option key={folio.id} value={folio.id}>#{folio.resNumber} · Room {folio.roomNumber} · Balance ${Number(folio.balance).toFixed(2)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-slate-600">Points
                    <select onChange={(e) => setRedeemForm({ ...redeemForm, points: e.target.value === 'custom' ? '' : e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800">
                      <option value="100">100 points</option><option value="250">250 points</option><option value="500">500 points</option><option value="custom">Custom</option>
                    </select>
                    <input required min="1" step="1" type="number" value={redeemForm.points} onChange={(e) => setRedeemForm({ ...redeemForm, points: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800" />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">Discount value (USD)
                    <select onChange={(e) => setRedeemForm({ ...redeemForm, amount: e.target.value === 'custom' ? '' : e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800">
                      <option value="5">$5.00</option><option value="10">$10.00</option><option value="25">$25.00</option><option value="custom">Custom</option>
                    </select>
                    <input required min="0.01" step="0.01" type="number" value={redeemForm.amount} onChange={(e) => setRedeemForm({ ...redeemForm, amount: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-600">Reason
                  <input required value={redeemForm.description} onChange={(e) => setRedeemForm({ ...redeemForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800" />
                </label>
                <p className="text-xs text-slate-500">The selected dollar value is posted as a loyalty discount against the folio. Staff select the value for each redemption.</p>
                <div className="flex gap-3"><button type="button" onClick={() => setShowRedeem(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white">Apply Discount</button></div>
              </>}
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
