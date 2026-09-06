import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const roles = ['ADMIN', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTS', 'RESTAURANT', 'IT'];

const roleColors: any = {
  ADMIN: 'bg-purple-900 border-purple-700 text-purple-300',
  FRONT_DESK: 'bg-blue-900 border-blue-700 text-blue-300',
  HOUSEKEEPING: 'bg-green-900 border-green-700 text-green-300',
  MAINTENANCE: 'bg-orange-900 border-orange-700 text-orange-300',
  ACCOUNTS: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  RESTAURANT: 'bg-red-900 border-red-700 text-red-300',
  IT: 'bg-cyan-900 border-cyan-700 text-cyan-300',
};

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', role: 'FRONT_DESK',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/staff'),
      api.get('/staff/summary'),
    ])
      .then(([s, sum]) => {
        setStaff(s.data);
        setSummary(sum.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/staff', form);
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'FRONT_DESK' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create staff');
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/staff/${id}/toggle-active`);
    load();
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword) return;
    await api.patch(`/staff/${id}/reset-password`, { password: newPassword });
    setShowReset(null);
    setNewPassword('');
    alert('Password reset successfully');
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Staff Management</h2>
            <p className="text-slate-400 text-sm mt-1">{summary?.total ?? 0} staff members</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Staff
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-slate-400 text-sm">Total Staff</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{summary.active}</p>
              <p className="text-slate-400 text-sm">Active</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{summary.inactive}</p>
              <p className="text-slate-400 text-sm">Inactive</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-slate-400 text-sm">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${roleColors[member.role]}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${member.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {member.isActive ? '● Active' : '● Inactive'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(member.id)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg"
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setShowReset(member.id)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reset Password inline */}
                {showReset === member.id && (
                  <div className="mt-3 flex gap-3 items-center border-t border-slate-700 pt-3">
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleResetPassword(member.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowReset(null); setNewPassword(''); }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Add Staff Member</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password *</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">Add Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}