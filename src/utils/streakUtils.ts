import {
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from 'date-fns';
import type { Task } from '../types/task';
import { getTaskUrgency } from './dateUtils';

export type CatMood = 'happy' | 'neutral' | 'sleepy' | 'sad';

export interface StreakSummary {
  /** Number of consecutive days (including today, or up to yesterday) with >= 1 completed task */
  streakCount: number;
  /** Most recent "YYYY-MM-DD" date when the user completed a task, or null */
  lastActiveDate: string | null;
  /** How many tasks were completed today */
  completedTodayCount: number;
  /** Whether the user lost a previous streak (missed yesterday after having a streak) */
  streakBroken: boolean;
  /** Derived mood of the pixel cat */
  mood: CatMood;
  /** Short status line spoken by the cat */
  statusMessage: string;
}

const STREAK_DATES_STORAGE_KEY = 'pico_active_streak_dates_v1';

/**
 * Loads the persisted set of "YYYY-MM-DD" dates on which the user completed at least one task.
 * Keeping this in localStorage alongside IndexedDB ensures that if a user deletes an old
 * completed task to clean up their list, they don't accidentally lose their streak history!
 */
export function getPersistedActiveDates(): string[] {
  try {
    const raw = localStorage.getItem(STREAK_DATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records a "YYYY-MM-DD" date as an active streak day.
 */
export function recordActiveStreakDate(date: Date = new Date()): void {
  const dayKey = format(date, 'yyyy-MM-dd');
  const existing = new Set(getPersistedActiveDates());
  existing.add(dayKey);
  try {
    localStorage.setItem(
      STREAK_DATES_STORAGE_KEY,
      JSON.stringify(Array.from(existing).sort()),
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Computes the user's current streak, last active date, and the cat's mood
 * from all tasks in IndexedDB + persisted active dates.
 */
export function calculateStreakSummary(
  tasks: Task[],
  now: Date = new Date(),
): StreakSummary {
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

  // Combine persisted active dates with any `completedAt` timestamps on current tasks
  const activeDatesSet = new Set<string>(getPersistedActiveDates());
  let completedTodayCount = 0;

  for (const task of tasks) {
    if (task.completed && task.completedAt) {
      const parsed = parseISO(task.completedAt);
      if (!Number.isNaN(parsed.getTime())) {
        const dateKey = format(parsed, 'yyyy-MM-dd');
        activeDatesSet.add(dateKey);
        if (dateKey === todayStr) {
          completedTodayCount += 1;
        }
      }
    }
  }

  const sortedDatesDesc = Array.from(activeDatesSet).sort().reverse();
  const lastActiveDate = sortedDatesDesc[0] ?? null;

  // Count consecutive days working backwards from today (if active today) or yesterday (if active yesterday)
  let streakCount = 0;
  let cursorDate: Date | null = null;

  if (activeDatesSet.has(todayStr)) {
    cursorDate = now;
  } else if (activeDatesSet.has(yesterdayStr)) {
    cursorDate = subDays(now, 1);
  }

  if (cursorDate) {
    while (activeDatesSet.has(format(cursorDate, 'yyyy-MM-dd'))) {
      streakCount += 1;
      cursorDate = subDays(cursorDate, 1);
    }
  }

  // Check if the user had an active day in the past, but missed yesterday and today
  const streakBroken =
    lastActiveDate !== null &&
    streakCount === 0 &&
    differenceInCalendarDays(now, parseISO(lastActiveDate)) > 1;

  // Check if there are any overdue tasks right now
  const overdueCount = tasks.filter(
    (t) => !t.completed && getTaskUrgency(t, now) === 'overdue',
  ).length;

  // Determine the Cat's 4 Moods: 'happy' | 'neutral' | 'sleepy' | 'sad'
  let mood: CatMood = 'sleepy';
  let statusMessage = 'Zzz... Complete 1 task today to wake me & start a streak!';

  if (completedTodayCount > 0 && overdueCount === 0) {
    mood = 'happy';
    statusMessage =
      streakCount > 1
        ? `Purr! ${streakCount}-day streak locked in today!`
        : 'Purr! You completed a task today—streak started!';
  } else if (overdueCount > 0 || streakBroken) {
    mood = 'sad';
    statusMessage =
      overdueCount > 0
        ? `Mrow... ${overdueCount} overdue ${overdueCount === 1 ? 'task needs' : 'tasks need'} your attention!`
        : 'Meow... our streak reset! Complete 1 task to cheer me up.';
  } else if (completedTodayCount > 0 && overdueCount > 0) {
    mood = 'neutral';
    statusMessage = 'Nice progress today! Clear the overdue task to make me purr.';
  } else if (streakCount >= 1) {
    // Active yesterday, waiting for today's task
    mood = 'neutral';
    statusMessage = `${streakCount}-day streak active! Finish 1 task today to keep it going.`;
  }

  return {
    streakCount,
    lastActiveDate,
    completedTodayCount,
    streakBroken,
    mood,
    statusMessage,
  };
}
