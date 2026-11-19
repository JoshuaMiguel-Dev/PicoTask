import { addDays, addMonths, addWeeks, getDay, isAfter, startOfDay } from 'date-fns';
import type { TaskRepeatRule } from '../types/task';

export type RepeatHorizon = '2w' | '1m' | '2m' | '3m' | '6m' | '12m';

export const SHORT_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const STANDARD_HORIZONS: { id: RepeatHorizon; label: string }[] = [
  { id: '2w', label: '2 Wks' },
  { id: '1m', label: '1 Mo' },
  { id: '2m', label: '2 Mos' },
  { id: '3m', label: '3 Mos' },
];

export const MONTHLY_HORIZONS: { id: RepeatHorizon; label: string }[] = [
  { id: '3m', label: '3 Mos' },
  { id: '6m', label: '6 Mos' },
  { id: '12m', label: '1 Yr' },
];

const MAX_OCCURRENCES = 90;

/**
 * Formats a concise badge label for a repeated schedule, e.g. "Daily", "Mon/Wed/Fri", "Monthly".
 */
export function formatRepeatLabel(
  rule: Exclude<TaskRepeatRule, 'none'>,
  weeklyDays: number[],
): string {
  if (rule === 'daily') return 'Daily';
  if (rule === 'weekdays') return 'Mon-Fri';
  if (rule === 'monthly') return 'Monthly';

  const uniqueSorted = Array.from(new Set(weeklyDays))
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  if (uniqueSorted.length === 0) return 'Weekly';
  if (uniqueSorted.length === 7) return 'Daily';
  return uniqueSorted.map((d) => SHORT_WEEKDAY_LABELS[d]).join('/');
}

/**
 * Generates occurrence dates starting from `startDate` for a Notion-style repeating schedule.
 */
export function generateRecurringDates(
  startDate: Date,
  rule: TaskRepeatRule,
  weeklyDays: number[],
  horizon: RepeatHorizon,
): Date[] {
  const start = startOfDay(startDate);
  if (rule === 'none') {
    return [start];
  }

  if (rule === 'monthly') {
    const monthCount =
      horizon === '12m' ? 12 : horizon === '6m' ? 6 : horizon === '3m' ? 3 : 3;
    const dates: Date[] = [];
    for (let i = 0; i < monthCount; i++) {
      dates.push(addMonths(start, i));
    }
    return dates;
  }

  let endDate: Date;
  if (horizon === '2w') {
    endDate = addDays(addWeeks(start, 2), -1);
  } else if (horizon === '2m') {
    endDate = addDays(addMonths(start, 2), -1);
  } else if (horizon === '3m') {
    endDate = addDays(addMonths(start, 3), -1);
  } else {
    endDate = addDays(addMonths(start, 1), -1);
  }

  const allowedWeekdays = new Set(
    weeklyDays.length > 0 ? weeklyDays : [getDay(start)],
  );

  const dates: Date[] = [];
  let cursor = start;

  while (!isAfter(cursor, endDate) && dates.length < MAX_OCCURRENCES) {
    const dow = getDay(cursor);
    if (
      rule === 'daily' ||
      (rule === 'weekdays' && dow >= 1 && dow <= 5) ||
      (rule === 'weekly' && allowedWeekdays.has(dow))
    ) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  return dates.length > 0 ? dates : [start];
}

/**
 * Generates a lightweight unique group ID for a repeated schedule series.
 */
export function createRepeatGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
