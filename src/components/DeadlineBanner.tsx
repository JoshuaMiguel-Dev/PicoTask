import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isSameDay, parseISO } from 'date-fns';
import { db } from '../db/db';
import { formatDeadlineDisplay, getTaskUrgency } from '../utils/dateUtils';
import { getNotificationStatus, sendOsNotification } from '../utils/notificationUtils';

interface DeadlineBannerProps {
  /** Current live date from the parent clock hook so overdue & schedule checks update while open */
  now: Date;
  /** Callback to switch to the Tasks tab when the user clicks [View] on a task alert */
  onViewTasks: () => void;
  /** Callback to switch to the Calendar tab when the user clicks [View] on a schedule reminder */
  onViewCalendar?: () => void;
}

const NOTIFIED_OVERDUE_KEY = 'pico_notified_overdue_ids_v1';
const NOTIFIED_SCHEDULE_KEY = 'pico_notified_schedule_ids_v1';
const SCHEDULE_BANNER_WINDOW_MS = 60 * 60 * 1000; // Show active day reminder banner for up to 60m after trigger

/**
 * In-app reminder banner + OS notification dispatcher for:
 * 1. Overdue or due-soon (within 24h) Tasks.
 * 2. Today's Calendar Schedule Reminders whose scheduled time has arrived.
 */
export default function DeadlineBanner({
  now,
  onViewTasks,
  onViewCalendar,
}: DeadlineBannerProps) {
  const [dismissedTaskSig, setDismissedTaskSig] = useState<string | null>(null);
  const [dismissedScheduleSig, setDismissedScheduleSig] = useState<string | null>(null);

  const inFlightTaskIdsRef = useRef<Set<number>>(new Set());
  const inFlightScheduleKeysRef = useRef<Set<string>>(new Set());

  const incompleteTasks = useLiveQuery(
    () =>
      db.tasks
        .orderBy('deadline')
        .filter((task) => !task.completed)
        .toArray(),
    [],
  );

  const allSchedules = useLiveQuery(
    () => db.schedules.orderBy('dateTime').toArray(),
    [],
  );

  const overdueTasks = (incompleteTasks ?? []).filter(
    (task) => getTaskUrgency(task, now) === 'overdue',
  );
  const dueSoonTasks = (incompleteTasks ?? []).filter(
    (task) => getTaskUrgency(task, now) === 'due-soon',
  );

  // Calendar schedule reminders for today whose time has arrived
  const dueTodaySchedules = (allSchedules ?? []).filter((item) => {
    if (!item.dateTime) return false;
    const parsed = parseISO(item.dateTime);
    if (Number.isNaN(parsed.getTime())) return false;
    return isSameDay(parsed, now) && parsed.getTime() <= now.getTime();
  });

  // Recent reminders (within 60 mins of scheduled time) for the in-app banner
  const activeBannerSchedules = dueTodaySchedules.filter((item) => {
    const parsed = parseISO(item.dateTime);
    return now.getTime() - parsed.getTime() <= SCHEDULE_BANNER_WINDOW_MS;
  });

  // Trigger a real OS notification once per newly overdue task (only marks notified if delivery succeeded)
  useEffect(() => {
    if (overdueTasks.length === 0) return;
    if (getNotificationStatus() !== 'granted') return;

    const notifiedRaw = localStorage.getItem(NOTIFIED_OVERDUE_KEY);
    const notifiedIds = new Set<number>(
      notifiedRaw ? (JSON.parse(notifiedRaw) as number[]) : [],
    );

    for (const task of overdueTasks) {
      const taskId = task.id;
      if (
        taskId === undefined ||
        notifiedIds.has(taskId) ||
        inFlightTaskIdsRef.current.has(taskId)
      ) {
        continue;
      }

      inFlightTaskIdsRef.current.add(taskId);
      void sendOsNotification(`Task Overdue: ${task.title}`, {
        body: `Deadline was ${formatDeadlineDisplay(task.deadline)}`,
        tag: `overdue-task-${taskId}`,
        renotify: true,
        vibrate: [150, 75, 150],
      }).then((sent) => {
        inFlightTaskIdsRef.current.delete(taskId);
        if (!sent) return;
        const latestRaw = localStorage.getItem(NOTIFIED_OVERDUE_KEY);
        const latestIds = new Set<number>(
          latestRaw ? (JSON.parse(latestRaw) as number[]) : [],
        );
        latestIds.add(taskId);
        localStorage.setItem(
          NOTIFIED_OVERDUE_KEY,
          JSON.stringify(Array.from(latestIds)),
        );
      });
    }
  }, [overdueTasks]);

  // Trigger a real OS notification once per Calendar Schedule Reminder when its time arrives
  useEffect(() => {
    if (dueTodaySchedules.length === 0) return;
    if (getNotificationStatus() !== 'granted') return;

    const notifiedRaw = localStorage.getItem(NOTIFIED_SCHEDULE_KEY);
    const notifiedKeys = new Set<string>(
      notifiedRaw ? (JSON.parse(notifiedRaw) as string[]) : [],
    );

    for (const item of dueTodaySchedules) {
      if (item.id === undefined) continue;
      const key = `${item.id}@${item.dateTime}`;
      if (notifiedKeys.has(key) || inFlightScheduleKeysRef.current.has(key)) {
        continue;
      }

      inFlightScheduleKeysRef.current.add(key);
      const parsed = parseISO(item.dateTime);
      const timeStr = !Number.isNaN(parsed.getTime())
        ? format(parsed, 'hh:mm a')
        : '';

      void sendOsNotification(`PicoTask // Reminder: ${item.title}`, {
        body: item.notes
          ? `${timeStr} — ${item.notes}`
          : `Scheduled for ${timeStr || 'now'}`,
        tag: `schedule-reminder-${item.id}`,
        requireInteraction: true,
        renotify: true,
        vibrate: [150, 75, 150],
      }).then((sent) => {
        inFlightScheduleKeysRef.current.delete(key);
        if (!sent) return;
        const latestRaw = localStorage.getItem(NOTIFIED_SCHEDULE_KEY);
        const latestKeys = new Set<string>(
          latestRaw ? (JSON.parse(latestRaw) as string[]) : [],
        );
        latestKeys.add(key);
        localStorage.setItem(
          NOTIFIED_SCHEDULE_KEY,
          JSON.stringify(Array.from(latestKeys).slice(-200)),
        );
      });
    }
  }, [dueTodaySchedules]);

  const taskSignature = [
    ...overdueTasks.map((t) => `ov:${t.id}`),
    ...dueSoonTasks.map((t) => `ds:${t.id}`),
  ].join('|');

  const scheduleSignature = activeBannerSchedules
    .map((s) => `sc:${s.id}@${s.dateTime}`)
    .join('|');

  const showTaskBanner =
    (overdueTasks.length > 0 || dueSoonTasks.length > 0) &&
    dismissedTaskSig !== taskSignature;

  const showScheduleBanner =
    activeBannerSchedules.length > 0 &&
    dismissedScheduleSig !== scheduleSignature;

  if (!showTaskBanner && !showScheduleBanner) {
    return null;
  }

  const hasOverdue = overdueTasks.length > 0;
  const primaryTask = hasOverdue ? overdueTasks[0] : dueSoonTasks[0];
  const primarySchedule = activeBannerSchedules[activeBannerSchedules.length - 1];

  return (
    <div className="flex flex-col">
      {/* Calendar Schedule Reminder Banner */}
      {showScheduleBanner && primarySchedule && (
        <aside
          role="status"
          aria-live="polite"
          className="border-b-4 border-pico-navy px-4 py-2.5 bg-pico-blue text-pico-navy"
        >
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                className="w-5 h-5 shrink-0 border border-pico-navy bg-pico-cream"
              />
              <span className="shrink-0 border-2 border-pico-navy bg-pico-cream text-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase">
                Schedule
              </span>

              <p className="text-sm sm:text-base font-bold truncate">
                <span>{primarySchedule.title}</span>
                <span className="font-normal opacity-95">
                  {' '}
                  — {formatDeadlineDisplay(primarySchedule.dateTime)}
                  {activeBannerSchedules.length > 1
                    ? ` (+${activeBannerSchedules.length - 1} more)`
                    : ''}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onViewCalendar ?? onViewTasks}
                className="pixel-btn min-h-9 px-2.5 py-1 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
              >
                View
              </button>
              <button
                type="button"
                aria-label="Dismiss schedule reminder"
                onClick={() => setDismissedScheduleSig(scheduleSignature)}
                className="pixel-btn min-h-9 px-2.5 py-1 bg-pico-peach text-pico-navy font-heading text-[9px] uppercase"
              >
                X
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Task Overdue / Due-Soon Banner */}
      {showTaskBanner && (
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
                  <span>{dueSoonTasks.length} due within 24h</span>
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
                aria-label="Dismiss task reminder"
                onClick={() => setDismissedTaskSig(taskSignature)}
                className="pixel-btn min-h-9 px-2.5 py-1 bg-pico-peach text-pico-navy font-heading text-[9px] uppercase"
              >
                X
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
