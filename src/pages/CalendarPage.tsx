import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
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
  addTask,
  db,
  deleteTask,
  toggleTaskCompletion,
  updateTask,
} from '../db/db';
import type { NewTaskInput, Task } from '../types/task';
import { getTaskUrgency } from '../utils/dateUtils';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const QUICK_TIME_SLOTS = [
  { label: '08:00 AM', value: '08:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '01:00 PM', value: '13:00' },
  { label: '03:00 PM', value: '15:00' },
  { label: '06:00 PM', value: '18:00' },
  { label: '11:59 PM', value: '23:59' },
] as const;

const QUICK_TAGS = ['EXAM', 'PROJECT', 'LAB', 'HW', 'MEET'] as const;

function getRelativeDayLabel(target: Date, now: Date = new Date()): string {
  if (isToday(target)) return 'TODAY';
  if (isTomorrow(target)) return 'TOMORROW';
  const diff = differenceInCalendarDays(startOfDay(target), startOfDay(now));
  if (diff > 1) return `IN ${diff} DAYS`;
  if (diff === -1) return 'YESTERDAY';
  return `${Math.abs(diff)} DAYS AGO`;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isAddingForDay, setIsAddingForDay] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // --- Dedicated Calendar Day Scheduler Form State ---
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('18:00');
  const [taskNotes, setTaskNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const allTasks = useLiveQuery(
    () => db.tasks.orderBy('deadline').toArray(),
    [],
  );

  if (!allTasks) {
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

  const selectedDayTasks = getTasksForDay(selectedDate).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.deadline.localeCompare(b.deadline);
  });

  const pendingOnDay = selectedDayTasks.filter((t) => !t.completed).length;
  const doneOnDay = selectedDayTasks.filter((t) => t.completed).length;

  async function handleScheduleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanTitle = taskTitle.trim();
    if (!cleanTitle) {
      setFormError('Enter a task title to schedule on this date.');
      return;
    }

    const finalTitle = selectedTag
      ? `[${selectedTag}] ${cleanTitle}`
      : cleanTitle;
    const datePrefix = format(selectedDate, 'yyyy-MM-dd');
    const deadlineIso = `${datePrefix}T${taskTime || '18:00'}`;

    await addTask({
      title: finalTitle,
      notes: taskNotes.trim(),
      deadline: deadlineIso,
    });

    setTaskTitle('');
    setTaskNotes('');
    setSelectedTag(null);
    setFormError(null);
    setIsAddingForDay(false);
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
            className="pixel-btn min-w-10 min-h-10 px-2.5 bg-pico-cream text-pico-navy font-heading text-xs"
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
            const inCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);

            const hasOverdue = dayTasks.some(
              (t) => getTaskUrgency(t) === 'overdue',
            );
            const hasDueSoon = dayTasks.some(
              (t) => getTaskUrgency(t) === 'due-soon',
            );
            const hasActive = dayTasks.some((t) => !t.completed);

            let badgeColor = 'bg-pico-green text-pico-cream';
            if (hasOverdue) {
              badgeColor = 'bg-pico-red text-pico-cream';
            } else if (hasDueSoon) {
              badgeColor = 'bg-pico-orange text-pico-navy';
            } else if (hasActive) {
              badgeColor = 'bg-pico-blue text-pico-navy';
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  if (!inCurrentMonth) {
                    setCurrentMonth(startOfMonth(day));
                  }
                  setEditingTask(null);
                }}
                aria-label={`${format(day, 'MMMM d, yyyy')}, ${dayTasks.length} tasks`}
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

                {dayTasks.length > 0 && (
                  <div
                    className={`w-full mt-1 px-0.5 sm:px-1 py-0.5 border border-pico-navy font-heading text-[8px] sm:text-[9px] text-center tabular-nums truncate ${badgeColor}`}
                  >
                    <span>{dayTasks.length}</span>
                    <span className="hidden sm:inline">
                      {' '}
                      {dayTasks.length === 1 ? 'TSK' : 'TSKS'}
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
            <span className="inline-block w-2.5 h-2.5 bg-pico-red border border-pico-navy" />
            Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-orange border border-pico-navy" />
            Due &lt;24h
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-blue border border-pico-navy" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-pico-green border border-pico-navy" />
            All Done
          </span>
        </div>
      </section>

      {/* Tactile Selected Day Agenda & Time-Slot Scheduler */}
      <section className="space-y-3" aria-label="Selected day planner">
        {/* Tear-Off Calendar Stamp + Day Action Header */}
        <div className="pixel-card-peach p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Tear-Off Desk Calendar Stamp Tile */}
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
                  {pendingOnDay} Pending // {doneOnDay} Done
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
              setIsAddingForDay((prev) => !prev);
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

        {/* Dedicated Calendar Time-Slot Scheduler Console */}
        {isAddingForDay && (
          <form
            onSubmit={(e) => void handleScheduleSubmit(e)}
            className="pixel-card p-4 space-y-4 border-l-8 border-l-pico-red"
            aria-label={`Schedule task on ${format(selectedDate, 'MMMM d')}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-pico-navy pb-2">
              <span className="font-heading text-[10px] uppercase text-pico-navy">
                // Schedule For {format(selectedDate, 'EEE, MMM d')}
              </span>
              <span className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[9px] tabular-nums">
                DUE @ {taskTime}
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

            {/* 2. Task Title */}
            <div>
              <label
                htmlFor="cal-task-title"
                className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5"
              >
                2. Task Title *
              </label>
              <input
                id="cal-task-title"
                type="text"
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder={
                  selectedTag
                    ? `e.g. [${selectedTag}] Chapter 4 Review...`
                    : 'What is due on this day?'
                }
                maxLength={120}
                className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            {/* 3. One-Tap Time Slot Matrix */}
            <div>
              <span className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5">
                3. Pick Time Slot
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {QUICK_TIME_SLOTS.map((slot) => {
                  const isSelectedSlot = taskTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setTaskTime(slot.value)}
                      className={`pixel-btn min-h-9 px-2 py-1 font-heading text-[8px] uppercase tabular-nums ${
                        isSelectedSlot
                          ? 'bg-pico-green text-pico-cream'
                          : 'bg-pico-cream text-pico-navy'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Optional Notes */}
            <div>
              <label
                htmlFor="cal-task-notes"
                className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5"
              >
                4. Notes (Optional)
              </label>
              <input
                id="cal-task-notes"
                type="text"
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Room number, submission link, checklist..."
                maxLength={250}
                className="pixel-input w-full px-3 py-2 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            {/* Submit Row */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[9px] sm:text-[10px] uppercase"
              >
                Lock In On {format(selectedDate, 'MMM d')} @ {taskTime}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingForDay(false);
                  setFormError(null);
                }}
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
        {selectedDayTasks.length === 0 ? (
          !isAddingForDay && (
            <div className="pixel-card p-6 text-center space-y-3">
              <div className="inline-block bg-pico-peach border-2 border-pico-navy px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy">
                Open Schedule
              </div>
              <p className="text-sm sm:text-base text-pico-gray">
                No deadlines locked in for {format(selectedDate, 'EEEE, MMMM d')}.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingForDay(true)}
                className="pixel-btn min-h-10 px-4 py-1.5 bg-pico-blue text-pico-navy font-heading text-[9px] uppercase"
              >
                + Schedule Task On {format(selectedDate, 'MMM d')}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {selectedDayTasks.map((task) => {
              const parsedTime = parseISO(task.deadline);
              const timeStr = !Number.isNaN(parsedTime.getTime())
                ? format(parsedTime, 'HH:mm')
                : '--:--';

              return (
                <div key={task.id} className="flex items-stretch gap-2">
                  {/* Left Timeline Time Pillar */}
                  <div className="w-14 shrink-0 bg-pico-navy text-pico-cream border-2 border-pico-navy flex flex-col items-center justify-center p-1 font-heading text-[9px] tabular-nums">
                    <span>{timeStr}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <TaskItem
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEdit={(target) => {
                        setIsAddingForDay(false);
                        setEditingTask(target);
                      }}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
