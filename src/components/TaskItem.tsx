import type { Task } from '../types/task';
import { formatDeadlineDisplay, getTaskUrgency } from '../utils/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDeleteSeries?: (repeatGroupId: string) => void;
}

export default function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onDeleteSeries,
}: TaskItemProps) {
  const urgency = getTaskUrgency(task);

  // Left accent bar & badge colors driven by task urgency
  const statusStyles = {
    completed: {
      bar: 'bg-pico-green',
      badgeBg: 'bg-pico-green text-pico-cream',
      badgeLabel: 'DONE',
    },
    overdue: {
      bar: 'bg-pico-red',
      badgeBg: 'bg-pico-red text-pico-cream',
      badgeLabel: 'OVERDUE',
    },
    'due-soon': {
      bar: 'bg-pico-orange',
      badgeBg: 'bg-pico-orange text-pico-navy',
      badgeLabel: 'DUE SOON',
    },
    normal: {
      bar: 'bg-pico-blue',
      badgeBg: 'bg-pico-peach text-pico-navy',
      badgeLabel: 'SCHEDULED',
    },
  }[urgency];

  return (
    <article
      className={`pixel-card flex items-stretch transition-opacity ${
        task.completed ? 'opacity-75' : ''
      }`}
    >
      {/* Left 8px hardware urgency indicator strip */}
      <div className={`w-2.5 shrink-0 border-r-2 border-pico-navy ${statusStyles.bar}`} />

      <div className="flex-1 p-3 sm:p-4 flex flex-col gap-2 min-w-0">
        {/* Top Row: Checkbox + Title + Urgency Badge */}
        <div className="flex items-start gap-3">
          {/* 44x44px minimum touch target wrapper for the pixel checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={task.completed}
            aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
            onClick={() => onToggleComplete(task)}
            className="pixel-btn min-w-11 min-h-11 shrink-0 flex items-center justify-center bg-pico-cream text-pico-navy"
          >
            <span
              className={`w-6 h-6 border-2 border-pico-navy flex items-center justify-center font-heading text-xs ${
                task.completed ? 'bg-pico-green text-pico-cream' : 'bg-white'
              }`}
            >
              {task.completed ? 'X' : ''}
            </span>
          </button>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span
                className={`inline-block border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase ${statusStyles.badgeBg}`}
              >
                {statusStyles.badgeLabel}
              </span>
              <span className="inline-block bg-pico-cream border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] text-pico-navy tabular-nums">
                {formatDeadlineDisplay(task.deadline)}
              </span>
              {task.repeatLabel && (
                <span
                  title={`Repeating schedule: ${task.repeatLabel}`}
                  className="inline-block bg-pico-blue border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[8px] text-pico-navy uppercase"
                >
                  ↻ {task.repeatLabel}
                </span>
              )}
            </div>

            <h3
              className={`text-lg font-bold leading-snug break-words ${
                task.completed ? 'line-through text-pico-gray' : 'text-pico-navy'
              }`}
            >
              {task.title}
            </h3>

            {task.notes && (
              <p className="mt-1 text-sm sm:text-base text-pico-gray whitespace-pre-line break-words">
                {task.notes}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Action Row: Edit, Delete & Optional Delete Series */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t-2 border-pico-navy/20">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
          >
            Edit
          </button>
          {task.repeatGroupId && onDeleteSeries && (
            <button
              type="button"
              onClick={() => onDeleteSeries(task.repeatGroupId!)}
              title="Delete all occurrences in this repeating schedule"
              className="pixel-btn min-h-10 px-2.5 py-1.5 bg-pico-orange text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[8px] uppercase"
            >
              Del Series
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-peach text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[9px] uppercase"
          >
            Del
          </button>
        </div>
      </div>
    </article>
  );
}
