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
  /** Highest consecutive-day streak ever achieved (used for cat level & weekly cosmetic unlocks) */
  bestStreakCount: number;
  /** Cat level (LV.1 at 0-6D, +1 per week up to LV.6 at 35D+) */
  level: number;
  /** Days remaining until the next weekly level-up (0 when maxed at LV.6) */
  daysToNextLevel: number;
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
const BEST_STREAK_STORAGE_KEY = 'pico_best_streak_v1';

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

  // Compute longest historical consecutive-day run from active dates
  const sortedDatesAsc = Array.from(activeDatesSet).sort();
  let longestRun = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;
  for (const dateStr of sortedDatesAsc) {
    const parsed = parseISO(dateStr);
    if (Number.isNaN(parsed.getTime())) continue;
    if (prevDate && differenceInCalendarDays(parsed, prevDate) === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    if (currentRun > longestRun) longestRun = currentRun;
    prevDate = parsed;
  }

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

  let savedBest = 0;
  try {
    const rawBest = localStorage.getItem(BEST_STREAK_STORAGE_KEY);
    savedBest = rawBest ? Math.max(0, Number.parseInt(rawBest, 10) || 0) : 0;
  } catch {
    savedBest = 0;
  }
  const bestStreakCount = Math.max(savedBest, longestRun, streakCount);
  if (bestStreakCount > savedBest) {
    try {
      localStorage.setItem(BEST_STREAK_STORAGE_KEY, String(bestStreakCount));
    } catch {
      // Ignore storage errors
    }
  }

  const level = Math.min(6, Math.floor(bestStreakCount / 7) + 1);
  const daysToNextLevel = level >= 6 ? 0 : level * 7 - bestStreakCount;

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
  // New day with 0 completed tasks today -> cat sleeps until 1 task is completed today.
  let mood: CatMood = 'sleepy';
  let statusMessage =
    streakCount >= 1
      ? `Zzz... ${streakCount}-day streak! Finish 1 task today to wake me & keep it going.`
      : 'Zzz... Complete 1 task today to wake me & start a streak!';

  if (completedTodayCount > 0 && overdueCount === 0) {
    mood = 'happy';
    statusMessage =
      streakCount > 1
        ? `Purr! ${streakCount}-day streak locked in today!`
        : 'Purr! You completed a task today—streak started!';
  } else if (completedTodayCount > 0 && overdueCount > 0) {
    mood = 'neutral';
    statusMessage = 'Nice progress today! Clear the overdue task to make me purr.';
  } else if (overdueCount > 0 || streakBroken) {
    mood = 'sad';
    statusMessage =
      overdueCount > 0
        ? `Mrow... ${overdueCount} overdue ${overdueCount === 1 ? 'task needs' : 'tasks need'} your attention!`
        : 'Meow... our streak reset! Complete 1 task to cheer me up.';
  }

  return {
    streakCount,
    bestStreakCount,
    level,
    daysToNextLevel,
    lastActiveDate,
    completedTodayCount,
    streakBroken,
    mood,
    statusMessage,
  };
}
