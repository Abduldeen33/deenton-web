import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const housekeepingColors: any = {
  CLEAN: 'bg-green-900 border-green-700 text-green-300',
  DIRTY: 'bg-red-900 border-red-700 text-red-300',
  INSPECTED: 'bg-blue-900 border-blue-700 text-blue-300',
  DO_NOT_DISTURB: 'bg-yellow-900 border-yellow-700 text-yellow-300',
};

export default function Housekeeping() {
  const [dirtyRooms, setDirtyRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/housekeeping/dirty-rooms'),
      api.get('/housekeeping'),
    ])
      .then(([dirty, taskRes]) => {
        setDirtyRooms(dirty.data);
        setTasks(taskRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateRoomStatus = async (roomId: string, housekeepingStatus: string) => {
    setUpdating(roomId);
    try {
      await api.patch(`/rooms/${roomId}/status`, { housekeepingStatus });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const createTask = async (roomId: string) => {
    try {
      await api.post('/housekeeping', { roomId, priority: 1 });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Housekeeping</h2>
          <p className="text-slate-400 text-sm mt-1">
            {dirtyRooms.length} rooms need attention
          </p>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            {/* Dirty Rooms */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Rooms Needing Cleaning</h3>
              {dirtyRooms.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                  <p className="text-green-400 text-lg font-medium">All rooms are clean ✓</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dirtyRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-white font-bold text-lg">Room {room.roomNumber}</p>
                          <p className="text-slate-400 text-sm">{room.roomType?.name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded border text-xs font-medium ${housekeepingColors[room.housekeepingStatus]}`}>
                          {room.housekeepingStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateRoomStatus(room.id, 'CLEAN')}
                          disabled={updating === room.id}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
                        >
                          Mark Clean
                        </button>
                        <button
                          onClick={() => updateRoomStatus(room.id, 'INSPECTED')}
                          disabled={updating === room.id}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                        >
                          Inspected
                        </button>
                        <button
                          onClick={() => updateRoomStatus(room.id, 'DO_NOT_DISTURB')}
                          disabled={updating === room.id}
                          className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors"
                        >
                          DND
                        </button>
                        <button
                          onClick={() => createTask(room.id)}
                          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors"
                        >
                          Assign Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Active Tasks</h3>
              {tasks.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No active tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-white font-medium">
                          Room {task.room?.roomNumber} — {task.room?.roomType?.name}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          Status: {task.status} {task.assignedTo && `• Assigned to: ${task.assignedTo}`}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await api.patch(`/housekeeping/${task.id}`, { status: 'DONE' });
                          load();
                        }}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
                      >
                        Mark Done
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}