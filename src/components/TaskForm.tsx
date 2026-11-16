import { useState, type FormEvent } from 'react';
import type { NewTaskInput, Task } from '../types/task';
import { getDefaultDeadlineInput } from '../utils/dateUtils';

interface TaskFormProps {
  /** If provided, the form operates in "Edit Mode" for this task */
  initialTask?: Task;
  /** Optional pre-filled deadline ("YYYY-MM-DDTHH:mm") when creating a task from a calendar day */
  defaultDeadline?: string;
  /** Called when the user submits valid task data */
  onSubmit: (data: NewTaskInput) => Promise<void>;
  /** Optional cancel handler (shown when editing or closing the form panel) */
  onCancel?: () => void;
}

export default function TaskForm({
  initialTask,
  defaultDeadline,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [notes, setNotes] = useState(initialTask?.notes ?? '');
  const [deadline, setDeadline] = useState(
    initialTask?.deadline || defaultDeadline || getDefaultDeadlineInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(initialTask?.id);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }
    if (!deadline) {
      setError('Please pick a deadline date and time.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        notes: notes.trim(),
        deadline,
      });

      // Reset fields only when adding a brand new task
      if (!isEditing) {
        setTitle('');
        setNotes('');
        setDeadline(getDefaultDeadlineInput());
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pixel-card-peach p-4 space-y-4"
      aria-label={isEditing ? 'Edit task form' : 'New task form'}
    >
      <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
        <h2 className="font-heading text-xs uppercase text-pico-navy">
          {isEditing ? '// Edit Task' : '+ New Task'}
        </h2>
        {isEditing && (
          <span className="bg-pico-blue text-pico-navy border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase">
            ID #{initialTask?.id}
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-pico-red text-pico-cream border-2 border-pico-navy px-3 py-2 text-sm font-bold"
        >
          ! {error}
        </div>
      )}

      {/* Title Input */}
      <div>
        <label
          htmlFor={isEditing ? `task-title-${initialTask?.id}` : 'task-title-new'}
          className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5"
        >
          Title *
        </label>
        <input
          id={isEditing ? `task-title-${initialTask?.id}` : 'task-title-new'}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g., Submit OS lab report"
          maxLength={120}
          className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
        />
      </div>

      {/* Deadline Input */}
      <div>
        <label
          htmlFor={isEditing ? `task-deadline-${initialTask?.id}` : 'task-deadline-new'}
          className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5"
        >
          Deadline *
        </label>
        <input
          id={isEditing ? `task-deadline-${initialTask?.id}` : 'task-deadline-new'}
          type="datetime-local"
          value={deadline}
          onChange={(e) => {
            setDeadline(e.target.value);
            if (error) setError(null);
          }}
          className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy font-body"
        />
      </div>

      {/* Notes Input */}
      <div>
        <label
          htmlFor={isEditing ? `task-notes-${initialTask?.id}` : 'task-notes-new'}
          className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5"
        >
          Notes (Optional)
        </label>
        <textarea
          id={isEditing ? `task-notes-${initialTask?.id}` : 'task-notes-new'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Room 302, include test screenshots..."
          maxLength={400}
          className="pixel-input w-full px-3 py-2 text-base text-pico-navy placeholder:text-pico-gray resize-y"
        />
      </div>

      {/* Action Buttons (44px+ touch targets) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[10px] sm:text-xs uppercase disabled:opacity-50"
        >
          {isEditing ? 'Save Changes' : 'Add Task'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="pixel-btn min-h-11 px-4 py-2 bg-pico-cream text-pico-navy font-heading text-[10px] sm:text-xs uppercase"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
