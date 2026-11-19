import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClock } from './hooks/useClock';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useExternalTimerWindow } from './hooks/useExternalTimerWindow';
import { useWakeLock } from './hooks/useWakeLock';
import DeadlineBanner from './components/DeadlineBanner';
import FloatingTimerOverlay from './components/FloatingTimerOverlay';
import PwaStatusPill from './components/PwaStatusPill';
import SettingsModal, { PixelGearIcon } from './components/SettingsModal';
import StartupScreen from './components/StartupScreen';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import ClockPage from './pages/ClockPage';
import FinancePage from './pages/FinancePage';
import AboutPage from './pages/AboutPage';

type NavTab = 'tasks' | 'calendar' | 'clock' | 'finance' | 'about';

export default function App() {
  const [hasLaunched, setHasLaunched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('tasks');
  const [isImmersive, setIsImmersive] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const now = useClock();
  const timer = useFocusTimer();
  const externalTimer = useExternalTimerWindow(timer);
  useWakeLock(timer.isRunning);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('pico_dark_mode_v1');

    function handleFsChange() {
      setIsImmersive(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  async function toggleImmersiveFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if unsupported
    }
  }

  // Keyboard shortcuts: Alt+1..5
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
      } else if (e.key === '5') {
        e.preventDefault();
        setActiveTab('about');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!hasLaunched) {
    return <StartupScreen onFinish={() => setHasLaunched(true)} />;
  }

  return (
    <div className="fixed inset-0 w-full h-dvh overflow-hidden bg-pico-navy/10 flex justify-center">
      {/* Settings Modal (Fullscreen, Notifications, Reset Account) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isImmersive={isImmersive}
        onToggleImmersive={() => void toggleImmersiveFullscreen()}
      />

      {/* External Floating Timer Fallback Portal (Desktop Document PiP / Popup) */}
      <FloatingTimerOverlay
        timer={timer}
        external={externalTimer}
        onJumpToClock={() => {
          timer.setViewMode('timer');
          setActiveTab('clock');
        }}
      />

      <div className="animate-app-reveal h-full w-full max-w-3xl flex flex-col overflow-hidden bg-pico-cream text-pico-navy border-4 border-pico-navy">
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

              {/* Small Pixel Gear Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open Settings"
                title="Settings (Fullscreen, Notifications, Reset Account)"
                className="pixel-btn min-w-8 min-h-8 p-1.5 bg-pico-cream text-pico-navy flex items-center justify-center"
              >
                <PixelGearIcon />
              </button>
            </div>
          </div>
        </header>

        {/* In-App Timer Complete Alert Banner (works even without OS permission) */}
        {timer.completionNotice && (
          <aside
            role="alert"
            aria-live="assertive"
            className="shrink-0 border-b-4 border-pico-navy bg-pico-green text-pico-cream px-3 sm:px-4 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src="/icon.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 shrink-0 border border-pico-navy bg-pico-cream"
                />
                <span className="shrink-0 border-2 border-pico-navy bg-pico-cream text-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase">
                  Done
                </span>
                <p className="text-sm sm:text-base font-bold truncate">
                  {timer.completionNotice}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void timer.saveSession()}
                  className="pixel-btn min-h-8 px-2.5 py-1 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    timer.dismissCompletionNotice();
                    timer.setViewMode('timer');
                    setActiveTab('clock');
                  }}
                  className="pixel-btn min-h-8 px-2.5 py-1 bg-pico-cream text-pico-navy font-heading text-[8px] uppercase"
                >
                  Clock
                </button>
                <button
                  type="button"
                  aria-label="Dismiss timer alert"
                  onClick={timer.dismissCompletionNotice}
                  className="pixel-btn min-h-8 px-2 py-1 bg-pico-peach text-pico-navy font-heading text-[8px] uppercase"
                >
                  X
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Global In-App Deadline Reminder Banner */}
        <div className="shrink-0">
          <DeadlineBanner
            now={now}
            onViewTasks={() => setActiveTab('tasks')}
          />
        </div>

        {/* Dedicated Internal Scrollable Viewport */}
        <main
          key={activeTab}
          id="main-content"
          tabIndex={-1}
          className="pico-scroll animate-app-reveal flex-1 min-h-0 w-full px-3 sm:px-4 py-3.5 focus:outline-none"
        >
          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'calendar' && <CalendarPage />}
          {activeTab === 'clock' && <ClockPage timer={timer} external={externalTimer} />}
          {activeTab === 'finance' && <FinancePage />}
          {activeTab === 'about' && <AboutPage />}
        </main>

        {/* Locked Bottom Navigation Bar (5 Tabs: Tasks, Cal, Clock, Cash, About) */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="shrink-0 w-full bg-pico-peach border-t-4 border-pico-navy z-20"
        >
          <div className="grid grid-cols-5 gap-1 sm:gap-2 p-1.5 sm:p-2">
            {(
              [
                { id: 'tasks', label: 'Tasks' },
                { id: 'calendar', label: 'Cal' },
                { id: 'clock', label: 'Clock' },
                { id: 'finance', label: 'Cash' },
                { id: 'about', label: 'About' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`pixel-btn min-h-11 px-1 flex items-center justify-center font-heading text-[8px] sm:text-xs uppercase truncate ${
                  activeTab === tab.id
                    ? 'bg-pico-red text-pico-cream'
                    : 'bg-pico-cream text-pico-navy'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
