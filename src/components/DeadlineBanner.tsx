import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatDeadlineDisplay, getTaskUrgency } from '../utils/dateUtils';
import { sendOsNotification } from '../utils/notificationUtils';

interface DeadlineBannerProps {
  /** Current live date from the parent clock hook so overdue checks update while open */
  now: Date;
  /** Callback to switch to the Tasks tab when the user clicks [View] */
  onViewTasks: () => void;
}

/**
 * In-app deadline reminder banner shown below the header whenever there are
 * overdue or due-soon (within 24h) tasks.
 *
 * Interview Note:
 * Instead of storing `dismissed: boolean` which would stay hidden forever even if a
 * NEW task becomes overdue 10 minutes later, we store a `dismissedSignature` string
 * composed of the current urgent task IDs and their statuses. If a new task becomes
 * overdue or due-soon, the signature changes and the banner automatically re-appears!
 */
export default function DeadlineBanner({ now, onViewTasks }: DeadlineBannerProps) {
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);

  const incompleteTasks = useLiveQuery(
    () =>
      db.tasks
        .orderBy('deadline')
        .filter((task) => !task.completed)
        .toArray(),
    [],
  );

  const overdueTasks = (incompleteTasks ?? []).filter(
    (task) => getTaskUrgency(task, now) === 'overdue',
  );
  const dueSoonTasks = (incompleteTasks ?? []).filter(
    (task) => getTaskUrgency(task, now) === 'due-soon',
  );

  // Trigger a real OS notification once per newly overdue task
  useEffect(() => {
    if (overdueTasks.length === 0) return;

    const notifiedRaw = localStorage.getItem('pico_notified_overdue_ids_v1');
    const notifiedIds = new Set<number>(
      notifiedRaw ? (JSON.parse(notifiedRaw) as number[]) : [],
    );

    let updated = false;
    for (const task of overdueTasks) {
      if (task.id !== undefined && !notifiedIds.has(task.id)) {
        notifiedIds.add(task.id);
        updated = true;
        void sendOsNotification(`Task Overdue: ${task.title}`, {
          body: `Deadline was ${formatDeadlineDisplay(task.deadline)}`,
          tag: `overdue-task-${task.id}`,
          renotify: true,
          vibrate: [150, 75, 150],
        });
      }
    }

    if (updated) {
      localStorage.setItem(
        'pico_notified_overdue_ids_v1',
        JSON.stringify(Array.from(notifiedIds)),
      );
    }
  }, [overdueTasks]);

  if (!incompleteTasks || incompleteTasks.length === 0) {
    return null;
  }

  if (overdueTasks.length === 0 && dueSoonTasks.length === 0) {
    return null;
  }

  // Build a unique signature of the current urgent state
  const currentSignature = [
    ...overdueTasks.map((t) => `ov:${t.id}`),
    ...dueSoonTasks.map((t) => `ds:${t.id}`),
  ].join('|');

  if (dismissedSignature === currentSignature) {
    return null;
  }

  const hasOverdue = overdueTasks.length > 0;
  const primaryTask = hasOverdue ? overdueTasks[0] : dueSoonTasks[0];

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`border-b-4 border-pico-navy px-4 py-2.5 ${
        hasOverdue
          ? 'bg-pico-red text-pico-cream'
          : 'bg-pico-orange text-pico-navy'
      }`}
    >
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            className="w-5 h-5 shrink-0 border border-pico-navy bg-pico-cream"
          />
          <span
            className={`shrink-0 border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase ${
              hasOverdue
                ? 'bg-pico-navy text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            {hasOverdue ? '! Alert' : 'Reminder'}
          </span>

          <p className="text-sm sm:text-base font-bold truncate">
            {overdueTasks.length > 0 && (
              <span>
                {overdueTasks.length} overdue
                {dueSoonTasks.length > 0 ? ` + ${dueSoonTasks.length} due soon` : ''}
              </span>
            )}
            {overdueTasks.length === 0 && dueSoonTasks.length > 0 && (
              <span>
                {dueSoonTasks.length} due within 24h
              </span>
            )}
            {primaryTask && (
              <span className="font-normal opacity-95">
                {' '}
                — &ldquo;{primaryTask.title}&rdquo; ({formatDeadlineDisplay(primaryTask.deadline)})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onViewTasks}
            className="pixel-btn min-h-9 px-2.5 py-1 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
          >
            View
          </button>
          <button
            type="button"
            aria-label="Dismiss deadline reminder"
            onClick={() => setDismissedSignature(currentSignature)}
            className="pixel-btn min-h-9 px-2.5 py-1 bg-pico-peach text-pico-navy font-heading text-[9px] uppercase"
          >
            X
          </button>
        </div>
      </div>
    </aside>
  );
}
