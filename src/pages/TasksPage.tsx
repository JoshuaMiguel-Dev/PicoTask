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
    <div className="space-y-3.5">
      {/* Slim Streak Pet Companion Bar (No startup popup) */}
      <StreakPetCard />

      {/* Action Bar: Filter Tabs + "+ New" Trigger in one clean row */}
      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Filter tasks"
          className="inline-flex gap-1.5"
        >
          {(['all', 'active', 'completed'] as const).map((mode) => {
            const isSelected = filter === mode;
            const count =
              mode === 'all'
                ? allTasks.length
                : mode === 'active'
                  ? activeCount
                  : completedCount;

            const label =
              mode === 'all' ? 'All' : mode === 'active' ? 'To-Do' : 'Done';

            return (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`pixel-btn min-h-10 px-2.5 py-1.5 font-heading text-[9px] uppercase flex items-center gap-1 ${
                  isSelected
                    ? 'bg-pico-blue text-pico-navy'
                    : 'bg-pico-cream text-pico-navy'
                }`}
              >
                <span>{label}</span>
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {(notifStatus === 'default' || notifStatus === 'granted') && (
            <button
              type="button"
              onClick={() => void handleAlertToggle()}
              title={
                notifStatus === 'granted'
                  ? 'Send a test notification'
                  : 'Enable OS deadline alerts'
              }
              className="pixel-btn min-h-10 px-2.5 py-1.5 bg-pico-peach text-pico-navy font-heading text-[8px] uppercase"
            >
              {notifStatus === 'granted' ? 'Bell:ON' : 'Bell:OFF'}
            </button>
          )}

          {!isAdding && !editingTask && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-red text-pico-cream font-heading text-[9px] sm:text-[10px] uppercase"
            >
              + New
            </button>
          )}
        </div>
      </div>

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

      {/* Task List or Calm Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="pixel-card p-6 text-center space-y-2">
          <p className="font-heading text-[10px] uppercase text-pico-navy">
            {filter === 'all' ? 'No Tasks Yet' : `No ${filter} tasks`}
          </p>
          <p className="text-sm sm:text-base text-pico-gray">
            {filter === 'all'
              ? 'Tap "+ New" above to add your first task.'
              : `Nothing in "${filter}" right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
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
