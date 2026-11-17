import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClock } from './hooks/useClock';
import DeadlineBanner from './components/DeadlineBanner';
import PwaStatusPill from './components/PwaStatusPill';
import SettingsModal, { PixelGearIcon } from './components/SettingsModal';
import StartupScreen from './components/StartupScreen';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import ClockPage from './pages/ClockPage';
import FinancePage from './pages/FinancePage';
import AboutPage from './pages/AboutPage';

type NavTab = 'tasks' | 'calendar' | 'clock' | 'finance' | 'about';

const DARK_MODE_STORAGE_KEY = 'pico_dark_mode_v1';

export default function App() {
  const [hasLaunched, setHasLaunched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('tasks');
  const [isImmersive, setIsImmersive] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
  });
  const now = useClock();

  // Apply Dark Mode attribute to <html> whenever `darkMode` changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
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
      {/* Settings Modal (Dark Mode, Fullscreen, Notifications, Reset Account) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        isImmersive={isImmersive}
        onToggleImmersive={() => void toggleImmersiveFullscreen()}
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
                className="pixel-btn bg-[#1D2B53] text-[#FFF1E8] px-2.5 py-1 font-heading text-[10px] sm:text-xs tabular-nums"
              >
                {format(now, 'HH:mm:ss')}
              </button>

              {/* Small Pixel Gear Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open Settings"
                title="Settings (Dark Mode, Reset Account)"
                className="pixel-btn min-w-8 min-h-8 p-1.5 bg-pico-cream text-pico-navy flex items-center justify-center"
              >
                <PixelGearIcon />
              </button>
            </div>
          </div>
        </header>

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
          {activeTab === 'clock' && <ClockPage />}
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
                    ? 'bg-pico-red text-[#FFF1E8]'
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
