import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isSameMonth, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { addFinanceEntry, db, deleteFinanceEntry } from '../db/db';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type FinanceCategory,
  type TransactionType,
} from '../types/finance';
import PixelDateTimePicker from '../components/PixelDateTimePicker';

// Official PICO-8 colors mapped to expense categories for the Recharts bar chart
const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  Food: '#FF004D',
  Transport: '#29ADFF',
  School: '#FFA300',
  Tech: '#008751',
  Fun: '#1D2B53',
  Allowance: '#008751',
  'Part-Time': '#29ADFF',
  Other: '#5F574F',
};

/**
 * Custom 9x9 8-bit Pixel Philippine Peso (₱) glyph.
 *
 * Why a custom SVG glyph?
 * Google Fonts' `'Press Start 2P'` does not include the Unicode `U+20B1` (`₱`) character,
 * causing browsers to fall back to a tiny, thin system monospace font.
 * Drawing `₱` on a 9x9 crisp pixel grid (`fill="currentColor"`) makes it match the exact
 * cap-height and stroke weight of `'Press Start 2P'` numerals!
 */
function PixelPeso({ className = 'w-[0.95em] h-[0.95em]' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`inline-block align-[-0.06em] mr-0.5 shrink-0 ${className}`}
    >
      {/* Vertical Stem */}
      <rect x="2" y="0" width="2" height="9" fill="currentColor" />
      {/* Top & Bottom of P Bowl */}
      <rect x="4" y="0" width="3" height="1" fill="currentColor" />
      <rect x="4" y="5" width="3" height="1" fill="currentColor" />
      {/* Right Curve of P Bowl */}
      <rect x="6" y="1" width="2" height="4" fill="currentColor" />
      {/* Double Horizontal Peso Strike Bars */}
      <rect x="0" y="1" width="9" height="1" fill="currentColor" />
      <rect x="0" y="3" width="9" height="1" fill="currentColor" />
    </svg>
  );
}

function PesoAmount({
  value,
  prefix = '',
}: {
  value: number;
  prefix?: '' | '+' | '-';
}) {
  const sign = prefix || (value < 0 ? '-' : '');
  const formattedNumber = Math.abs(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className="inline-flex items-baseline tabular-nums">
      {sign && <span>{sign}</span>}
      <PixelPeso />
      <span>{formattedNumber}</span>
    </span>
  );
}

export default function FinancePage() {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<FinanceCategory>('Food');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entries = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().toArray(),
    [],
  );

  if (!entries) {
    return (
      <div className="pixel-card p-6 text-center font-heading text-xs text-pico-gray">
        LOADING LEDGER...
      </div>
    );
  }

  const now = new Date();

  // Compute all-time balance and current-month totals
  const totalBalance = entries.reduce(
    (sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount),
    0,
  );

  const currentMonthEntries = entries.filter((item) => {
    const parsed = parseISO(item.date);
    return !Number.isNaN(parsed.getTime()) && isSameMonth(parsed, now);
  });

  const monthlyIncome = currentMonthEntries
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const monthlyExpense = currentMonthEntries
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);

  // Aggregate current month's expenses by category for Recharts
  const categoryTotalsMap = new Map<FinanceCategory, number>();
  for (const item of currentMonthEntries) {
    if (item.type !== 'expense') continue;
    const prev = categoryTotalsMap.get(item.category) ?? 0;
    categoryTotalsMap.set(item.category, Math.round((prev + item.amount) * 100) / 100);
  }

  const chartData = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    amount: categoryTotalsMap.get(cat) ?? 0,
    color: CATEGORY_COLORS[cat],
  })).filter((row) => row.amount > 0);

  function handleTypeSwitch(nextType: TransactionType) {
    setType(nextType);
    setCategory(nextType === 'expense' ? 'Food' : 'Allowance');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedAmount = Number.parseFloat(amountStr);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    if (!date) {
      setError('Please pick a date.');
      return;
    }

    setError(null);
    await addFinanceEntry({
      type,
      category,
      amount: parsedAmount,
      date,
      note,
    });

    setAmountStr('');
    setNote('');
    setIsAdding(false);
  }

  const availableCategories =
    type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-5">
      {/* Top Header & "+ Add Entry" Button */}
      <section className="pixel-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block bg-pico-peach border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase text-pico-navy mb-1">
            {format(now, 'MMMM yyyy')}
          </span>
          <h2 className="font-heading text-xs sm:text-sm text-pico-navy uppercase">
            Finance Tracker
          </h2>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[10px] sm:text-xs uppercase"
          >
            + Add Entry
          </button>
        )}
      </section>

      {/* Collapsible Add Income / Expense Form */}
      {isAdding && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="pixel-card-peach p-4 space-y-4"
          aria-label="Add finance entry"
        >
          <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
            <h3 className="font-heading text-xs uppercase text-pico-navy">
              + New Transaction
            </h3>
          </div>

          {error && (
            <div
              role="alert"
              className="bg-pico-red text-pico-cream border-2 border-pico-navy px-3 py-2 text-sm font-bold"
            >
              ! {error}
            </div>
          )}

          {/* Type Toggle: Expense vs Income */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSwitch('expense')}
              className={`pixel-btn min-h-11 font-heading text-[10px] uppercase ${
                type === 'expense'
                  ? 'bg-pico-red text-pico-cream'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              [-] Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('income')}
              className={`pixel-btn min-h-11 font-heading text-[10px] uppercase ${
                type === 'income'
                  ? 'bg-pico-green text-pico-cream'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              [+] Income
            </button>
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="finance-amount"
                className="flex items-center gap-1 font-heading text-[10px] uppercase text-pico-navy mb-1.5"
              >
                <span>Amount (</span>
                <PixelPeso className="w-3 h-3" />
                <span>PHP) *</span>
              </label>
              <input
                id="finance-amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy tabular-nums"
              />
            </div>

            <div>
              <span className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5">
                Date *
              </span>
              <PixelDateTimePicker
                dateOnly
                value={date}
                onChange={(nextDate) => setDate(nextDate)}
              />
            </div>
          </div>

          {/* Category Picker Buttons */}
          <div>
            <span className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5">
              Category
            </span>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`pixel-btn min-h-10 px-3 py-1.5 font-heading text-[9px] uppercase ${
                    category === cat
                      ? 'bg-pico-blue text-pico-navy'
                      : 'bg-pico-cream text-pico-navy'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label
              htmlFor="finance-note"
              className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5"
            >
              Note (Optional)
            </label>
            <input
              id="finance-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Lunch with study group, jeepney fare..."
              maxLength={80}
              className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
            />
          </div>

          {/* Submit / Cancel */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="pixel-btn min-h-11 px-4 py-2 bg-pico-red text-pico-cream font-heading text-[10px] uppercase"
            >
              Save Entry
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setError(null);
              }}
              className="pixel-btn min-h-11 px-4 py-2 bg-pico-cream text-pico-navy font-heading text-[10px] uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 3-Metric Summary Bar (Total Balance, Month Income, Month Spend) */}
      <section
        aria-label="Finance summary"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <div className="pixel-card p-3.5">
          <span className="font-heading text-[9px] uppercase text-pico-gray block">
            Net Balance
          </span>
          <p
            className={`font-heading text-base sm:text-lg mt-1.5 tabular-nums ${
              totalBalance >= 0 ? 'text-pico-navy' : 'text-pico-red'
            }`}
          >
            <PesoAmount value={totalBalance} />
          </p>
        </div>

        <div className="pixel-card p-3.5">
          <span className="font-heading text-[9px] uppercase text-pico-gray block">
            {format(now, 'MMM')} Income
          </span>
          <p className="font-heading text-base sm:text-lg mt-1.5 text-pico-green tabular-nums">
            <PesoAmount value={monthlyIncome} prefix="+" />
          </p>
        </div>

        <div className="pixel-card p-3.5">
          <span className="font-heading text-[9px] uppercase text-pico-gray block">
            {format(now, 'MMM')} Spent
          </span>
          <p className="font-heading text-base sm:text-lg mt-1.5 text-pico-red tabular-nums">
            <PesoAmount value={monthlyExpense} prefix="-" />
          </p>
        </div>
      </section>

      {/* Recharts Monthly Expense Breakdown by Category */}
      <section className="pixel-card p-4 space-y-3" aria-label="Monthly spending by category">
        <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
          <h3 className="font-heading text-xs uppercase text-pico-navy">
            // {format(now, 'MMM')} Spending By Category
          </h3>
        </div>

        {chartData.length === 0 ? (
          <p className="py-6 text-center text-base text-pico-gray">
            No expenses logged in {format(now, 'MMMM')} yet. Add an expense to see your category chart.
          </p>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
              >
                <XAxis
                  dataKey="category"
                  stroke="var(--border-pixel)"
                  tick={{ fill: 'var(--ink-primary)', fontSize: 12, fontFamily: 'Pixelify Sans' }}
                />
                <YAxis
                  stroke="var(--border-pixel)"
                  tick={{ fill: 'var(--ink-primary)', fontSize: 12, fontFamily: 'Pixelify Sans' }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-panel)', opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    border: '3px solid var(--border-pixel)',
                    borderRadius: '0px',
                    boxShadow: '3px 3px 0px var(--shadow-pixel)',
                    fontFamily: 'Pixelify Sans',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--ink-primary)',
                  }}
                  formatter={(val: unknown) => [
                    `PHP ${Number(val ?? 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    'Spent',
                  ]}
                />
                <Bar dataKey="amount" stroke="#1D2B53" strokeWidth={2} isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Transaction History List */}
      <section className="pixel-card p-4 space-y-3" aria-label="Recent transactions">
        <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
          <h3 className="font-heading text-xs uppercase text-pico-navy">
            // Recent Entries
          </h3>
          <span className="bg-pico-peach border-2 border-pico-navy px-2 py-0.5 font-heading text-[9px] text-pico-navy">
            {entries.length} TOTAL
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="py-4 text-center text-base text-pico-gray">
            No transactions recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((item) => (
              <div
                key={item.id}
                className="border-2 border-pico-navy bg-pico-cream p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span
                      className={`border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase ${
                        item.type === 'income'
                          ? 'bg-pico-green text-pico-cream'
                          : 'bg-pico-peach text-pico-navy'
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="font-heading text-[9px] text-pico-gray tabular-nums">
                      {item.date}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-sm sm:text-base font-bold text-pico-navy truncate">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`font-heading text-xs sm:text-sm tabular-nums ${
                      item.type === 'income' ? 'text-pico-green' : 'text-pico-red'
                    }`}
                  >
                    <PesoAmount
                      value={item.amount}
                      prefix={item.type === 'income' ? '+' : '-'}
                    />
                  </span>

                  <button
                    type="button"
                    aria-label={`Delete ${item.category} entry of ${item.amount} pesos`}
                    onClick={() => {
                      if (item.id !== undefined) {
                        void deleteFinanceEntry(item.id);
                      }
                    }}
                    className="pixel-btn min-h-9 px-2 py-1 bg-pico-peach text-pico-navy hover:bg-pico-red hover:text-pico-cream font-heading text-[8px] uppercase"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
