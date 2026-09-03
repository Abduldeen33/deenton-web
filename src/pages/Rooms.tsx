import { useEffect, useState } from 'react';
import { getRooms } from '../api/rooms';
import Layout from '../components/Layout';

const statusColors: any = {
  VACANT: 'bg-slate-700 border-slate-600 text-slate-300',
  OCCUPIED: 'bg-green-900 border-green-700 text-green-300',
  RESERVED: 'bg-blue-900 border-blue-700 text-blue-300',
  BLOCKED: 'bg-red-900 border-red-700 text-red-300',
  DUE_OUT: 'bg-orange-900 border-orange-700 text-orange-300',
};

const housekeepingColors: any = {
  CLEAN: 'text-green-400',
  DIRTY: 'text-red-400',
  INSPECTED: 'text-blue-400',
  DO_NOT_DISTURB: 'text-yellow-400',
};

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getRooms()
      .then(setRooms)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL'
    ? rooms
    : rooms.filter((r) => r.status === filter);

  const counts = {
    ALL: rooms.length,
    VACANT: rooms.filter((r) => r.status === 'VACANT').length,
    OCCUPIED: rooms.filter((r) => r.status === 'OCCUPIED').length,
    RESERVED: rooms.filter((r) => r.status === 'RESERVED').length,
    BLOCKED: rooms.filter((r) => r.status === 'BLOCKED').length,
    DUE_OUT: rooms.filter((r) => r.status === 'DUE_OUT').length,
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Room View</h2>
          <p className="text-slate-400 text-sm mt-1">Live status of all rooms</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(counts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All' : status.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Loading rooms...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filtered.map((room) => (
              <div
                key={room.id}
                className={`border rounded-xl p-3 cursor-pointer hover:opacity-80 transition-opacity ${statusColors[room.status]}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold">{room.roomNumber}</span>
                </div>
                <p className="text-xs opacity-75 mb-2 leading-tight">{room.roomType?.name}</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium">{room.status.replace('_', ' ')}</p>
                  <p className={`text-xs ${housekeepingColors[room.housekeepingStatus]}`}>
                    {room.housekeepingStatus.replace('_', ' ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700 border border-slate-600"></div>
            <span className="text-slate-400 text-xs">Vacant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-900 border border-green-700"></div>
            <span className="text-slate-400 text-xs">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-900 border border-blue-700"></div>
            <span className="text-slate-400 text-xs">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-900 border border-orange-700"></div>
            <span className="text-slate-400 text-xs">Due Out</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-900 border border-red-700"></div>
            <span className="text-slate-400 text-xs">Blocked</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}