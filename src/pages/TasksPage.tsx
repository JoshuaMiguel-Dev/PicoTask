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
import NotificationBar from '../components/NotificationBar';
import StreakPetCard from '../components/StreakPetCard';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';

type FilterMode = 'all' | 'active' | 'completed';

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /**
   * Reactive IndexedDB query:
   * Automatically re-runs whenever any task is added, edited, toggled, or deleted.
   * Ordered by `deadline` ascending (earliest deadline at the top).
   */
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

  // Sort active tasks first (by earliest deadline), then completed tasks (by deadline)
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

  return (
    <div className="space-y-5">
      {/* Phase 2: Streak Companion Cat */}
      <StreakPetCard variant="full" />

      {/* Phase 4: Real OS Notification Permission & Test Bar */}
      <NotificationBar />

      {/* Top Bar: Task Counter & "+ New Task" Trigger */}
      <section className="pixel-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xs sm:text-sm text-pico-navy uppercase">
            Task Ledger
          </h2>
          <p className="text-sm sm:text-base text-pico-gray mt-0.5">
            {activeCount} pending // {completedCount} completed
          </p>
        </div>

        {!isAdding && !editingTask && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[10px] sm:text-xs uppercase"
          >
            + New Task
          </button>
        )}
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

      {/* Filter Tabs (All / Active / Done) */}
      <div
        role="group"
        aria-label="Filter tasks by status"
        className="grid grid-cols-3 gap-2"
      >
        {(['all', 'active', 'completed'] as const).map((mode) => {
          const isSelected = filter === mode;
          const count =
            mode === 'all'
              ? allTasks.length
              : mode === 'active'
                ? activeCount
                : completedCount;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`pixel-btn min-h-11 px-2 py-2 font-heading text-[10px] uppercase flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-pico-blue text-pico-navy'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              <span>{mode}</span>
              <span className="bg-pico-navy text-pico-cream px-1.5 py-0.5 text-[9px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List or Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="pixel-card p-8 text-center space-y-3">
          <div className="inline-block bg-pico-peach border-2 border-pico-navy px-2.5 py-1 font-heading text-[10px] uppercase text-pico-navy">
            {filter === 'all' ? 'Ledger Empty' : `No ${filter} tasks`}
          </div>
          <p className="text-base text-pico-gray max-w-sm mx-auto">
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
