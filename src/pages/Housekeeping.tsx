import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';

export default function Housekeeping() {
  const [dirtyRooms, setDirtyRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/housekeeping/dirty-rooms'), api.get('/housekeeping')])
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
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Housekeeping</h2>
          <p className="text-slate-500 text-sm mt-1">{dirtyRooms.length} rooms need attention</p>
        </div>

        {loading ? <p className="text-slate-400">Loading...</p> : (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Rooms Needing Cleaning</h3>
              {dirtyRooms.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                  <p className="text-green-700 font-medium">All rooms are clean ✓</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dirtyRooms.map((room) => (
                    <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-slate-800 font-bold">Room {room.roomNumber}</p>
                          <p className="text-slate-500 text-sm">{room.roomType?.name}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-lg font-medium">
                          {room.housekeepingStatus.replace('_', ' ')}
                        </span>
                      </div>
                      {can('update_housekeeping') && (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => updateRoomStatus(room.id, 'CLEAN')} disabled={updating === room.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">Mark Clean</button>
                          <button onClick={() => updateRoomStatus(room.id, 'INSPECTED')} disabled={updating === room.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg">Inspected</button>
                          <button onClick={() => updateRoomStatus(room.id, 'DO_NOT_DISTURB')} disabled={updating === room.id}
                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg">DND</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Active Tasks</h3>
              {tasks.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No active tasks</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {tasks.map((task, i) => (
                    <div key={task.id} className={`flex justify-between items-center p-4 ${i < tasks.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div>
                        <p className="text-slate-800 font-medium">Room {task.room?.roomNumber} — {task.room?.roomType?.name}</p>
                        <p className="text-slate-500 text-sm mt-0.5">{task.status} {task.assignedTo && `· ${task.assignedTo}`}</p>
                      </div>
                      {can('update_housekeeping') && (
                        <button onClick={async () => { await api.patch(`/housekeeping/${task.id}`, { status: 'DONE' }); load(); }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">Mark Done</button>
                      )}
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