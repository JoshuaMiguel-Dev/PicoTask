import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  addRepeatedSchedules,
  addSchedule,
  db,
  deleteSchedule,
  deleteScheduleSeries,
  deleteTask,
  deleteTaskSeries,
  toggleTaskCompletion,
  updateSchedule,
  updateTask,
} from '../db/db';
import type { CalendarSchedule, NewScheduleInput } from '../types/schedule';
import type { NewTaskInput, Task, TaskRepeatRule } from '../types/task';
import { formatDeadlineDisplay, getTaskUrgency } from '../utils/dateUtils';
import {
  createRepeatGroupId,
  formatRepeatLabel,
  generateRecurringDates,
  MONTHLY_HORIZONS,
  STANDARD_HORIZONS,
  type RepeatHorizon,
} from '../utils/recurrenceUtils';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import PixelTimeSlotPicker, { formatTimeSlot12h } from '../components/PixelTimeSlotPicker';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const REPEAT_OPTIONS: { id: TaskRepeatRule; label: string }[] = [
  { id: 'none', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const QUICK_TAGS = ['EXAM', 'PROJECT', 'LAB', 'HW', 'MEET'] as const;

function getRelativeDayLabel(target: Date, now: Date = new Date()): string {
  if (isToday(target)) return 'TODAY';
  if (isTomorrow(target)) return 'TOMORROW';
  const diff = differenceInCalendarDays(startOfDay(target), startOfDay(now));
  if (diff > 1) return `IN ${diff} DAYS`;
  if (diff === -1) return 'YESTERDAY';
  return `${Math.abs(diff)} DAYS AGO`;
}

interface ScheduleReminderCardProps {
  schedule: CalendarSchedule;
  onEdit: (schedule: CalendarSchedule) => void;
  onDelete: (schedule: CalendarSchedule) => void;
  onDeleteSeries?: (repeatGroupId: string) => void;
}

function ScheduleReminderCard({
  schedule,
  onEdit,
  onDelete,
  onDeleteSeries,
}: ScheduleReminderCardProps) {
  const [confirmMode, setConfirmMode] = useState<'single' | 'series' | null>(null);

  return (
    <article className="pixel-card flex items-stretch">
      <div className="w-2.5 shrink-0 border-r-2 border-pico-navy bg-pico-peach" />

      <div className="flex-1 p-3 sm:p-4 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block bg-pico-peach border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase text-pico-navy">
            Reminder
          </span>
          <span className="inline-block bg-pico-cream border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] text-pico-navy tabular-nums">
            {formatDeadlineDisplay(schedule.dateTime)}
          </span>
          {schedule.repeatLabel && (
            <span
              title={`Repeating schedule: ${schedule.repeatLabel}`}
              className="inline-block bg-pico-blue border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[8px] text-pico-navy uppercase"
            >
              ↻ {schedule.repeatLabel}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold leading-snug break-words text-pico-navy">
          {schedule.title}
        </h3>

        {schedule.notes && (
          <p className="text-sm sm:text-base text-pico-gray whitespace-pre-line break-words">
            {schedule.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t-2 border-pico-navy/20">
          {confirmMode !== null ? (
            <>
              <span className="font-heading text-[8px] uppercase text-pico-red mr-auto">
                {confirmMode === 'series' ? 'Delete whole series?' : 'Delete reminder?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirmMode === 'series' &&
                    schedule.repeatGroupId &&
                    onDeleteSeries
                  ) {
                    onDeleteSeries(schedule.repeatGroupId);
                  } else {
                    onDelete(schedule);
                  }
                  setConfirmMode(null);
                }}
                className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-red text-pico-cream font-heading text-[9px] uppercase"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEdit(schedule)}
                className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
              >
                Edit
              </button>
              {schedule.repeatGroupId && onDeleteSeries && (
                <button
                  type="button"
                  onClick={() => setConfirmMode('series')}
                  title="Delete all occurrences in this repeating schedule"
                  className="pixel-btn min-h-10 px-2.5 py-1.5 bg-pico-orange text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[8px] uppercase"
                >
                  Del Series
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmMode('single')}
                className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-peach text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[9px] uppercase"
              >
                Del
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

type DayAgendaEntry =
  | { kind: 'schedule'; timeKey: string; schedule: CalendarSchedule }
  | { kind: 'task'; timeKey: string; task: Task };

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isAddingForDay, setIsAddingForDay] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<CalendarSchedule | null>(null);

  // --- Dedicated Calendar Day Reminder Form State ---
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [repeatRule, setRepeatRule] = useState<TaskRepeatRule>('none');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>(() => [
    getDay(new Date()),
  ]);
  const [repeatHorizon, setRepeatHorizon] = useState<RepeatHorizon>('1m');
  const [showRecurringList, setShowRecurringList] = useState(false);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const allTasks = useLiveQuery(
    () => db.tasks.orderBy('deadline').toArray(),
    [],
  );
  const allSchedules = useLiveQuery(
    () => db.schedules.orderBy('dateTime').toArray(),
    [],
  );

  if (!allTasks || !allSchedules) {
    return (
      <div className="pixel-card p-6 text-center font-heading text-xs text-pico-gray">
        LOADING CALENDAR...
      </div>
    );
  }

  // Compute the 7-column calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  function getTasksForDay(day: Date): Task[] {
    return (allTasks ?? []).filter((task) => {
      if (!task.deadline) return false;
      const parsed = parseISO(task.deadline);
      return !Number.isNaN(parsed.getTime()) && isSameDay(parsed, day);
    });
  }

  function getSchedulesForDay(day: Date): CalendarSchedule[] {
    return (allSchedules ?? []).filter((item) => {
      if (!item.dateTime) return false;
      const parsed = parseISO(item.dateTime);
      return !Number.isNaN(parsed.getTime()) && isSameDay(parsed, day);
    });
  }

  const selectedDayTasks = getTasksForDay(selectedDate);
  const selectedDaySchedules = getSchedulesForDay(selectedDate);

  const dayAgendaEntries: DayAgendaEntry[] = [
    ...selectedDaySchedules.map((schedule) => ({
      kind: 'schedule' as const,
      timeKey: schedule.dateTime,
      schedule,
    })),
    ...selectedDayTasks.map((task) => ({
      kind: 'task' as const,
      timeKey: task.deadline,
      task,
    })),
  ].sort((a, b) => a.timeKey.localeCompare(b.timeKey));

  const pendingTasksOnDay = selectedDayTasks.filter((t) => !t.completed).length;

  const previewDates =
    repeatRule === 'none'
      ? [selectedDate]
      : generateRecurringDates(selectedDate, repeatRule, repeatWeekdays, repeatHorizon);

  const previewRepeatLabel =
    repeatRule === 'none' ? null : formatRepeatLabel(repeatRule, repeatWeekdays);

  // Group all repeating schedule series for the Notion-style manager drawer
  const repeatingSeries = Array.from(
    allSchedules
      .reduce((map, item) => {
        if (!item.repeatGroupId) return map;
        const existing = map.get(item.repeatGroupId);
        if (existing) {
          existing.total += 1;
        } else {
          const parsed = parseISO(item.dateTime);
          const timePart = !Number.isNaN(parsed.getTime())
            ? format(parsed, 'HH:mm')
            : '--:--';
          map.set(item.repeatGroupId, {
            groupId: item.repeatGroupId,
            title: item.title,
            repeatLabel: item.repeatLabel ?? item.repeatRule ?? 'Repeat',
            timePart,
            total: 1,
          });
        }
        return map;
      }, new Map<string, { groupId: string; title: string; repeatLabel: string; timePart: string; total: number }>())
      .values(),
  );

  function resetScheduleForm() {
    setScheduleTitle('');
    setScheduleNotes('');
    setSelectedTag(null);
    setRepeatRule('none');
    setEditingSchedule(null);
    setFormError(null);
    setIsAddingForDay(false);
  }

  function startEditingSchedule(target: CalendarSchedule) {
    setEditingTask(null);
    setEditingSchedule(target);
    setScheduleTitle(target.title);
    setScheduleNotes(target.notes);
    setSelectedTag(null);
    setRepeatRule('none');
    const timePart = target.dateTime.includes('T')
      ? target.dateTime.split('T')[1].slice(0, 5)
      : '18:00';
    setScheduleTime(timePart);
    setFormError(null);
    setIsAddingForDay(true);
  }

  function handleSelectRepeatRule(nextRule: TaskRepeatRule) {
    setRepeatRule(nextRule);
    if (nextRule === 'weekly') {
      setRepeatWeekdays((prev) =>
        prev.length > 0 ? prev : [getDay(selectedDate)],
      );
    }
    if (nextRule === 'monthly') {
      setRepeatHorizon((prev) =>
        prev === '3m' || prev === '6m' || prev === '12m' ? prev : '6m',
      );
    } else if (nextRule !== 'none') {
      setRepeatHorizon((prev) =>
        prev === '2w' || prev === '1m' || prev === '2m' || prev === '3m'
          ? prev
          : '1m',
      );
    }
  }

  function toggleRepeatWeekday(dayIndex: number) {
    setRepeatWeekdays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== dayIndex);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  }

  async function handleScheduleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanTitle = scheduleTitle.trim();
    if (!cleanTitle) {
      setFormError('Enter a reminder title to schedule on this date.');
      return;
    }

    const finalTitle = selectedTag
      ? `[${selectedTag}] ${cleanTitle}`
      : cleanTitle;
    const cleanTime = scheduleTime || '18:00';

    if (editingSchedule?.id !== undefined) {
      const datePart = editingSchedule.dateTime.includes('T')
        ? editingSchedule.dateTime.split('T')[0]
        : format(selectedDate, 'yyyy-MM-dd');
      await updateSchedule(editingSchedule.id, {
        title: finalTitle,
        notes: scheduleNotes.trim(),
        dateTime: `${datePart}T${cleanTime}`,
      });
      resetScheduleForm();
      return;
    }

    if (repeatRule === 'none') {
      const datePrefix = format(selectedDate, 'yyyy-MM-dd');
      await addSchedule({
        title: finalTitle,
        notes: scheduleNotes.trim(),
        dateTime: `${datePrefix}T${cleanTime}`,
      });
    } else {
      const groupId = createRepeatGroupId();
      const label = formatRepeatLabel(repeatRule, repeatWeekdays);
      const inputs: NewScheduleInput[] = previewDates.map((date) => ({
        title: finalTitle,
        notes: scheduleNotes.trim(),
        dateTime: `${format(date, 'yyyy-MM-dd')}T${cleanTime}`,
        repeatRule,
        repeatGroupId: groupId,
        repeatLabel: label,
      }));
      await addRepeatedSchedules(inputs);
    }

    resetScheduleForm();
  }

  async function handleUpdateTask(input: NewTaskInput) {
    if (!editingTask?.id) return;
    await updateTask(editingTask.id, input);
    setEditingTask(null);
  }

  async function handleToggleComplete(task: Task) {
    if (task.id === undefined) return;
    await toggleTaskCompletion(task.id, task.completed);
  }

  async function handleDeleteTask(task: Task) {
    if (task.id === undefined) return;
    await deleteTask(task.id);
    if (editingTask?.id === task.id) {
      setEditingTask(null);
    }
  }

  async function handleDeleteTaskSeries(repeatGroupId: string) {
    await deleteTaskSeries(repeatGroupId);
    if (editingTask?.repeatGroupId === repeatGroupId) {
      setEditingTask(null);
    }
  }

  async function handleDeleteSchedule(schedule: CalendarSchedule) {
    if (schedule.id === undefined) return;
    await deleteSchedule(schedule.id);
    if (editingSchedule?.id === schedule.id) {
      resetScheduleForm();
    }
  }

  async function handleDeleteScheduleSeries(repeatGroupId: string) {
    await deleteScheduleSeries(repeatGroupId);
    if (editingSchedule?.repeatGroupId === repeatGroupId) {
      resetScheduleForm();
    }
  }

  return (
    <div className="space-y-4">
      {/* Month Header & Navigation Controls */}
      <section className="pixel-card p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-block bg-pico-peach border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase text-pico-navy mb-1">
            Month Schedule
          </span>
          <h2 className="font-heading text-xs sm:text-sm text-pico-navy uppercase">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
            className="pixel-btn min-w-10 min-h-10 px-2.5 bg-pico-cream text-pico-navy font-heading text-xs"
          >
            &lt;
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCurrentMonth(startOfMonth(now));
              setSelectedDate(now);
            }}
            className="pixel-btn min-h-10 px-2.5 bg-pico-peach text-pico-navy font-heading text-[9px] uppercase"
          >
            Today
          </button>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            className="pixel-btn min-h-10 px-2.5 bg-pico-cream text-pico-navy font-heading text-xs"
          >
            &gt;
          </button>
        </div>
      </section>

      {/* 7-Column Month Grid */}
      <section className="pixel-card p-2 sm:p-3.5" aria-label="Monthly calendar grid">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {WEEKDAYS.map((dayName) => (
            <div
              key={dayName}
              className="bg-pico-navy text-pico-cream py-1.5 text-center font-heading text-[8px] sm:text-[9px]"
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((day) => {
            const dayTasks = getTasksForDay(day);
            const daySchedules = getSchedulesForDay(day);
            const totalItems = dayTasks.length + daySchedules.length;

            const inCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);

            const hasOverdue = dayTasks.some(
              (t) => getTaskUrgency(t) === 'overdue',
            );
            const hasDueSoon = dayTasks.some(
              (t) => getTaskUrgency(t) === 'due-soon',
            );
            const hasActiveTask = dayTasks.some((t) => !t.completed);
            const hasAllDoneTasks =
              dayTasks.length > 0 && dayTasks.every((t) => t.completed);

            let badgeColor = 'bg-pico-peach text-pico-navy';
            if (hasOverdue) {
              badgeColor = 'bg-pico-red text-pico-cream';
            } else if (hasDueSoon) {
              badgeColor = 'bg-pico-orange text-pico-navy';
            } else if (hasActiveTask) {
              badgeColor = 'bg-pico-blue text-pico-navy';
            } else if (hasAllDoneTasks && daySchedules.length === 0) {
              badgeColor = 'bg-pico-green text-pico-cream';
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  if (repeatRule === 'none') {
                    setRepeatWeekdays([getDay(day)]);
                  }
                  if (!inCurrentMonth) {
                    setCurrentMonth(startOfMonth(day));
                  }
                  setEditingTask(null);
                  setEditingSchedule(null);
                }}
                aria-label={`${format(day, 'MMMM d, yyyy')}, ${daySchedules.length} reminders, ${dayTasks.length} tasks`}
                aria-pressed={isSelected}
                className={`min-h-12 sm:min-h-15 p-1 sm:p-1.5 border-2 border-pico-navy flex flex-col justify-between items-start text-left transition-transform cursor-pointer ${
                  isSelected
                    ? 'bg-pico-blue text-pico-navy shadow-[2px_2px_0px_#1D2B53] -translate-x-0.5 -translate-y-0.5'
                    : isCurrentDay
                      ? 'bg-pico-peach text-pico-navy'
                      : inCurrentMonth
                        ? 'bg-pico-cream text-pico-navy hover:bg-pico-peach/60'
                        : 'bg-pico-cream/40 text-pico-gray opacity-55'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`font-heading text-[9px] sm:text-xs tabular-nums ${
                      isCurrentDay && !isSelected
                        ? 'underline decoration-2'
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {isCurrentDay && (
                    <span
                      className="w-1.5 h-1.5 bg-pico-red border border-pico-navy"
                      title="Today"
                    />
                  )}
                </div>

                {totalItems > 0 && (
                  <div
                    className={`w-full mt-1 px-0.5 sm:px-1 py-0.5 border border-pico-navy font-heading text-[8px] sm:text-[9px] text-center tabular-nums truncate ${badgeColor}`}
                  >
                    <span>{totalItems}</span>
                    <span className="hidden sm:inline">
                      {' '}
                      {dayTasks.length > 0 && daySchedules.length === 0
                        ? totalItems === 1
                          ? 'TSK'
                          : 'TSKS'
                        : totalItems === 1
                          ? 'REM'
                          : 'ITMS'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Legend */}
        <div className="mt-2.5 pt-2 border-t-2 border-pico-navy flex flex-wrap items-center gap-3 text-xs text-pico-navy">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-peach border border-pico-navy" />
            Reminder
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-blue border border-pico-navy" />
            Task
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-orange border border-pico-navy" />
            Due &lt;24h
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-red border border-pico-navy" />
            Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-green border border-pico-navy" />
            All Done
          </span>
        </div>
      </section>

      {/* Tactile Selected Day Agenda & Reminder Scheduler */}
      <section className="space-y-3" aria-label="Selected day planner">
        {/* Tear-Off Calendar Stamp + Day Action Header */}
        <div className="pixel-card-peach p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 sm:w-16 shrink-0 border-2 border-pico-navy bg-pico-cream shadow-[2px_2px_0px_#1D2B53] text-center overflow-hidden">
              <div className="bg-pico-red text-pico-cream py-0.5 font-heading text-[8px] uppercase border-b-2 border-pico-navy">
                {format(selectedDate, 'MMM')}
              </div>
              <div className="py-1 font-heading text-sm sm:text-base text-pico-navy tabular-nums">
                {format(selectedDate, 'dd')}
              </div>
              <div className="bg-pico-navy text-pico-cream py-0.5 font-heading text-[7px] uppercase">
                {format(selectedDate, 'EEE')}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="bg-pico-blue text-pico-navy border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase">
                  {getRelativeDayLabel(selectedDate)}
                </span>
                <span className="font-heading text-[8px] text-pico-gray uppercase">
                  {selectedDaySchedules.length}{' '}
                  {selectedDaySchedules.length === 1 ? 'Reminder' : 'Reminders'}
                  {selectedDayTasks.length > 0
                    ? ` // ${pendingTasksOnDay} Pending Task${pendingTasksOnDay === 1 ? '' : 's'}`
                    : ''}
                </span>
              </div>
              <h3 className="font-heading text-xs sm:text-sm text-pico-navy uppercase truncate">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              if (isAddingForDay) {
                resetScheduleForm();
              } else {
                setEditingSchedule(null);
                setIsAddingForDay(true);
              }
            }}
            className={`pixel-btn min-h-10 px-3 py-1.5 font-heading text-[9px] uppercase shrink-0 ${
              isAddingForDay
                ? 'bg-pico-cream text-pico-navy'
                : 'bg-pico-red text-pico-cream'
            }`}
          >
            {isAddingForDay ? '[Close]' : '+ Schedule'}
          </button>
        </div>

        {/* Dedicated Calendar Reminder Scheduler Console */}
        {isAddingForDay && (
          <form
            onSubmit={(e) => void handleScheduleSubmit(e)}
            className="pixel-card p-4 space-y-4 border-l-8 border-l-pico-red"
            aria-label={`Schedule reminder on ${format(selectedDate, 'MMMM d')}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-pico-navy pb-2">
              <span className="font-heading text-[10px] uppercase text-pico-navy">
                {editingSchedule
                  ? `// Edit Reminder (${format(selectedDate, 'EEE, MMM d')})`
                  : `// Reminder For ${format(selectedDate, 'EEE, MMM d')}`}
              </span>
              <span className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[9px] tabular-nums">
                @ {formatTimeSlot12h(scheduleTime)}
              </span>
            </div>

            {formError && (
              <div
                role="alert"
                className="bg-pico-red text-pico-cream border-2 border-pico-navy px-3 py-2 text-sm font-bold"
              >
                ! {formError}
              </div>
            )}

            {/* 1. Quick Category Tag Pills */}
            {!editingSchedule && (
              <div>
                <span className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5">
                  1. Tag (Optional)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => {
                    const isActive = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedTag((prev) => (prev === tag ? null : tag))
                        }
                        className={`pixel-btn min-h-8 px-2.5 py-1 font-heading text-[8px] uppercase ${
                          isActive
                            ? 'bg-pico-blue text-pico-navy'
                            : 'bg-pico-peach text-pico-navy'
                        }`}
                      >
                        [{tag}]
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Reminder Title */}
            <div>
              <label
                htmlFor="cal-schedule-title"
                className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5"
              >
                {editingSchedule ? 'Reminder Title *' : '2. Reminder Title *'}
              </label>
              <input
                id="cal-schedule-title"
                type="text"
                value={scheduleTitle}
                onChange={(e) => {
                  setScheduleTitle(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder={
                  selectedTag
                    ? `e.g. [${selectedTag}] Math Class / Study Block...`
                    : 'e.g., CS Lecture, Dentist, Gym...'
                }
                maxLength={120}
                className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            {/* 3. PICO-8 Roller Time Picker */}
            <div>
              <span className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5">
                {editingSchedule ? 'Time' : '3. Pick Time'}
              </span>
              <PixelTimeSlotPicker value={scheduleTime} onChange={setScheduleTime} />
            </div>

            {/* 4. Notion-Style Repeat Schedule */}
            {!editingSchedule && (
              <div className="bg-pico-peach/50 border-2 border-pico-navy p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-[9px] uppercase text-pico-navy">
                    4. Repeat Schedule
                  </span>
                  <span className="font-heading text-[8px] uppercase text-pico-gray">
                    {repeatRule === 'none' ? 'One-Time' : `↻ ${previewRepeatLabel}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {REPEAT_OPTIONS.map((opt) => {
                    const active = repeatRule === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectRepeatRule(opt.id)}
                        className={`pixel-btn min-h-8 px-2.5 py-1 font-heading text-[8px] uppercase ${
                          active
                            ? 'bg-pico-navy text-pico-cream'
                            : 'bg-pico-cream text-pico-navy'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {repeatRule === 'weekly' && (
                  <div className="space-y-1">
                    <span className="block font-heading text-[7px] uppercase text-pico-navy">
                      Repeat On Days:
                    </span>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAYS.map((dayName, idx) => {
                        const picked = repeatWeekdays.includes(idx);
                        return (
                          <button
                            key={dayName}
                            type="button"
                            onClick={() => toggleRepeatWeekday(idx)}
                            aria-pressed={picked}
                            className={`pixel-btn min-h-8 px-0.5 py-1 font-heading text-[7px] uppercase ${
                              picked
                                ? 'bg-pico-blue text-pico-navy'
                                : 'bg-pico-cream text-pico-navy'
                            }`}
                          >
                            {dayName.slice(0, 2)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {repeatRule !== 'none' && (
                  <div className="space-y-2 pt-1 border-t border-pico-navy/25">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-heading text-[7px] uppercase text-pico-navy mr-0.5">
                        For:
                      </span>
                      {(repeatRule === 'monthly'
                        ? MONTHLY_HORIZONS
                        : STANDARD_HORIZONS
                      ).map((opt) => {
                        const active = repeatHorizon === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRepeatHorizon(opt.id)}
                            className={`border-2 border-pico-navy px-2 py-0.5 font-heading text-[8px] uppercase cursor-pointer ${
                              active
                                ? 'bg-pico-green text-pico-cream'
                                : 'bg-pico-cream text-pico-navy'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="bg-pico-cream border border-pico-navy px-2 py-1 text-xs font-bold text-pico-navy">
                      ↻ {previewRepeatLabel} @ {formatTimeSlot12h(scheduleTime)} — creates{' '}
                      <span className="text-pico-red">{previewDates.length}</span>{' '}
                      {previewDates.length === 1 ? 'reminder' : 'reminders'} (
                      {format(previewDates[0], 'MMM d')} →{' '}
                      {format(previewDates[previewDates.length - 1], 'MMM d, yyyy')})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 5. Optional Notes */}
            <div>
              <label
                htmlFor="cal-schedule-notes"
                className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5"
              >
                {editingSchedule ? 'Notes (Optional)' : '5. Notes (Optional)'}
              </label>
              <input
                id="cal-schedule-notes"
                type="text"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Room number, meeting link, bring notes..."
                maxLength={250}
                className="pixel-input w-full px-3 py-2 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            {/* Submit Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[9px] sm:text-[10px] uppercase"
              >
                {editingSchedule
                  ? 'Save Reminder'
                  : repeatRule === 'none'
                    ? `Save Reminder (${format(selectedDate, 'MMM d')})`
                    : `Save ${previewDates.length} Repeating Reminders`}
              </button>
              <button
                type="button"
                onClick={resetScheduleForm}
                className="pixel-btn min-h-11 px-3 py-2 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {editingTask && (
          <TaskForm
            key={editingTask.id}
            initialTask={editingTask}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
          />
        )}

        {/* Day Timeline / Agenda List */}
        {dayAgendaEntries.length === 0 ? (
          !isAddingForDay && (
            <div className="pixel-card p-6 text-center space-y-3">
              <div className="inline-block bg-pico-peach border-2 border-pico-navy px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy">
                Open Schedule
              </div>
              <p className="text-sm sm:text-base text-pico-gray">
                No reminders or tasks for {format(selectedDate, 'EEEE, MMMM d')}.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingForDay(true)}
                className="pixel-btn min-h-10 px-4 py-1.5 bg-pico-blue text-pico-navy font-heading text-[9px] uppercase"
              >
                + Schedule Reminder On {format(selectedDate, 'MMM d')}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {dayAgendaEntries.map((entry) => {
              const parsedTime = parseISO(entry.timeKey);
              const timeStr = !Number.isNaN(parsedTime.getTime())
                ? format(parsedTime, 'HH:mm')
                : '--:--';

              return (
                <div
                  key={
                    entry.kind === 'schedule'
                      ? `sched-${entry.schedule.id}`
                      : `task-${entry.task.id}`
                  }
                  className="flex items-stretch gap-2"
                >
                  {/* Left Timeline Time Pillar */}
                  <div className="w-14 shrink-0 bg-pico-navy text-pico-cream border-2 border-pico-navy flex flex-col items-center justify-center p-1 font-heading text-[9px] tabular-nums">
                    <span>{timeStr}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {entry.kind === 'schedule' ? (
                      <ScheduleReminderCard
                        schedule={entry.schedule}
                        onEdit={startEditingSchedule}
                        onDelete={(target) => void handleDeleteSchedule(target)}
                        onDeleteSeries={(groupId) =>
                          void handleDeleteScheduleSeries(groupId)
                        }
                      />
                    ) : (
                      <TaskItem
                        task={entry.task}
                        onToggleComplete={handleToggleComplete}
                        onEdit={(target) => {
                          setIsAddingForDay(false);
                          setEditingSchedule(null);
                          setEditingTask(target);
                        }}
                        onDelete={handleDeleteTask}
                        onDeleteSeries={(groupId) =>
                          void handleDeleteTaskSeries(groupId)
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Notion-Style Active Repeating Schedules Drawer */}
      {repeatingSeries.length > 0 && (
        <section className="pixel-card p-3.5" aria-label="Repeating schedules">
          <button
            type="button"
            onClick={() => setShowRecurringList((prev) => !prev)}
            className="w-full flex items-center justify-between font-heading text-[10px] uppercase text-pico-navy cursor-pointer"
          >
            <span>↻ Repeating Schedules ({repeatingSeries.length})</span>
            <span>{showRecurringList ? '[- Hide]' : '[+ Show]'}</span>
          </button>

          {showRecurringList && (
            <div className="mt-3 pt-3 border-t-2 border-pico-navy space-y-2">
              {repeatingSeries.map((series) => (
                <div
                  key={series.groupId}
                  className="border-2 border-pico-navy bg-pico-cream px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-pico-blue border border-pico-navy px-1.5 py-0.5 font-heading text-[7px] text-pico-navy uppercase">
                        ↻ {series.repeatLabel}
                      </span>
                      <span className="bg-pico-navy text-pico-cream px-1.5 py-0.5 font-heading text-[7px] tabular-nums">
                        {series.timePart}
                      </span>
                      <span className="font-heading text-[7px] text-pico-gray uppercase">
                        {series.total} {series.total === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-pico-navy truncate">
                      {series.title}
                    </p>
                  </div>

                  {confirmDeleteGroupId === series.groupId ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteScheduleSeries(series.groupId);
                          setConfirmDeleteGroupId(null);
                        }}
                        className="pixel-btn min-h-8 px-2.5 py-1 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGroupId(null)}
                        className="pixel-btn min-h-8 px-2 py-1 bg-pico-cream text-pico-navy font-heading text-[8px] uppercase"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroupId(series.groupId)}
                      className="pixel-btn min-h-8 px-2.5 py-1 bg-pico-peach text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[8px] uppercase shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
