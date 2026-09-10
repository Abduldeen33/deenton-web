import { useEffect, useState } from 'react';
import { getRooms } from '../api/rooms';
import Layout from '../components/Layout';
import { can } from '../store/permissions';
import api from '../api/client';

const statusConfig: any = {
  VACANT: { color: 'bg-white border-slate-200 text-slate-700', badge: 'bg-slate-100 text-slate-600' },
  OCCUPIED: { color: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700' },
  RESERVED: { color: 'bg-blue-50 border-blue-200 text-blue-800', badge: 'bg-blue-100 text-blue-700' },
  BLOCKED: { color: 'bg-red-50 border-red-200 text-red-800', badge: 'bg-red-100 text-red-700' },
  DUE_OUT: { color: 'bg-orange-50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-700' },
};

const housekeepingConfig: any = {
  CLEAN: 'text-green-600',
  DIRTY: 'text-red-500',
  INSPECTED: 'text-blue-600',
  DO_NOT_DISTURB: 'text-yellow-600',
};

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const load = () => {
    getRooms().then(setRooms).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts: any = {
    ALL: rooms.length,
    VACANT: rooms.filter(r => r.status === 'VACANT').length,
    OCCUPIED: rooms.filter(r => r.status === 'OCCUPIED').length,
    RESERVED: rooms.filter(r => r.status === 'RESERVED').length,
    BLOCKED: rooms.filter(r => r.status === 'BLOCKED').length,
    DUE_OUT: rooms.filter(r => r.status === 'DUE_OUT').length,
  };

  const filtered = filter === 'ALL' ? rooms : rooms.filter(r => r.status === filter);

  const updateRoom = async (id: string, data: any) => {
    setUpdating(true);
    try {
      await api.patch(`/rooms/${id}/status`, data);
      load();
      setSelected(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Room View</h2>
          <p className="text-slate-500 text-sm mt-1">Live status of all rooms</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(counts).map(([status, count]: any) => (
            <button key={status} onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filter === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {status === 'ALL' ? 'All' : status.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>

        {loading ? <p className="text-slate-400">Loading rooms...</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filtered.map((room) => (
              <div
                key={room.id}
                onClick={() => setSelected(room)}
                className={`border-2 rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow ${statusConfig[room.status]?.color}`}
              >
                <div className="mb-2">
                  <span className="text-lg font-bold">{room.roomNumber}</span>
                </div>
                <p className="text-xs opacity-75 mb-2 leading-tight">{room.roomType?.name}</p>
                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusConfig[room.status]?.badge}`}>
                    {room.status.replace('_', ' ')}
                  </span>
                  <p className={`text-xs mt-1 font-medium ${housekeepingConfig[room.housekeepingStatus]}`}>
                    {room.housekeepingStatus.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-4 flex-wrap">
          {[
            { label: 'Vacant', color: 'border-slate-300 bg-white' },
            { label: 'Occupied', color: 'border-green-300 bg-green-50' },
            { label: 'Reserved', color: 'border-blue-300 bg-blue-50' },
            { label: 'Due Out', color: 'border-orange-300 bg-orange-50' },
            { label: 'Blocked', color: 'border-red-300 bg-red-50' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 ${item.color}`} />
              <span className="text-slate-500 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Room Action Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Room {selected.roomNumber}</h3>
                <p className="text-slate-500 text-sm">{selected.roomType?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-3">
              {/* Current Status */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Status</p>
                  <p className="text-slate-800 font-semibold">{selected.status.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Housekeeping</p>
                  <p className="text-slate-800 font-semibold">{selected.housekeepingStatus.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Housekeeping Actions — available to HOUSEKEEPING and above */}
              {can('update_housekeeping') && (
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase mb-2">Housekeeping Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => updateRoom(selected.id, { housekeepingStatus: 'CLEAN' })} disabled={updating}
                      className="py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg border border-green-200 font-medium">
                      ✓ Clean
                    </button>
                    <button onClick={() => updateRoom(selected.id, { housekeepingStatus: 'DIRTY' })} disabled={updating}
                      className="py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 font-medium">
                      Dirty
                    </button>
                    <button onClick={() => updateRoom(selected.id, { housekeepingStatus: 'INSPECTED' })} disabled={updating}
                      className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg border border-blue-200 font-medium">
                      Inspected
                    </button>
                    <button onClick={() => updateRoom(selected.id, { housekeepingStatus: 'DO_NOT_DISTURB' })} disabled={updating}
                      className="py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm rounded-lg border border-yellow-200 font-medium">
                      DND
                    </button>
                  </div>
                </div>
              )}

              {/* Block/Unblock — ADMIN, IT only */}
              {can('block_rooms') && (
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase mb-2">Room Control</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.status !== 'BLOCKED' ? (
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for blocking this room?');
                          if (reason) updateRoom(selected.id, { status: 'BLOCKED', blockReason: reason });
                        }}
                        disabled={updating}
                        className="py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 font-medium col-span-2">
                        🔒 Block Room
                      </button>
                    ) : (
                      <button onClick={() => updateRoom(selected.id, { status: 'VACANT', blockReason: '' })} disabled={updating}
                        className="py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg border border-green-200 font-medium col-span-2">
                        🔓 Unblock Room
                      </button>
                    )}
                    <button onClick={() => updateRoom(selected.id, { status: 'VACANT' })} disabled={updating}
                      className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm rounded-lg border border-slate-200 font-medium col-span-2">
                      Set Vacant
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.blockReason && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-red-600 text-xs font-medium">Block Reason</p>
                  <p className="text-red-700 text-sm">{selected.blockReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}