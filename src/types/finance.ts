export type TransactionType = 'income' | 'expense';

export type FinanceCategory =
  | 'Food'
  | 'Transport'
  | 'School'
  | 'Tech'
  | 'Fun'
  | 'Allowance'
  | 'Part-Time'
  | 'Other';

export const EXPENSE_CATEGORIES: FinanceCategory[] = [
  'Food',
  'Transport',
  'School',
  'Tech',
  'Fun',
  'Other',
];

export const INCOME_CATEGORIES: FinanceCategory[] = [
  'Allowance',
  'Part-Time',
  'Other',
];

/**
 * Represents a single income or expense entry stored in IndexedDB (`db.transactions`).
 */
export interface FinanceEntry {
  /** Auto-incremented primary key (`++id`) */
  id?: number;
  /** 'income' adds to balance; 'expense' subtracts from balance */
  type: TransactionType;
  /** Category label for grouping and charting */
  category: FinanceCategory;
  /** Positive numeric amount (e.g. 12.50) */
  amount: number;
  /** Calendar date of the entry in "YYYY-MM-DD" format */
  date: string;
  /** Optional short note (e.g. "Campus coffee", "Bus pass") */
  note: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

export type NewFinanceEntryInput = Omit<FinanceEntry, 'id' | 'createdAt'>;
