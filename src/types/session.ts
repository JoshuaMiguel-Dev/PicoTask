/**
 * Represents a saved focus/study timer session stored in IndexedDB.
 */
export interface FocusSession {
  /** Auto-incremented primary key (`++id`) */
  id?: number;
  /** What the user was working on (e.g., "Algorithms HW 3", "System Design Prep") */
  title: string;
  /** Elapsed time focused in seconds */
  durationSeconds: number;
  /** ISO 8601 timestamp when the session was saved */
  completedAt: string;
}
