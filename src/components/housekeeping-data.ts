export type HousekeepingRoom = {
  id: string; roomNumber: string; floor?: number | null; status?: string;
  housekeepingStatus?: string | null; isBlocked?: boolean; blockReason?: string | null;
  notes?: string | null; roomType?: { name: string };
};

export type CleaningTask = {
  id: string;
  roomId: string;
  status: string;
  version: number;
  workflowVersion?: number | null;
  assignedUserId?: string | null;
  assignedTo?: string | null;
  taskType?: string | null;
  priority?: number;
  notes?: string | null;
  room?: HousekeepingRoom;
};

export type HousekeepingAssignee = {
  id: string;
  name: string;
};

export const isBlocked = (room: HousekeepingRoom) => room.isBlocked || room.status === 'BLOCKED';
export const isActiveTask = (task: CleaningTask) =>
  ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(task.status);
export function cleaningState(room: HousekeepingRoom, tasks: CleaningTask[] | null) {
  if (isBlocked(room)) return { key: 'BLOCKED', label: 'Out of service / blocked', tone: 'neutral' };
  if (room.housekeepingStatus === 'DO_NOT_DISTURB') return { key: 'DND', label: 'Do not disturb', tone: 'neutral' };
  if (tasks?.some(task => task.roomId === room.id && task.status === 'IN_PROGRESS')) return { key: 'IN_PROGRESS', label: 'In Progress', tone: 'amber' };
  if (room.housekeepingStatus === 'INSPECTED') return { key: 'CLEAN', label: 'Inspected', tone: 'green' };
  if (room.housekeepingStatus === 'CLEAN') return { key: 'CLEAN', label: 'Clean', tone: 'green' };
  if (room.housekeepingStatus === 'DIRTY') return { key: 'DIRTY', label: 'Dirty', tone: 'red' };
  return { key: 'UNKNOWN', label: 'Not recorded', tone: 'neutral' };
}
export function cleaningProgress(tasks: CleaningTask[]) {
  const people = new Map<string, { name: string; completed: number; total: number }>();
  for (const task of tasks) {
    const name = task.assignedTo?.trim();
    if (!name) continue;
    const person = people.get(name) || { name, completed: 0, total: 0 };
    person.total++;
    if (['RESOLVED', 'CLOSED'].includes(task.status)) person.completed++;
    people.set(name, person);
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
}
