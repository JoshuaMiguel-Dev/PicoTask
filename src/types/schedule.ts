import type { TaskRepeatRule } from './task';

/**
 * Represents a calendar day reminder / schedule stored separately from Tasks.
 * Calendar schedules do not appear in the Tasks ledger and are never marked Pending/Overdue.
 */
export interface CalendarSchedule {
  id?: number;
  title: string;
  notes: string;
  /** Local datetime string in "YYYY-MM-DDTHH:mm" format */
  dateTime: string;
  createdAt: string;
  repeatRule?: Exclude<TaskRepeatRule, 'none'>;
  repeatGroupId?: string;
  repeatLabel?: string;
}

export type NewScheduleInput = Pick<
  CalendarSchedule,
  'title' | 'notes' | 'dateTime' | 'repeatRule' | 'repeatGroupId' | 'repeatLabel'
>;

export type UpdateScheduleInput = Partial<
  Pick<CalendarSchedule, 'title' | 'notes' | 'dateTime'>
>;
