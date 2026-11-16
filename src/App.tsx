import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClock } from './hooks/useClock';
import DeadlineBanner from './components/DeadlineBanner';
import PwaStatusPill from './components/PwaStatusPill';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import ClockPage from './pages/ClockPage';
import FinancePage from './pages/FinancePage';

type NavTab = 'tasks' | 'calendar' | 'clock' | 'finance';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('tasks');
  const now = useClock();

  // Keyboard shortcuts: Alt+1 (Tasks), Alt+2 (Calendar), Alt+3 (Clock), Alt+4 (Finance)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('tasks');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveTab('calendar');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveTab('clock');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveTab('finance');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-pico-cream text-pico-navy">
      {/* Accessible Skip-to-Content Link for Keyboard Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 pixel-btn bg-pico-blue text-pico-navy px-3 py-2 font-heading text-xs uppercase"
      >
        Skip to main content
      </a>

      {/* Top Hardware Header */}
      <header className="border-b-4 border-pico-navy bg-pico-peach px-3 sm:px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Simple 8-bit square indicator */}
            <span
              className="inline-block w-3 h-3 shrink-0 bg-pico-red border-2 border-pico-navy"
              aria-hidden="true"
            />
            <h1 className="font-heading text-xs sm:text-sm tracking-tight text-pico-navy truncate">
              PICO TASK
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PwaStatusPill />

            {/* Live Compact Clock Readout (clicking switches to Desk Clock / Timer tab) */}
            <button
              type="button"
              onClick={() => setActiveTab('clock')}
              aria-label="Open full-screen desk clock and focus timer"
              className="pixel-btn bg-pico-navy text-pico-cream px-2 sm:px-2.5 py-1.5 font-heading text-[10px] sm:text-xs tabular-nums"
            >
              {format(now, 'HH:mm:ss')}
            </button>
          </div>
        </div>
      </header>

      {/* Global In-App Deadline Reminder Banner (Overdue / Due within 24h) */}
      <DeadlineBanner
        now={now}
        onViewTasks={() => setActiveTab('tasks')}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-5 pb-24 focus:outline-none"
      >
        {activeTab === 'tasks' && <TasksPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'clock' && <ClockPage />}
        {activeTab === 'finance' && <FinancePage />}
      </main>

      {/* Mobile-First Bottom Navigation Bar (44px+ minimum touch targets) */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="fixed bottom-0 inset-x-0 bg-pico-peach border-t-4 border-pico-navy z-20"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-2 p-2">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            title="Tasks (Alt+1)"
            className={`pixel-btn min-h-12 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'tasks'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            [Tasks]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
            title="Calendar (Alt+2)"
            className={`pixel-btn min-h-12 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'calendar'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            [Cal]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clock')}
            aria-current={activeTab === 'clock' ? 'page' : undefined}
            title="Focus Timer & Clock (Alt+3)"
            className={`pixel-btn min-h-12 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'clock'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            [Clock]
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            aria-current={activeTab === 'finance' ? 'page' : undefined}
            title="Finance Tracker (Alt+4)"
            className={`pixel-btn min-h-12 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'finance'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            [Cash]
          </button>
        </div>
      </nav>
    </div>
  );
}
