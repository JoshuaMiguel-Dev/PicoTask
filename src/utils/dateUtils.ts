import {
  addHours,
  differenceInMinutes,
  format,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
  startOfHour,
} from 'date-fns';
import type { Task } from '../types/task';

export type TaskUrgency = 'completed' | 'overdue' | 'due-soon' | 'normal';

/**
 * Returns a default deadline string ("YYYY-MM-DDTHH:mm") set to the next upcoming hour
 * (plus 1 hour buffer) so new tasks have a sensible default deadline.
 */
export function getDefaultDeadlineInput(referenceDate: Date = new Date()): string {
  const nextSlot = addHours(startOfHour(referenceDate), 2);
  return format(nextSlot, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Formats an ISO deadline string ("YYYY-MM-DDTHH:mm") into a compact, readable label.
 * Examples:
 * - "TODAY 18:00"
 * - "TOMORROW 09:30"
 * - "NOV 21, 14:00"
 */
export function formatDeadlineDisplay(deadlineStr: string): string {
  if (!deadlineStr) return 'NO DEADLINE';
  const parsed = parseISO(deadlineStr);
  if (Number.isNaN(parsed.getTime())) return deadlineStr;

  if (isToday(parsed)) {
    return `TODAY ${format(parsed, 'HH:mm')}`;
  }
  if (isTomorrow(parsed)) {
    return `TMRW ${format(parsed, 'HH:mm')}`;
  }
  return format(parsed, 'MMM d, HH:mm').toUpperCase();
}

/**
 * Classifies a task's urgency relative to `now`:
 * - 'completed': Task is already checked off
 * - 'overdue': Deadline is in the past and task is not completed
 * - 'due-soon': Deadline is within the next 24 hours (1440 minutes)
 * - 'normal': Deadline is more than 24 hours away
 */
export function getTaskUrgency(task: Task, now: Date = new Date()): TaskUrgency {
  if (task.completed) return 'completed';
  if (!task.deadline) return 'normal';

  const deadlineDate = parseISO(task.deadline);
  if (Number.isNaN(deadlineDate.getTime())) return 'normal';

  if (isPast(deadlineDate)) {
    return 'overdue';
  }

  const minutesRemaining = differenceInMinutes(deadlineDate, now);
  if (minutesRemaining <= 24 * 60) {
    return 'due-soon';
  }

  return 'normal';
}
