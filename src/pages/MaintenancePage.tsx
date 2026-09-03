import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const priorityColors: any = {
  1: 'text-slate-400',
  2: 'text-yellow-400',
  3: 'text-red-400',
};

const statusColors: any = {
  OPEN: 'bg-red-900 border-red-700 text-red-300',
  IN_PROGRESS: 'bg-yellow-900 border-yellow-700 text-yellow-300',
  RESOLVED: 'bg-green-900 border-green-700 text-green-300',
  CLOSED: 'bg-slate-700 border-slate-600 text-slate-400',
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    roomId: '',
    category: 'AC',
    description: '',
    priority: 1,
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/maintenance'),
      api.get('/rooms'),
    ])
      .then(([ticketRes, roomRes]) => {
        setTickets(ticketRes.data);
        setRooms(roomRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/maintenance', form);
      setShowForm(false);
      setForm({ roomId: '', category: 'AC', description: '', priority: 1 });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/maintenance/${id}`, { status });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Maintenance</h2>
            <p className="text-slate-400 text-sm mt-1">{tickets.length} active tickets</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Ticket
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-400">No active maintenance tickets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                      <span className="text-slate-400 text-xs">{ticket.category}</span>
                      <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>
                        Priority {ticket.priority}
                      </span>
                    </div>
                    <p className="text-white font-medium">
                      Room {ticket.room?.roomNumber} — {ticket.room?.roomType?.name}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">{ticket.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {ticket.status === 'OPEN' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded-lg"
                      >
                        Start
                      </button>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">New Maintenance Ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Room *</label>
                <select
                  required
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber} — {room.roomType?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="AC">AC</option>
                  <option value="TV">TV</option>
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="NETWORK">Network</option>
                  <option value="FURNITURE">Furniture</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}