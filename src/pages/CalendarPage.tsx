import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
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

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isAddingForDay, setIsAddingForDay] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Compute the 7-column calendar grid from the start of the first week to the end of the last week
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Helper to get tasks falling on a specific calendar date
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

  // Pre-fill new task deadline to 18:00 on the currently selected calendar date
  const selectedDayDefaultDeadline = `${format(selectedDate, 'yyyy-MM-dd')}T18:00`;

  async function handleCreateTaskForSelectedDay(input: NewTaskInput) {
    await addTask(input);
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
    <div className="space-y-5">
      {/* Month Header & Navigation Controls */}
      <section className="pixel-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block bg-pico-peach border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase text-pico-navy mb-1">
            Month Schedule
          </span>
          <h2 className="font-heading text-sm sm:text-base text-pico-navy uppercase">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
            className="pixel-btn min-w-11 min-h-11 px-3 bg-pico-cream text-pico-navy font-heading text-xs"
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
            className="pixel-btn min-h-11 px-3 bg-pico-peach text-pico-navy font-heading text-[10px] uppercase"
          >
            Today
          </button>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            className="pixel-btn min-w-11 min-h-11 px-3 bg-pico-cream text-pico-navy font-heading text-xs"
          >
            &gt;
          </button>
        </div>
      </section>

      {/* 7-Column Month Grid */}
      <section className="pixel-card p-2 sm:p-4" aria-label="Monthly calendar grid">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {WEEKDAYS.map((dayName) => (
            <div
              key={dayName}
              className="bg-pico-navy text-pico-cream py-1.5 text-center font-heading text-[8px] sm:text-[10px]"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((day) => {
            const dayTasks = getTasksForDay(day);
            const inCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);

            // Determine highest priority dot color for the day's tasks
            const hasOverdue = dayTasks.some((t) => getTaskUrgency(t) === 'overdue');
            const hasDueSoon = dayTasks.some((t) => getTaskUrgency(t) === 'due-soon');
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
                  setIsAddingForDay(false);
                  setEditingTask(null);
                }}
                aria-label={`${format(day, 'MMMM d, yyyy')}, ${dayTasks.length} tasks`}
                aria-pressed={isSelected}
                className={`min-h-12 sm:min-h-16 p-1 sm:p-1.5 border-2 border-pico-navy flex flex-col justify-between items-start text-left transition-transform cursor-pointer ${
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
                      isCurrentDay && !isSelected ? 'underline decoration-2' : ''
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

                {/* Task count pill inside day cell */}
                {dayTasks.length > 0 && (
                  <div
                    className={`w-full mt-1 px-1 py-0.5 border border-pico-navy font-heading text-[8px] sm:text-[9px] text-center tabular-nums ${badgeColor}`}
                  >
                    {dayTasks.length} {dayTasks.length === 1 ? 'TSK' : 'TSKS'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-2.5 border-t-2 border-pico-navy flex flex-wrap items-center gap-3 text-xs text-pico-navy">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-pico-red border border-pico-navy" />
            Overdue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-pico-orange border border-pico-navy" />
            Due &lt;24h
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-pico-blue border border-pico-navy" />
            Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-pico-green border border-pico-navy" />
            All Done
          </span>
        </div>
      </section>

      {/* Selected Day Task Details Panel */}
      <section className="space-y-3" aria-label="Tasks for selected date">
        <div className="pixel-card-peach p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-heading text-[9px] uppercase text-pico-gray block">
              Selected Date
            </span>
            <h3 className="font-heading text-xs sm:text-sm text-pico-navy uppercase mt-0.5">
              {format(selectedDate, 'EEE, MMM d, yyyy')} ({selectedDayTasks.length})
            </h3>
          </div>

          {!isAddingForDay && !editingTask && (
            <button
              type="button"
              onClick={() => setIsAddingForDay(true)}
              className="pixel-btn min-h-11 px-3 py-1.5 bg-pico-red text-pico-cream font-heading text-[9px] sm:text-[10px] uppercase"
            >
              + Add On {format(selectedDate, 'MMM d')}
            </button>
          )}
        </div>

        {isAddingForDay && (
          <TaskForm
            key={`new-${selectedDayDefaultDeadline}`}
            defaultDeadline={selectedDayDefaultDeadline}
            onSubmit={handleCreateTaskForSelectedDay}
            onCancel={() => setIsAddingForDay(false)}
          />
        )}

        {editingTask && (
          <TaskForm
            key={editingTask.id}
            initialTask={editingTask}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
          />
        )}

        {selectedDayTasks.length === 0 ? (
          <div className="pixel-card p-6 text-center">
            <p className="text-base text-pico-gray">
              No deadlines scheduled for {format(selectedDate, 'MMMM d')}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={(target) => {
                  setIsAddingForDay(false);
                  setEditingTask(target);
                }}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
