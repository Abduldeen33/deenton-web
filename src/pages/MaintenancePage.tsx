import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

const statusConfig: any = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roomId: '', category: 'AC', description: '', priority: 1 });

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/maintenance'), api.get('/rooms')])
      .then(([t, r]) => { setTickets(t.data); setRooms(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/maintenance', form);
    setShowForm(false);
    setForm({ roomId: '', category: 'AC', description: '', priority: 1 });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/maintenance/${id}`, { status });
    load();
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Maintenance</h2>
            <p className="text-slate-500 text-sm mt-1">{tickets.length} active tickets</p>
          </div>
          {can('manage_maintenance') && (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
              + New Ticket
            </button>
          )}
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : tickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <p className="text-slate-400">No active maintenance tickets</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {tickets.map((ticket, i) => (
              <div key={ticket.id} className={`flex items-start justify-between p-4 ${i < tickets.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[ticket.status]}`}>{ticket.status}</span>
                    <span className="text-slate-400 text-xs">{ticket.category}</span>
                    <span className="text-slate-400 text-xs">Priority {ticket.priority}</span>
                  </div>
                  <p className="text-slate-800 font-medium">Room {ticket.room?.roomNumber} — {ticket.room?.roomType?.name}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{ticket.description}</p>
                </div>
                {can('manage_maintenance') && (
                  <div className="flex gap-2 ml-4">
                    {ticket.status === 'OPEN' && (
                      <button onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg">Start</button>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <button onClick={() => updateStatus(ticket.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">Resolve</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">New Maintenance Ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Room *</label>
                <select required value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value="">Select room</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber} — {room.roomType?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  {['AC','TV','PLUMBING','ELECTRICAL','NETWORK','FURNITURE','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description *</label>
                <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm">
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}