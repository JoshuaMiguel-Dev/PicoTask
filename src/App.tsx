import { useEffect, useState } from 'react';
import { useClock } from './hooks/useClock';
import DeadlineBanner from './components/DeadlineBanner';
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
      {/* Global In-App Deadline Reminder Banner (Only appears if a task is Overdue / Due <24h) */}
      <DeadlineBanner
        now={now}
        onViewTasks={() => setActiveTab('tasks')}
      />

      {/* Main Content Area (No top title bar — starts directly with clean page content) */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 pt-4 pb-24 focus:outline-none"
      >
        {activeTab === 'tasks' && <TasksPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'clock' && <ClockPage />}
        {activeTab === 'finance' && <FinancePage />}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="fixed bottom-0 inset-x-0 bg-pico-peach border-t-4 border-pico-navy z-20"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-2 p-2">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            className={`pixel-btn min-h-11 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'tasks'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            Tasks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
            className={`pixel-btn min-h-11 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'calendar'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            Cal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clock')}
            aria-current={activeTab === 'clock' ? 'page' : undefined}
            className={`pixel-btn min-h-11 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'clock'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            Clock
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            aria-current={activeTab === 'finance' ? 'page' : undefined}
            className={`pixel-btn min-h-11 flex items-center justify-center font-heading text-[9px] sm:text-xs uppercase ${
              activeTab === 'finance'
                ? 'bg-pico-red text-pico-cream'
                : 'bg-pico-cream text-pico-navy'
            }`}
          >
            Cash
          </button>
        </div>
      </nav>
    </div>
  );
}
