import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addTask,
  db,
  deleteTask,
  toggleTaskCompletion,
  updateTask,
} from '../db/db';
import type { NewTaskInput, Task } from '../types/task';
import {
  getNotificationStatus,
  requestOsNotificationPermission,
  sendOsNotification,
  type NotificationStatus,
} from '../utils/notificationUtils';
import StreakPetCard from '../components/StreakPetCard';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

type FilterMode = 'all' | 'active' | 'completed';

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(() =>
    getNotificationStatus(),
  );

  const allTasks = useLiveQuery(
    () => db.tasks.orderBy('deadline').toArray(),
    [],
  );

  if (!allTasks) {
    return (
      <div className="pixel-card p-6 text-center font-heading text-xs text-pico-gray">
        LOADING TASKS...
      </div>
    );
  }

  // Sort active tasks first (by earliest deadline), then completed tasks
  const sortedTasks = [...allTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.deadline.localeCompare(b.deadline);
  });

  const filteredTasks = sortedTasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const activeCount = allTasks.filter((t) => !t.completed).length;
  const completedCount = allTasks.filter((t) => t.completed).length;

  async function handleCreateTask(input: NewTaskInput) {
    await addTask(input);
    setIsAdding(false);
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

  async function handleAlertToggle() {
    if (notifStatus === 'default') {
      const next = await requestOsNotificationPermission();
      setNotifStatus(next);
      if (next === 'granted') {
        await sendOsNotification('PICO TASK // Alerts On', {
          body: 'You will be notified when deadlines or timers finish.',
        });
      }
    } else if (notifStatus === 'granted') {
      await sendOsNotification('PICO TASK // Test Alert', {
        body: 'Notifications are working!',
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Streak Companion Console Card */}
      <StreakPetCard />

      {/* 2. Unified Task Ledger Control Deck */}
      <section className="pixel-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xs sm:text-sm text-pico-navy uppercase">
              Task Ledger
            </h2>
            <p className="text-xs sm:text-sm text-pico-gray">
              {activeCount} pending // {completedCount} completed
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(notifStatus === 'default' || notifStatus === 'granted') && (
              <button
                type="button"
                onClick={() => void handleAlertToggle()}
                title={
                  notifStatus === 'granted'
                    ? 'Send a test OS notification'
                    : 'Enable OS deadline alerts'
                }
                className={`pixel-btn min-h-10 px-2.5 py-1.5 font-heading text-[8px] uppercase ${
                  notifStatus === 'granted'
                    ? 'bg-pico-green text-pico-cream'
                    : 'bg-pico-peach text-pico-navy'
                }`}
              >
                {notifStatus === 'granted' ? 'Alerts:ON' : 'Alerts:OFF'}
              </button>
            )}

            {!isAdding && !editingTask && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="pixel-btn min-h-10 px-3.5 py-1.5 bg-pico-red text-pico-cream font-heading text-[9px] sm:text-[10px] uppercase"
              >
                + New Task
              </button>
            )}
          </div>
        </div>

        {/* Integrated Filter Tabs inside the Ledger Control Deck */}
        <div
          role="group"
          aria-label="Filter tasks by status"
          className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t-2 border-pico-navy"
        >
          {(['all', 'active', 'completed'] as const).map((mode) => {
            const isSelected = filter === mode;
            const count =
              mode === 'all'
                ? allTasks.length
                : mode === 'active'
                  ? activeCount
                  : completedCount;

            const shortLabel =
              mode === 'all' ? 'All' : mode === 'active' ? 'To-Do' : 'Done';

            return (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`pixel-btn min-h-10 px-1.5 sm:px-2 py-1.5 font-heading text-[8px] sm:text-[9px] uppercase flex items-center justify-center gap-1 min-w-0 ${
                  isSelected
                    ? 'bg-pico-blue text-pico-navy'
                    : 'bg-pico-cream text-pico-navy'
                }`}
              >
                <span className="truncate">{shortLabel}</span>
                <span className="bg-pico-navy text-pico-cream px-1 py-0.5 text-[7px] sm:text-[8px] shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Collapsible Add / Edit Form Panel */}
      {isAdding && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setIsAdding(false)}
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

      {/* Task List or Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="pixel-card p-7 text-center space-y-2.5">
          <div className="inline-block bg-pico-peach border-2 border-pico-navy px-2.5 py-1 font-heading text-[9px] uppercase text-pico-navy">
            {filter === 'all' ? 'Ledger Empty' : `No ${filter} tasks`}
          </div>
          <p className="text-sm sm:text-base text-pico-gray max-w-sm mx-auto">
            {filter === 'all'
              ? 'No tasks scheduled yet. Press "+ New Task" above to log your first deadline.'
              : `You have no ${filter} tasks right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={(target) => {
                setIsAdding(false);
                setEditingTask(target);
              }}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
