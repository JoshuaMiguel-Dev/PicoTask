import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClock } from './hooks/useClock';
import DeadlineBanner from './components/DeadlineBanner';
import PwaStatusPill from './components/PwaStatusPill';
import StartupScreen from './components/StartupScreen';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import ClockPage from './pages/ClockPage';
import FinancePage from './pages/FinancePage';

type NavTab = 'tasks' | 'calendar' | 'clock' | 'finance';

export default function App() {
  const [hasLaunched, setHasLaunched] = useState<boolean>(false);
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

  // Show First-Time Startup Menu or Returning User Boot Loading Screen first
  if (!hasLaunched) {
    return <StartupScreen onFinish={() => setHasLaunched(true)} />;
  }

  return (
    <div className="h-dvh w-screen overflow-hidden bg-pico-navy/10 flex justify-center">
      {/*
        Fixed-Frame PICO-8 Console Shell (`h-dvh overflow-hidden flex flex-col`):
        - Top `<header>` and Bottom `<nav>` are locked (`shrink-0`) so they never move or bounce.
        - Inner `<main>` has its own dedicated internal scrollbar (`overflow-y-auto pico-scroll`).
      */}
      <div className="animate-app-reveal h-dvh w-full max-w-3xl flex flex-col overflow-hidden bg-pico-cream text-pico-navy border-4 border-pico-navy">
        {/* Locked Top PICO-8 Hardware Console Header */}
        <header className="shrink-0 border-b-4 border-pico-navy bg-pico-peach px-3 sm:px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                className="w-6 h-6 shrink-0"
              />
              <h1 className="font-heading text-xs sm:text-sm tracking-tight text-pico-navy truncate">
                PicoTask
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <PwaStatusPill />

              <button
                type="button"
                onClick={() => setActiveTab('clock')}
                aria-label="Open full-screen desk clock and focus timer"
                className="pixel-btn bg-pico-navy text-pico-cream px-2.5 py-1 font-heading text-[10px] sm:text-xs tabular-nums"
              >
                {format(now, 'HH:mm:ss')}
              </button>
            </div>
          </div>
        </header>

        {/* Global In-App Deadline Reminder Banner (Locked below header when active) */}
        <div className="shrink-0">
          <DeadlineBanner
            now={now}
            onViewTasks={() => setActiveTab('tasks')}
          />
        </div>

        {/* Dedicated Internal Scrollable Viewport (`overflow-y-auto overscroll-contain`) */}
        <main
          key={activeTab}
          id="main-content"
          tabIndex={-1}
          className="pico-scroll animate-app-reveal flex-1 min-h-0 w-full overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 focus:outline-none"
        >
          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'calendar' && <CalendarPage />}
          {activeTab === 'clock' && <ClockPage />}
          {activeTab === 'finance' && <FinancePage />}
        </main>

        {/* Locked Bottom Navigation Bar (Part of the console frame, never shifts) */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="shrink-0 w-full bg-pico-peach border-t-4 border-pico-navy z-20"
        >
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2">
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
              [Tasks]
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
              [Cal]
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
              [Clock]
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
              [Cash]
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
