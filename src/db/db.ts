import Dexie, { type EntityTable } from 'dexie';
import type { NewTaskInput, Task, UpdateTaskInput } from '../types/task';
import type {
  CalendarSchedule,
  NewScheduleInput,
  UpdateScheduleInput,
} from '../types/schedule';
import type { FocusSession } from '../types/session';
import type { FinanceEntry, NewFinanceEntryInput } from '../types/finance';
import { recordActiveStreakDate } from '../utils/streakUtils';

/**
 * Local-first IndexedDB database powered by Dexie.
 *
 * Interview Note:
 * Each phase adds a new schema version (`version(1)` -> `version(2)` -> `version(3)`)
 * so existing local data in `tasks` and `sessions` is preserved during upgrades.
 */
class PicoTaskDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  schedules!: EntityTable<CalendarSchedule, 'id'>;
  sessions!: EntityTable<FocusSession, 'id'>;
  transactions!: EntityTable<FinanceEntry, 'id'>;

  constructor() {
    super('PicoTaskDatabase');

    this.version(1).stores({
      tasks: '++id, deadline, completed, createdAt',
    });

    this.version(2).stores({
      tasks: '++id, deadline, completed, createdAt',
      sessions: '++id, completedAt',
    });

    this.version(3).stores({
      tasks: '++id, deadline, completed, createdAt',
      sessions: '++id, completedAt',
      transactions: '++id, type, category, date, createdAt',
    });

    this.version(4).stores({
      tasks: '++id, deadline, completed, createdAt, repeatGroupId',
      sessions: '++id, completedAt',
      transactions: '++id, type, category, date, createdAt',
    });

    this.version(5).stores({
      tasks: '++id, deadline, completed, createdAt, repeatGroupId',
      schedules: '++id, dateTime, createdAt, repeatGroupId',
      sessions: '++id, completedAt',
      transactions: '++id, type, category, date, createdAt',
    });
  }
}

export const db = new PicoTaskDB();

/**
 * Adds a new task to IndexedDB with default `completed: false` and current `createdAt`.
 */
export async function addTask(input: NewTaskInput): Promise<number | undefined> {
  const nowIso = new Date().toISOString();
  return db.tasks.add({
    title: input.title.trim(),
    notes: input.notes.trim(),
    deadline: input.deadline,
    completed: false,
    createdAt: nowIso,
    repeatRule: input.repeatRule,
    repeatGroupId: input.repeatGroupId,
    repeatLabel: input.repeatLabel,
  });
}

/**
 * Adds a batch of repeated schedule occurrences to IndexedDB in a single transaction.
 */
export async function addRepeatedTasks(inputs: NewTaskInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const nowIso = new Date().toISOString();
  await db.tasks.bulkAdd(
    inputs.map((input) => ({
      title: input.title.trim(),
      notes: input.notes.trim(),
      deadline: input.deadline,
      completed: false,
      createdAt: nowIso,
      repeatRule: input.repeatRule,
      repeatGroupId: input.repeatGroupId,
      repeatLabel: input.repeatLabel,
    })),
  );
}

/**
 * Updates an existing task by its numeric ID.
 */
export async function updateTask(id: number, changes: UpdateTaskInput): Promise<number> {
  const payload: Partial<Task> = { ...changes };
  if (typeof payload.title === 'string') {
    payload.title = payload.title.trim();
  }
  if (typeof payload.notes === 'string') {
    payload.notes = payload.notes.trim();
  }
  return db.tasks.update(id, payload);
}

/**
 * Toggles a task's `completed` status and records `completedAt` when checked off.
 */
export async function toggleTaskCompletion(id: number, currentCompleted: boolean): Promise<number> {
  const nextCompleted = !currentCompleted;
  const now = new Date();
  if (nextCompleted) {
    recordActiveStreakDate(now);
  }
  return db.tasks.update(id, {
    completed: nextCompleted,
    completedAt: nextCompleted ? now.toISOString() : undefined,
  });
}

/**
 * Permanently deletes a task by its numeric ID.
 */
export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id);
}

/**
 * Deletes every task occurrence belonging to a repeating schedule series.
 */
export async function deleteTaskSeries(repeatGroupId: string): Promise<number> {
  return db.tasks.where('repeatGroupId').equals(repeatGroupId).delete();
}

/**
 * Adds a single calendar schedule/reminder (separate from Tasks).
 */
export async function addSchedule(
  input: NewScheduleInput,
): Promise<number | undefined> {
  return db.schedules.add({
    title: input.title.trim(),
    notes: input.notes.trim(),
    dateTime: input.dateTime,
    createdAt: new Date().toISOString(),
    repeatRule: input.repeatRule,
    repeatGroupId: input.repeatGroupId,
    repeatLabel: input.repeatLabel,
  });
}

/**
 * Adds a batch of repeated calendar schedule reminders in a single transaction.
 */
export async function addRepeatedSchedules(
  inputs: NewScheduleInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const nowIso = new Date().toISOString();
  await db.schedules.bulkAdd(
    inputs.map((input) => ({
      title: input.title.trim(),
      notes: input.notes.trim(),
      dateTime: input.dateTime,
      createdAt: nowIso,
      repeatRule: input.repeatRule,
      repeatGroupId: input.repeatGroupId,
      repeatLabel: input.repeatLabel,
    })),
  );
}

/**
 * Updates an existing calendar schedule reminder.
 */
export async function updateSchedule(
  id: number,
  changes: UpdateScheduleInput,
): Promise<number> {
  const payload: Partial<CalendarSchedule> = { ...changes };
  if (typeof payload.title === 'string') {
    payload.title = payload.title.trim();
  }
  if (typeof payload.notes === 'string') {
    payload.notes = payload.notes.trim();
  }
  return db.schedules.update(id, payload);
}

/**
 * Deletes a single calendar schedule reminder by ID.
 */
export async function deleteSchedule(id: number): Promise<void> {
  await db.schedules.delete(id);
}

/**
 * Deletes every reminder occurrence in a repeating calendar schedule series.
 */
export async function deleteScheduleSeries(
  repeatGroupId: string,
): Promise<number> {
  return db.schedules.where('repeatGroupId').equals(repeatGroupId).delete();
}

/**
 * Saves a completed focus timer session to IndexedDB.
 */
export async function addFocusSession(
  title: string,
  durationSeconds: number,
): Promise<number | undefined> {
  const cleanTitle = title.trim() || 'Untitled Focus Session';
  return db.sessions.add({
    title: cleanTitle,
    durationSeconds: Math.max(1, Math.floor(durationSeconds)),
    completedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a saved focus session by its numeric ID.
 */
export async function deleteFocusSession(id: number): Promise<void> {
  await db.sessions.delete(id);
}

/**
 * Adds a new finance entry (income or expense) to IndexedDB.
 */
export async function addFinanceEntry(
  input: NewFinanceEntryInput,
): Promise<number | undefined> {
  return db.transactions.add({
    type: input.type,
    category: input.category,
    amount: Math.round(input.amount * 100) / 100,
    date: input.date,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * Deletes a finance entry by its numeric ID.
 */
export async function deleteFinanceEntry(id: number): Promise<void> {
  await db.transactions.delete(id);
}
