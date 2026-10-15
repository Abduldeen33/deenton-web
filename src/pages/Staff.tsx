import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { getUser } from '../store/auth';
import { can, departmentRoles } from '../store/permissions';
const accessLevels = ['STAFF', 'SUPERVISOR', 'ASSISTANT_MANAGER', 'MANAGER'];
const accessLevelLabel = (level: string, role: string) => level === 'MANAGER' ? 'Department Manager / Head of Department' : level === 'STAFF' ? (role === 'ACCOUNTS' ? 'Cashier' : 'Staff / Junior (view only)') : level.replaceAll('_', ' ');

const roles = ['ADMIN', 'GENERAL_MANAGER', 'ASSISTANT_GENERAL_MANAGER', 'PURCHASE_MANAGER', 'DIRECTOR_OF_FINANCE', 'STOREKEEPING_MANAGER', 'CEO', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTS', 'RESTAURANT', 'KITCHEN', 'BAR', 'IT'];

const roleColors: any = {
  KITCHEN: 'bg-orange-50 text-orange-700 border-orange-200',
  BAR: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN: 'bg-purple-900 border-purple-700 text-purple-300',
  FRONT_DESK: 'bg-blue-900 border-blue-700 text-blue-300',
  HOUSEKEEPING: 'bg-green-900 border-green-700 text-green-300',
  MAINTENANCE: 'bg-orange-900 border-orange-700 text-orange-300',
  ACCOUNTS: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  RESTAURANT: 'bg-red-900 border-red-700 text-red-300',
  IT: 'bg-cyan-900 border-cyan-700 text-cyan-300',
};

export default function Staff() {
  const platformAdmin = ['SUPER_ADMIN', 'CEO'].includes(getUser()?.role || '');
  const assignableRoles = platformAdmin ? [...roles, 'SUPER_ADMIN'] : roles.filter(r => r !== 'CEO');
  const [hotels, setHotels] = useState<{ id: string; name: string; propertyCode: string }[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pendingLoad = useRef<AbortController | null>(null);
  const staffPath = platformAdmin && hotelId ? `/super-admin/properties/${hotelId}/staff` : '/staff';
  const [staff, setStaff] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [staffName, setStaffName] = useState({ firstName: '', lastName: '' });
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', role: 'FRONT_DESK', accessLevel: 'STAFF',
  });

  const load = () => {
    pendingLoad.current?.abort();
    const controller = new AbortController(); pendingLoad.current = controller;
    setError(''); setStaff([]); setSummary(null);
    setLoading(true);
    Promise.all([
      api.get(staffPath, { signal: controller.signal }),
      api.get(`${staffPath}/summary`, { signal: controller.signal }),
    ])
      .then(([s, sum]) => {
        if (controller.signal.aborted) return;
        setStaff(s.data);
        setSummary(sum.data);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to load staff.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  };

  useEffect(() => { load(); return () => pendingLoad.current?.abort(); }, [staffPath]);
  useEffect(() => { setEditingName(null); }, [staffPath]);
  useEffect(() => {
    if (!platformAdmin) return;
    const controller = new AbortController();
    api.get('/super-admin/properties', { signal: controller.signal }).then(r => setHotels(r.data)).catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to load hotels.'); });
    return () => controller.abort();
  }, [platformAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.post(staffPath, form);
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'FRONT_DESK', accessLevel: 'STAFF' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create staff');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try { await api.patch(`${staffPath}/${id}/toggle-active`); load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Unable to update account.'); }
    finally { setSaving(false); }
  };

  const changeAccessLevel = async (id: string, accessLevel: string) => {
    if (saving) return;
    setSaving(true);
    try { await api.patch(`${staffPath}/${id}`, { accessLevel }); load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Unable to update access level.'); }
    finally { setSaving(false); }
  };

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!platformAdmin || !editingName || saving) return;
    setSaving(true); setError('');
    try {
      await api.patch(`${staffPath}/${editingName}`, { firstName: staffName.firstName.trim(), lastName: staffName.lastName.trim() });
      setEditingName(null); load();
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to edit staff name.'); }
    finally { setSaving(false); }
  };

  const deleteStaff = async (member: any) => {
    if (!platformAdmin || saving || member.id === getUser()?.id) return;
    if (!window.confirm(`Permanently delete the login account for ${member.firstName} ${member.lastName} (${member.email})? This cannot be undone. Transaction records remain, but some reports may no longer resolve this staff member's name. Deactivate instead if you need to retain the account history.`)) return;
    setSaving(true); setError('');
    try { await api.delete(`${staffPath}/${member.id}`); setEditingName(null); setShowReset(null); load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Unable to delete staff account.'); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword || saving) return;
    setSaving(true);
    try {
    await api.patch(`${staffPath}/${id}/reset-password`, { password: newPassword });
    setShowReset(null);
    setNewPassword('');
    alert('Password reset successfully');
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to reset password.'); }
    finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="staff-pms min-h-full bg-[#f8f8f6] p-4">
        {platformAdmin && <label className="mb-4 block text-sm">Manage accounts for hotel<select aria-label="Account hotel" value={hotelId} disabled={saving} onChange={e => { pendingLoad.current?.abort(); setHotelId(e.target.value); setShowForm(false); setShowReset(null); setNewPassword(''); }} className="ml-3 rounded border bg-white p-2"><option value="">My login hotel ({getUser()?.propertyCode})</option>{hotels.map(h => <option key={h.id} value={h.id}>{h.name} ({h.propertyCode})</option>)}</select></label>}
        {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Staff Management</h2>
            <p className="text-slate-400 text-sm mt-1">{summary?.total ?? 0} staff members</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={!can('manage_staff') || loading || saving}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-slate-400 text-sm">{member.email}</p>
                      {departmentRoles.includes(member.role) && <label className="block text-xs">Access level<select aria-label={`Access level for ${member.email}`} disabled={saving || !can('manage_staff')} value={member.accessLevel || 'STAFF'} onChange={e => void changeAccessLevel(member.id, e.target.value)} className="ml-2 rounded border bg-white p-1 text-slate-700">{accessLevels.map(level => <option key={level} value={level}>{accessLevelLabel(level, member.role)}</option>)}</select></label>}
                      <p className="text-slate-400 text-xs">Last login: {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : 'Never logged in'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${roleColors[member.role]}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${member.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {member.isActive ? '● Active' : '● Inactive'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleToggle(member.id)}
                        disabled={saving || !can('manage_staff') || (!platformAdmin && ['CEO', 'SUPER_ADMIN'].includes(member.role))}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg"
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setShowReset(member.id)}
                        disabled={saving || !can('manage_staff') || (!platformAdmin && ['CEO', 'SUPER_ADMIN'].includes(member.role))}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>

                {platformAdmin && <div aria-label={`Account actions for ${member.email}`} className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-3">
                  <span className="text-xs text-slate-500">CEO / Super Admin actions</span>
                  <button type="button" disabled={saving} onClick={() => { setEditingName(member.id); setStaffName({ firstName: member.firstName, lastName: member.lastName }); }} className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg">Edit name</button>
                  <button type="button" disabled={saving || member.id === getUser()?.id} title={member.id === getUser()?.id ? 'You cannot delete your own account' : 'Permanently delete this staff login'} onClick={() => void deleteStaff(member)} className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50">Delete staff</button>
                  {member.id === getUser()?.id && <span className="text-xs text-slate-500">Your signed-in account cannot be deleted.</span>}
                </div>}

                {platformAdmin && editingName === member.id && <form onSubmit={saveName} className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-700 pt-3">
                  <label className="text-sm">First name<input aria-label="Edit staff first name" required maxLength={100} disabled={saving} value={staffName.firstName} onChange={e => setStaffName({ ...staffName, firstName: e.target.value })} className="block rounded border bg-white p-2 text-slate-800" /></label>
                  <label className="text-sm">Last name<input aria-label="Edit staff last name" required maxLength={100} disabled={saving} value={staffName.lastName} onChange={e => setStaffName({ ...staffName, lastName: e.target.value })} className="block rounded border bg-white p-2 text-slate-800" /></label>
                  <button type="submit" disabled={saving || !staffName.firstName.trim() || !staffName.lastName.trim()} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Save name</button>
                  <button type="button" disabled={saving} onClick={() => setEditingName(null)} className="rounded border px-3 py-2 text-sm">Cancel name edit</button>
                </form>}

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
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                {departmentRoles.includes(form.role) && <label className="text-sm">Access level<select aria-label="New account access level" value={form.accessLevel} onChange={e => setForm({ ...form, accessLevel: e.target.value })} className="block rounded border bg-white p-2 text-slate-700">{accessLevels.map(level => <option key={level} value={level}>{accessLevelLabel(level, form.role)}</option>)}</select></label>}
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">{saving ? 'Creating account...' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
