import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { BedDouble, CheckCircle2, Brush, Clock3, UserRound, RefreshCw, ShieldCheck, DoorClosed, X } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { can } from '../store/permissions';
import {
  cleaningState,
  cleaningProgress,
  isActiveTask,
  isBlocked,
  type HousekeepingRoom,
  type CleaningTask,
} from '../components/housekeeping-data';
import { dateKey, isInHouse, type RackStay } from '../components/stay-view-data';
import './housekeeping.css';

// Use the hotel's calendar day, not the browser's local timezone.
const hotelToday = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Freetown', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};
type StayResponse = { rooms: HousekeepingRoom[]; reservations?: RackStay[] };
type OccupancyFilter = 'ALL' | 'IN_HOUSE' | 'DUE_OUT' | 'OVERDUE' | 'VACANT';
const currentStay = (stay: RackStay) => isInHouse(stay) && !stay.checkedOutAt;


function errorMessage(error: unknown) {
  return isAxiosError(error) && typeof error.response?.data?.message === 'string'
    ? error.response.data.message : 'Unable to complete this request. Please retry.';
}
const icons = { green: CheckCircle2, red: Brush, amber: Clock3, neutral: DoorClosed };
type HousekeepingAssignee = { id: string; name: string };
type TaskAction = 'START' | 'FINISH' | 'APPROVE' | 'REJECT';



function RoomDetails({
  room,
  tasks,
  assignees,
  selectedAssignee,
  onAssigneeChange,
  disabled,
  actionError,
  message,
  onClose,
  onUpdate,
  onCreateTask,
  onTaskAction,
  roomStays,
  today,
  staysAvailable,
}: {
  room: HousekeepingRoom;
  tasks: CleaningTask[] | null;
  assignees: HousekeepingAssignee[];
  selectedAssignee: string;
  onAssigneeChange: (id: string) => void;
  disabled: boolean;
  actionError: string;
  message: string;
  onClose: () => void;
  onUpdate: (room: HousekeepingRoom, status: string) => void;
  onCreateTask: (room: HousekeepingRoom, assignedUserId: string) => void;
  onTaskAction: (task: CleaningTask, action: TaskAction, notes?: string) => void;
  roomStays: RackStay[];
  today: string;
  staysAvailable: boolean;
}) {

  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const status = cleaningState(room, tasks);
  return <dialog ref={dialog} className="hk-dialog" aria-labelledby="hk-room-title" onCancel={onClose} onClose={onClose}>
    <header><div><h2 id="hk-room-title">Room {room.roomNumber}</h2><p>{room.roomType?.name || 'Room type not recorded'}</p></div><button autoFocus onClick={onClose} aria-label="Close housekeeping details"><X size={18}/></button></header>
    <dl><div><dt>Cleaning status</dt><dd><span className={'hk-badge hk-' + status.tone}>{status.label}</span></dd></div><div><dt>Recorded housekeeping</dt><dd>{room.housekeepingStatus?.replaceAll('_', ' ') || 'Not recorded'}</dd></div><div><dt>Room status</dt><dd>{room.status?.replaceAll('_', ' ') || 'Not recorded'}</dd></div><div><dt>Floor</dt><dd>{room.floor ?? 'Not recorded'}</dd></div></dl>
    <h3>Guest occupancy</h3>
    {!staysAvailable ? <p>Guest stay information is unavailable. Refresh to retry.</p> :
      roomStays.filter(currentStay).length ? roomStays.filter(currentStay).map(stay => (
        <p key={stay.id} className="hk-notes">
          <strong>In-house</strong> Â· {stay.guest ? `${stay.guest.firstName} ${stay.guest.lastName}`.trim() : 'Guest name not supplied'}
          {' Â· '}Scheduled checkout: {dateKey(stay.departureDate)}
          {dateKey(stay.departureDate) < today ? ' Â· Overdue' : dateKey(stay.departureDate) === today ? ' Â· Due out today' : ''}
        </p>
      )) : <p>No active checked-in stay recorded for this room.</p>}
    <h3>Cleaning assignments</h3>
    {tasks === null ? <p>Assignments unavailable. Close this panel and refresh to retry.</p> : tasks.filter(t => t.roomId === room.id).length ? <ul>{tasks.filter(t => t.roomId === room.id).map(task => <li key={task.id}><strong>{task.assignedTo?.trim() || 'Unassigned'}</strong> Â· {task.status.replaceAll('_', ' ')}{task.notes && <p>{task.notes}</p>}</li>)}</ul> : <p>No cleaning assignments recorded yet.</p>}
    {can('update_housekeeping') && assignees.length > 0 && !isBlocked(room) &&
      room.housekeepingStatus !== 'DO_NOT_DISTURB' && tasks !== null &&
      !tasks.some(t => t.roomId === room.id && isActiveTask(t)) && (
      <div className="hk-room-actions">
        <h3>Assign cleaning task</h3>
        <label htmlFor="hk-assignee-select">Select housekeeper</label>
        <select id="hk-assignee-select" value={selectedAssignee}
          onChange={e => onAssigneeChange(e.target.value)} disabled={disabled}>
          <option value="">Choose housekeeper</option>
          {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button disabled={disabled || !selectedAssignee}
          onClick={() => onCreateTask(room, selectedAssignee)}>Assign Cleaner</button>
      </div>
    )}
    {tasks?.filter(t => t.roomId === room.id && isActiveTask(t)).map(task => (
      <div key={'actions-'+task.id} className="hk-room-actions">
        <h3>Task actions Â· {task.status.replaceAll('_',' ')}</h3>
        {task.status === 'OPEN' && <button disabled={disabled}
          onClick={() => onTaskAction(task, 'START')}>Start Cleaning</button>}
        {task.status === 'IN_PROGRESS' && <button disabled={disabled}
          onClick={() => onTaskAction(task, 'FINISH')}>Finish Cleaning</button>}
        {task.status === 'RESOLVED' && <>
          <button disabled={disabled} onClick={() => onTaskAction(task, 'APPROVE')}>Approve Inspection</button>
          <button disabled={disabled} onClick={() => {
            const reason = window.prompt('Reason for rejecting this inspection:');
            if (reason?.trim()) onTaskAction(task, 'REJECT', reason.trim());
          }}>Reject Inspection</button>
        </>}
        <p className="hk-help">Actions are checked against your hotel role by the server.</p>
      </div>
    ))}
    {room.notes && <><h3>Room notes</h3><p className="hk-notes">{room.notes}</p></>}
    {room.blockReason && <><h3>Block reason</h3><p>{room.blockReason}</p></>}
    {can('update_housekeeping') && <div className="hk-room-actions"><h3>Housekeeping actions</h3>
      {isBlocked(room) ? <p>Room is blocked. Manage its block in Room View before changing cleaning status here.</p> : tasks?.some(t => t.roomId === room.id && isActiveTask(t)) ? <p>Finish the managed cleaning workflow before changing the room's recorded housekeeping status.</p> : <div>{[['CLEAN', 'Mark Clean'], ['INSPECTED', 'Inspected'], ['DO_NOT_DISTURB', 'DND']].map(([value, label]) => <button key={value} disabled={disabled} onClick={() => onUpdate(room, value)}>{label}</button>)}</div>}
    </div>}
    {actionError && <p role="alert" className="hk-error">{actionError}</p>}
    {message && <p role="status" className="hk-notice">{message}</p>}
    <button className="hk-close" onClick={onClose}>Close details</button>
  </dialog>;
}

export default function Housekeeping() {
  const [rooms, setRooms] = useState<HousekeepingRoom[] | null>(null);
  const [tasks, setTasks] = useState<CleaningTask[] | null>(null);
  const [stays, setStays] = useState<RackStay[] | null>(null);
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('ALL');
  const [assignees, setAssignees] = useState<HousekeepingAssignee[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  const [roomError, setRoomError] = useState(''), [taskError, setTaskError] = useState('');
  const [message, setMessage] = useState(''), [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState(false), lock = useRef(false);
  const [filter, setFilter] = useState('ALL'), [floor, setFloor] = useState('ALL');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    // The existing stay-view snapshot is read-only. GET /rooms performs legacy status repairs.
    void Promise.allSettled([
      api.get<StayResponse>('/rooms/stay-view', { params: { days: 7 }, signal: controller.signal, timeout: 15000 }),
      api.get<CleaningTask[]>('/housekeeping', { signal: controller.signal, timeout: 15000 }),
    ]).then(([roomResult, taskResult]) => {
      if (controller.signal.aborted) return;
      if (roomResult.status === 'fulfilled' && Array.isArray(roomResult.value.data?.rooms)) {
        setRooms(roomResult.value.data.rooms);
        // The backend must explicitly provide stay records; never infer vacancy from an absent array.
        setStays(Array.isArray(roomResult.value.data.reservations) ? roomResult.value.data.reservations : null);
        setRoomError('');
      } else { setRooms(null); setStays(null); setRoomError('Room records could not be loaded. Refresh to retry.'); }
      if (taskResult.status === 'fulfilled' && Array.isArray(taskResult.value.data)) {
        setTasks(taskResult.value.data); setTaskError('');
      } else { setTasks(null); setTaskError('Cleaning assignments could not be loaded. Progress and assigned staff are unavailable.'); }
      setLoading(false);
    });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    api.get<HousekeepingAssignee[]>('/housekeeping/assignees', { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted && Array.isArray(response.data)) setAssignees(response.data); })
      .catch(() => { if (!controller.signal.aborted) setAssignees([]); });
    return () => controller.abort();
  }, [revision]);
  const refresh = () => { setLoading(true); setRevision(n => n + 1); };
  async function update(action: () => Promise<unknown>) {
    if (!can('update_housekeeping') || lock.current || loading || roomError || taskError) return;
    lock.current = true; setUpdating(true); setActionError(''); setMessage('');
    try { await action(); setMessage('Housekeeping updated.'); refresh(); }
    catch (error) { setActionError(errorMessage(error)); }
    finally { lock.current = false; setUpdating(false); }
  }
  const updateRoom = (room: HousekeepingRoom, housekeepingStatus: string) => {
    // The legacy room endpoint also writes isBlocked. Do not accidentally clear a block.
    if (isBlocked(room)) return;
    void update(() => api.patch(`/rooms/${room.id}/status`, { housekeepingStatus }));
  };
  const createTask = (room: HousekeepingRoom, assignedUserId: string) => {
    if (!assignedUserId || isBlocked(room)) return;
    const requestKey = globalThis.crypto?.randomUUID?.() || `hk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    void update(() => api.post('/housekeeping', {
      roomId: room.id, assignedUserId, requestKey, priority: 1,
    }));
  };
  const taskAction = (task: CleaningTask, action: TaskAction, notes?: string) => {
    if (!Number.isInteger(task.version) || task.version < 1) {
      setActionError('Task version is unavailable. Refresh Housekeeping first.');
      return;
    }
    void update(() => api.patch(`/housekeeping/${task.id}`, {
      action, expectedVersion: task.version, ...(notes ? { notes } : {}),
    }));
  };
  const rows = rooms || [];
  const today = hotelToday();
  const staysByRoom = new Map<string, RackStay[]>();
  for (const stay of stays || []) {
    const group = staysByRoom.get(stay.roomId) || [];
    group.push(stay);
    staysByRoom.set(stay.roomId, group);
  }
  const occupancyOf = (room: HousekeepingRoom) => {
    const activeStays = (staysByRoom.get(room.id) || []).filter(currentStay);
    return {
      activeStays,
      inHouse: activeStays.length > 0,
      dueToday: activeStays.some(stay => dateKey(stay.departureDate) === today),
      overdue: activeStays.some(stay => dateKey(stay.departureDate) < today),
    };
  };
  const matchesOccupancy = (room: HousekeepingRoom) => {
    if (occupancyFilter === 'ALL') return true;
    if (!stays) return false;
    const occupancy = occupancyOf(room);
    if (occupancyFilter === 'IN_HOUSE') return occupancy.inHouse;
    if (occupancyFilter === 'DUE_OUT') return occupancy.dueToday;
    if (occupancyFilter === 'OVERDUE') return occupancy.overdue;
    return !occupancy.inHouse;
  };
  const occupiedCount = stays ? rows.filter(room => occupancyOf(room).inHouse).length : null;
  const dueTodayCount = stays ? rows.filter(room => occupancyOf(room).dueToday).length : null;
  const overdueCount = stays ? rows.filter(room => occupancyOf(room).overdue).length : null;
  const vacantCount = stays ? rows.filter(room => !occupancyOf(room).inHouse).length : null;
  const floors = [...new Set(rows.flatMap(room => room.floor == null ? [] : [room.floor]))].sort((a, b) => a - b);
  const visible = rows.filter(room => (floor === 'ALL' || (floor === 'NONE' ? room.floor == null : String(room.floor) === floor)) && (filter === 'ALL' || cleaningState(room, tasks).key === filter) && matchesOccupancy(room));
  const progress = cleaningProgress(tasks || []);
  const selectedRoom = rows.find(room => room.id === selected);
  const disabled = loading || updating || !!roomError || !!taskError;
  const metrics = [
    { label: 'Total Rooms', count: rooms?.length, icon: BedDouble, tone: 'gold', hint: 'Rooms recorded at this hotel' },
    { label: 'Clean & Ready', count: rooms && tasks ? rows.filter(room => cleaningState(room, tasks).key === 'CLEAN').length : undefined, icon: CheckCircle2, tone: 'green', hint: 'Clean / inspected, not blocked or cleaning' },
    { label: 'Dirty Rooms', count: rooms ? rows.filter(room => room.housekeepingStatus === 'DIRTY').length : undefined, icon: Brush, tone: 'red', hint: 'Recorded dirty; may include cleaning in progress' },
    { label: 'In Progress', count: rooms && tasks ? rows.filter(room => tasks.some(task => task.roomId === room.id && task.status === 'IN_PROGRESS')).length : undefined, icon: Clock3, tone: 'amber', hint: 'Rooms with an in-progress cleaning task' },
  ];
  return <Layout><div className="hk-workspace">
    <header className="hk-header"><div><span className="hk-eyebrow">Hotel operations</span><h1>Housekeeping Overview</h1><p>Room cleaning, inspections &amp; staff assignments</p></div><button disabled={loading || updating} onClick={refresh}><RefreshCw size={15}/>{loading ? 'Refreshingâ€¦' : 'Refresh housekeeping'}</button></header>
    {(roomError || taskError) && <div role="alert" className="hk-error">{roomError} {taskError}</div>}
    {actionError && <p role="alert" className="hk-error">{actionError}</p>}{message && <p role="status" className="hk-notice">{message}</p>}
    <div className="hk-overview">
      <section aria-label="Housekeeping summary" className="hk-metrics" aria-busy={loading}>
        {metrics.map(metric => <article key={metric.label} className={'hk-metric hk-' + metric.tone}><div><h2>{metric.label}</h2><strong>{loading ? 'â€”' : metric.count ?? 'â€”'}</strong><p>{metric.hint}</p></div><span className="hk-metric-icon"><metric.icon size={23}/></span></article>)}
      </section>
      <section className="hk-panel hk-progress" aria-label="Cleaning Task Overview"><header><div><h2>Cleaning Task Overview</h2><p>Progress from recorded assignments</p></div><ShieldCheck size={20}/></header>
        <p className="hk-help">Resolved / assigned tasks in the current worklist. Closed tasks are excluded; this is not a daily performance report. Assignees are shown as recorded.</p>
        {loading ? <p role="status" className="hk-empty">Loading cleaning assignmentsâ€¦</p> : taskError ? <p className="hk-empty">Assignments unavailable. Use Refresh housekeeping to retry.</p> : !progress.length ? <p className="hk-empty">No cleaning assignments recorded yet.</p> : <div className="hk-progress-list">{progress.map(person => <div className="hk-person" key={person.name}><div><span><UserRound size={15}/>{person.name}</span><strong>{person.completed}/{person.total} tasks</strong></div><progress aria-label={`${person.name} completed cleaning tasks`} value={person.completed} max={person.total}/></div>)}</div>}
      </section>
    </div>
    <section className="hk-panel" aria-label="Guest occupancy summary">
      <header><div><h2>Guest occupancy &amp; departures</h2><p>Checked-in stays only. Cleaning readiness is tracked separately.</p></div></header>
      {!stays ? <p className="hk-empty" role="status">Stay details are not included in the current room snapshot. Occupancy filters are unavailable until the API supplies them.</p> :
        <div className="hk-metrics" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12}}>
          {[
            ['In-house', occupiedCount], ['Due Out Today', dueTodayCount],
            ['Overdue', overdueCount], ['Vacant (no checked-in stay)', vacantCount],
          ].map(([label, count]) => <article key={String(label)} className="hk-metric">
            <div><h2>{label}</h2><strong>{count}</strong></div>
          </article>)}
        </div>}
    </section>
    <section className="hk-panel hk-board" aria-label="Room Status Board"><header><div><h2>Room Status Board</h2><p>Cleaning readiness is separate from occupancy and booking availability.</p></div><label>Floor<select aria-label="Housekeeping floor" value={floor} disabled={loading || !rooms || !floors.length} onChange={e => setFloor(e.target.value)}><option value="ALL">All floors</option>{floors.map(value => <option key={value} value={String(value)}>Floor {value}</option>)}{rows.some(room => room.floor == null) && <option value="NONE">Floor not recorded</option>}</select></label></header>
      <div className="hk-board-toolbar"><div className="hk-filters" role="group" aria-label="Room cleaning filters">{[['ALL', 'All'], ['CLEAN', 'Clean'], ['DIRTY', 'Dirty'], ['IN_PROGRESS', 'In Progress']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} disabled={loading}>{label}</button>)}</div><span>{loading || !rooms ? 'Room records' : `${visible.length} of ${rooms.length} rooms`}</span></div>
      <div className="hk-board-toolbar"><div className="hk-filters" role="group" aria-label="Guest occupancy filters">
        {([['ALL', 'All occupancy'], ['IN_HOUSE', 'In-house'], ['DUE_OUT', 'Due Out Today'], ['OVERDUE', 'Overdue'], ['VACANT', 'Vacant']] as const).map(([key, label]) =>
          <button key={key} type="button" aria-pressed={occupancyFilter === key} disabled={loading || (key !== 'ALL' && !stays)} onClick={() => setOccupancyFilter(key)}>{label}</button>)}
      </div></div>
      {loading ? <p className="hk-empty" role="status">Loading room statusâ€¦</p> : roomError ? <p className="hk-empty">Room status unavailable. Refresh to retry.</p> : !visible.length ? <p className="hk-empty">{rows.length ? 'No rooms match this floor and cleaning filter.' : 'No rooms recorded for this hotel yet.'}</p> : <div className="hk-room-grid">{visible.map(room => {
        const state = cleaningState(room, tasks), Icon = icons[state.tone as keyof typeof icons];
        const assignees = [...new Set((tasks || []).filter(task => task.roomId === room.id && isActiveTask(task)).flatMap(task => task.assignedTo?.trim() ? [task.assignedTo.trim()] : []))];
        return <button className={'hk-room-card hk-' + state.tone} key={room.id} onClick={() => setSelected(room.id)} aria-label={`View housekeeping for room ${room.roomNumber}`}>
          <div className="hk-room-top"><span className="hk-room-number">{room.roomNumber}</span><Icon size={20}/></div><p className="hk-room-type">{room.roomType?.name || 'Room type not recorded'}</p><span className={'hk-badge hk-' + state.tone}>{state.label}</span>
          <p className="hk-room-recorded">{stays ? (occupancyOf(room).inHouse ? 'IN-HOUSE' : 'NO CHECKED-IN STAY') : 'Occupancy unavailable'}
            {stays && occupancyOf(room).dueToday ? ' Â· DUE OUT TODAY' : ''}
            {stays && occupancyOf(room).overdue ? ' Â· OVERDUE' : ''}
            {room.floor != null && ` Â· Floor ${room.floor}`}</p>
          <div className="hk-assignee"><UserRound size={14}/><span>{tasks === null ? 'Assignment unavailable' : assignees.join(', ') || 'Unassigned'}</span></div>
        </button>;
      })}</div>}
      <p className="hk-help">In Progress reflects task activity; recorded room statuses are retained. DND, blocked and unrecorded rooms are visible under All.</p>
    </section>
    <section className="hk-panel hk-tasks" aria-label="Active housekeeping tasks"><header><h2>Active Tasks</h2><span>Existing cleaning worklist</span></header>
      {loading ? <p className="hk-empty">Loading tasksâ€¦</p> : taskError ? <p className="hk-empty">Tasks unavailable.</p> : !tasks?.length ? <p className="hk-empty">No active tasks</p> : <ul>{tasks.map(task => <li key={task.id}><div><strong>Room {task.room?.roomNumber || rows.find(room => room.id === task.roomId)?.roomNumber || 'Not recorded'}</strong><p>{task.room?.roomType?.name}</p><small>{task.assignedTo?.trim() || 'Unassigned'} Â· {task.status.replaceAll('_', ' ')}</small>{task.notes && <p>{task.notes}</p>}</div>{can('update_housekeeping') && isActiveTask(task) && <span>Manage task from its room details</span>}</li>)}</ul>}
    </section>
    {selectedRoom && <RoomDetails room={selectedRoom} tasks={tasks} assignees={assignees}
      selectedAssignee={selectedAssignee} onAssigneeChange={setSelectedAssignee}
      disabled={disabled} actionError={actionError} message={message}
      onClose={() => setSelected(null)} onUpdate={updateRoom}
      onCreateTask={createTask} onTaskAction={taskAction}
      roomStays={staysByRoom.get(selectedRoom.id) || []} today={today} staysAvailable={!!stays}/>}
  </div></Layout>;
}

