import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { addFocusSession, db, deleteFocusSession } from '../db/db';
import { useClock } from '../hooks/useClock';
import { sendOsNotification } from '../utils/notificationUtils';
import FlipDigitCard from '../components/FlipDigitCard';

type ClockViewMode = 'clock' | 'timer';

function splitSecondsToHMS(totalSeconds: number): {
  hrs: string;
  min: string;
  sec: string;
} {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return {
    hrs: String(h).padStart(2, '0'),
    min: String(m).padStart(2, '0'),
    sec: String(s).padStart(2, '0'),
  };
}

function formatDurationBadge(totalSeconds: number): string {
  const { hrs, min, sec } = splitSecondsToHMS(totalSeconds);
  if (hrs !== '00') {
    return `${hrs}:${min}:${sec}`;
  }
  return `${min}:${sec}`;
}

export default function ClockPage() {
  const now = useClock();
  const fullscreenOverlayRef = useRef<HTMLDivElement | null>(null);

  // Default to calm Desk Clock; one tap switches to Focus Timer
  const [viewMode, setViewMode] = useState<ClockViewMode>('clock');

  // --- FULL SCREEN HORIZONTAL MODE ---
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [forceRotate90, setForceRotate90] = useState<boolean>(false);

  // --- FOCUS TIMER STATE ---
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // --- WALL CLOCK STATE ---
  const [use24Hour, setUse24Hour] = useState<boolean>(() => {
    return localStorage.getItem('pico_clock_24h') !== 'false';
  });

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (targetSeconds !== null && next >= targetSeconds) {
          setIsRunning(false);
          void sendOsNotification('PICO TIMER // Session Complete!', {
            body: `${Math.round(targetSeconds / 60)}m focus countdown finished. Save your session!`,
            tag: 'pico-timer-complete',
          });
          return targetSeconds;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, targetSeconds]);

  useEffect(() => {
    if (!isFullScreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
        setForceRotate90(false);
      }
    }
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
        setForceRotate90(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullScreen]);

  async function enterFullScreen() {
    setIsFullScreen(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (
        'orientation' in screen &&
        'lock' in
          (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })
      ) {
        await (
          screen.orientation as unknown as { lock: (o: string) => Promise<void> }
        ).lock('landscape');
      }
    } catch {
      // Fallback: React Portal `fixed inset-0 z-[9999]` covers the full viewport
    }
  }

  async function exitFullScreen() {
    setIsFullScreen(false);
    setForceRotate90(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  }

  const savedSessions = useLiveQuery(
    () => db.sessions.orderBy('completedAt').reverse().toArray(),
    [],
  );

  function toggleHourFormat() {
    setUse24Hour((prev) => {
      const next = !prev;
      localStorage.setItem('pico_clock_24h', String(next));
      return next;
    });
  }

  function handleSelectPreset(minutes: number | null) {
    setIsRunning(false);
    setElapsedSeconds(0);
    setTargetSeconds(minutes !== null ? minutes * 60 : null);
  }

  function handleResetTimer() {
    setIsRunning(false);
    setElapsedSeconds(0);
  }

  async function handleSaveSession() {
    if (elapsedSeconds <= 0) return;
    const finalTitle = sessionTitle.trim() || 'Focus Session';
    await addFocusSession(finalTitle, elapsedSeconds);
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionTitle('');
    setShowHistory(true);
  }

  const displaySeconds =
    targetSeconds !== null
      ? Math.max(0, targetSeconds - elapsedSeconds)
      : elapsedSeconds;

  const timerDigits = splitSecondsToHMS(displaySeconds);

  const clockHoursStr = use24Hour ? format(now, 'HH') : format(now, 'hh');
  const clockMinutesStr = format(now, 'mm');
  const clockSecondsStr = format(now, 'ss');
  const amPmStr = format(now, 'aa').toUpperCase();

  // Only show the Save Session input box when the timer is paused with time on it
  const canSaveNow = viewMode === 'timer' && !isRunning && elapsedSeconds > 0;

  return (
    <>
      {/* FULL-SCREEN HORIZONTAL OVERLAY (Portal to body) */}
      {isFullScreen &&
        createPortal(
          <div
            ref={fullscreenOverlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Full screen horizontal clock and timer"
            className="fixed top-0 left-0 right-0 bottom-0 w-screen h-dvh z-[9999] m-0 bg-pico-navy flex items-center justify-center overflow-hidden"
          >
            <div
              className={`flex flex-col justify-between p-4 sm:p-8 bg-pico-peach border-4 border-pico-navy box-border ${
                forceRotate90
                  ? 'w-[100dvh] h-[100dvw] rotate-90 shrink-0'
                  : 'w-full h-full'
              }`}
            >
              {/* Minimal Top Bar */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading text-xs sm:text-sm text-pico-navy uppercase truncate">
                  {viewMode === 'clock'
                    ? format(now, 'EEEE // MMM d').toUpperCase()
                    : sessionTitle.trim() || 'FOCUS TIMER'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForceRotate90((prev) => !prev)}
                    className="pixel-btn min-h-10 px-2.5 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase sm:hidden"
                  >
                    {forceRotate90 ? 'Unrotate' : 'Rotate 90°'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exitFullScreen()}
                    className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-red text-pico-cream font-heading text-[9px] uppercase"
                  >
                    [Exit]
                  </button>
                </div>
              </div>

              {/* Giant Horizontal Split-Flap Cards */}
              <div className="flex-1 flex items-center justify-center my-2">
                <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8">
                  <FlipDigitCard
                    size="fullscreen"
                    value={viewMode === 'timer' ? timerDigits.hrs : clockHoursStr}
                    label="HRS"
                  />
                  <div className="flex flex-col gap-4 pb-6" aria-hidden="true">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-pico-navy" />
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-pico-navy" />
                  </div>
                  <FlipDigitCard
                    size="fullscreen"
                    value={viewMode === 'timer' ? timerDigits.min : clockMinutesStr}
                    label="MIN"
                  />
                  <div className="flex flex-col gap-4 pb-6" aria-hidden="true">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-pico-navy" />
                    <span className="w-3 h-3 sm:w-4 sm:h-4 bg-pico-navy" />
                  </div>
                  <FlipDigitCard
                    size="fullscreen"
                    value={viewMode === 'timer' ? timerDigits.sec : clockSecondsStr}
                    label="SEC"
                    accent={viewMode === 'timer' && isRunning ? 'red' : 'blue'}
                  />
                </div>
              </div>

              {/* Minimal Bottom Bar */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode(viewMode === 'timer' ? 'clock' : 'timer')
                  }
                  className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
                >
                  Mode: {viewMode === 'clock' ? 'Clock' : 'Timer'}
                </button>

                {viewMode === 'timer' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRunning((prev) => !prev)}
                      className={`pixel-btn min-h-10 px-4 py-1.5 font-heading text-[10px] uppercase ${
                        isRunning
                          ? 'bg-pico-orange text-pico-navy'
                          : 'bg-pico-green text-pico-cream'
                      }`}
                    >
                      {isRunning ? 'Pause' : elapsedSeconds > 0 ? 'Resume' : 'Start'}
                    </button>
                    {elapsedSeconds > 0 && (
                      <button
                        type="button"
                        onClick={handleResetTimer}
                        className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[10px] uppercase"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={toggleHourFormat}
                    className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
                  >
                    [{use24Hour ? '24H' : '12H'}]
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* CALM, MINIMAL CLOCK / TIMER VIEW */}
      <div className="space-y-4">
        {/* Clean 2-Button Mode Bar + Fullscreen Trigger */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('clock')}
              className={`pixel-btn min-h-10 px-3.5 py-1.5 font-heading text-[10px] uppercase ${
                viewMode === 'clock'
                  ? 'bg-pico-red text-pico-cream'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              Clock
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timer')}
              className={`pixel-btn min-h-10 px-3.5 py-1.5 font-heading text-[10px] uppercase ${
                viewMode === 'timer'
                  ? 'bg-pico-red text-pico-cream'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              Timer
            </button>
          </div>

          <button
            type="button"
            onClick={() => void enterFullScreen()}
            className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-blue text-pico-navy font-heading text-[10px] uppercase"
          >
            [Full Screen]
          </button>
        </div>

        {/* Centerpiece Split-Flap Housing */}
        <section
          aria-label={viewMode === 'clock' ? 'Digital desk clock' : 'Focus timer'}
          className="pixel-card-peach p-6 sm:p-10 flex flex-col items-center justify-center"
        >
          {/* Subtle Top Subtitle */}
          <div className="w-full flex items-center justify-between mb-6">
            <span className="font-heading text-[10px] text-pico-navy uppercase">
              {viewMode === 'clock'
                ? format(now, 'EEEE, MMM d').toUpperCase()
                : targetSeconds === null
                  ? 'STOPWATCH'
                  : `${Math.round(targetSeconds / 60)}M TIMER`}
            </span>

            {viewMode === 'clock' ? (
              <button
                type="button"
                onClick={toggleHourFormat}
                className="border-2 border-pico-navy bg-pico-cream px-2 py-0.5 font-heading text-[9px] text-pico-navy uppercase cursor-pointer"
              >
                {use24Hour ? '24H' : amPmStr}
              </button>
            ) : (
              <span
                className={`border-2 border-pico-navy px-2 py-0.5 font-heading text-[9px] uppercase ${
                  isRunning
                    ? 'bg-pico-green text-pico-cream'
                    : 'bg-pico-cream text-pico-navy'
                }`}
              >
                {isRunning ? 'RUNNING' : elapsedSeconds > 0 ? 'PAUSED' : 'READY'}
              </span>
            )}
          </div>

          {/* 3-Tile Split-Flap Display */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 my-2">
            <FlipDigitCard
              value={viewMode === 'timer' ? timerDigits.hrs : clockHoursStr}
              label="HRS"
            />

            <div className="flex flex-col gap-3 pb-6" aria-hidden="true">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pico-navy" />
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pico-navy" />
            </div>

            <FlipDigitCard
              value={viewMode === 'timer' ? timerDigits.min : clockMinutesStr}
              label="MIN"
            />

            <div className="flex flex-col gap-3 pb-6" aria-hidden="true">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pico-navy" />
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pico-navy" />
            </div>

            <FlipDigitCard
              value={viewMode === 'timer' ? timerDigits.sec : clockSecondsStr}
              label="SEC"
              accent={viewMode === 'timer' && isRunning ? 'red' : 'blue'}
            />
          </div>

          {/* Minimal Timer Controls (Only shown when in Timer tab) */}
          {viewMode === 'timer' && (
            <div className="w-full max-w-md mt-6 pt-5 border-t-2 border-pico-navy space-y-4">
              {/* Preset Pills (Hidden while actively running to reduce visual noise) */}
              {!isRunning && elapsedSeconds === 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {[
                    { label: 'Stopwatch', mins: null },
                    { label: '15m', mins: 15 },
                    { label: '25m', mins: 25 },
                    { label: '45m', mins: 45 },
                  ].map((preset) => {
                    const isSelected =
                      (preset.mins === null && targetSeconds === null) ||
                      (preset.mins !== null && targetSeconds === preset.mins * 60);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset.mins)}
                        className={`pixel-btn min-h-9 px-2.5 py-1 font-heading text-[9px] uppercase ${
                          isSelected
                            ? 'bg-pico-blue text-pico-navy'
                            : 'bg-pico-cream text-pico-navy'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Primary Start/Pause & Reset Row */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRunning((prev) => !prev)}
                  className={`pixel-btn min-h-12 px-6 py-2 font-heading text-xs uppercase ${
                    isRunning
                      ? 'bg-pico-orange text-pico-navy'
                      : 'bg-pico-green text-pico-cream'
                  }`}
                >
                  {isRunning ? 'Pause' : elapsedSeconds > 0 ? 'Resume' : 'Start'}
                </button>

                {elapsedSeconds > 0 && (
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="pixel-btn min-h-12 px-4 py-2 bg-pico-cream text-pico-navy font-heading text-xs uppercase"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Progressive Disclosure: Save Session box ONLY appears when paused with elapsed time */}
              {canSaveNow && (
                <div className="pixel-card p-3 space-y-2.5">
                  <label
                    htmlFor="session-title-input"
                    className="block font-heading text-[9px] uppercase text-pico-navy"
                  >
                    Save Session ({formatDurationBadge(elapsedSeconds)})
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="session-title-input"
                      type="text"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder="Session title (e.g. Study, Coding)"
                      maxLength={80}
                      className="pixel-input flex-1 min-w-0 px-3 py-2 text-base text-pico-navy placeholder:text-pico-gray"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveSession()}
                      className="pixel-btn min-h-11 px-4 bg-pico-red text-pico-cream font-heading text-[10px] uppercase shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Tucked-Away Session History Drawer (Only in Timer mode) */}
        {viewMode === 'timer' && (savedSessions?.length ?? 0) > 0 && (
          <section className="pixel-card p-3.5">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="w-full flex items-center justify-between font-heading text-[10px] uppercase text-pico-navy cursor-pointer"
            >
              <span>Saved Sessions ({savedSessions?.length ?? 0})</span>
              <span>{showHistory ? '[- Hide]' : '[+ Show]'}</span>
            </button>

            {showHistory && (
              <div className="mt-3 pt-3 border-t-2 border-pico-navy space-y-2">
                {savedSessions?.map((session) => (
                  <div
                    key={session.id}
                    className="border-2 border-pico-navy bg-pico-cream px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                      <span className="bg-pico-green text-pico-cream px-1.5 py-0.5 font-heading text-[9px] tabular-nums">
                        {formatDurationBadge(session.durationSeconds)}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-pico-navy truncate">
                        {session.title}
                      </span>
                      <span className="font-heading text-[8px] text-pico-gray">
                        {format(parseISO(session.completedAt), 'MMM d')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (session.id !== undefined) {
                          void deleteFocusSession(session.id);
                        }
                      }}
                      className="pixel-btn px-2 py-1 bg-pico-peach text-pico-navy font-heading text-[8px] uppercase"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
