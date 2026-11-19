import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { db, deleteFocusSession } from '../db/db';
import { useClock } from '../hooks/useClock';
import { useWakeLock } from '../hooks/useWakeLock';
import {
  formatDurationBadge,
  SOUND_OPTIONS,
  splitSecondsToHMS,
  type FocusTimerState,
} from '../hooks/useFocusTimer';
import type { ExternalTimerWindowController } from '../hooks/useExternalTimerWindow';
import FlipDigitCard from '../components/FlipDigitCard';

interface ClockPageProps {
  timer: FocusTimerState;
  external: ExternalTimerWindowController;
}

const SESSION_ACTIVITIES = [
  'Study',
  'Coding',
  'Project',
  'Reading',
  'Workout',
] as const;

export default function ClockPage({ timer, external }: ClockPageProps) {
  const now = useClock();
  const fullscreenOverlayRef = useRef<HTMLDivElement | null>(null);

  const {
    viewMode,
    setViewMode,
    isRunning,
    elapsedSeconds,
    targetSeconds,
    displaySeconds,
    isCompleted,
    sessionTitle,
    setSessionTitle,
    laps,
    soundPreset,
    toggleRunning,
    selectPreset,
    applyCustomDuration,
    selectSound,
    addLapSplit,
    resetTimer,
    saveSession,
  } = timer;

  // --- FULL SCREEN HORIZONTAL MODE ---
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [forceRotate90, setForceRotate90] = useState<boolean>(false);
  useWakeLock(isFullScreen);

  // --- LOCAL UI DRAWER STATE ---
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [customMinStr, setCustomMinStr] = useState<string>('20');
  const [customSecStr, setCustomSecStr] = useState<string>('00');

  // --- WALL CLOCK STATE ---
  const [use24Hour, setUse24Hour] = useState<boolean>(() => {
    return localStorage.getItem('pico_clock_24h') !== 'false';
  });

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
    selectPreset(minutes);
    setIsCustomOpen(false);
  }

  function handleApplyCustomTimer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mins = Math.max(0, Number.parseInt(customMinStr || '0', 10) || 0);
    const secs = Math.max(0, Number.parseInt(customSecStr || '0', 10) || 0);
    const total = mins * 60 + secs;
    if (applyCustomDuration(total)) {
      setIsCustomOpen(false);
    }
  }

  async function handleSaveSession() {
    const saved = await saveSession();
    if (saved) {
      setShowHistory(true);
    }
  }

  const timerDigits = splitSecondsToHMS(displaySeconds);

  const clockHoursStr = use24Hour ? format(now, 'HH') : format(now, 'hh');
  const clockMinutesStr = format(now, 'mm');
  const clockSecondsStr = format(now, 'ss');
  const amPmStr = format(now, 'aa').toUpperCase();

  const activeSessionBanner = (sessionTitle.trim() || 'FOCUS').toUpperCase();
  const primaryStartLabel = isRunning
    ? 'Pause'
    : isCompleted
      ? 'Restart'
      : elapsedSeconds > 0
        ? 'Resume'
        : 'Start';

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
            className="fixed top-0 left-0 right-0 bottom-0 w-screen h-dvh z-[9999] m-0 bg-[#1D2B53] flex items-center justify-center overflow-hidden"
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
                    : `${targetSeconds === null ? 'STOPWATCH' : 'TIMER'} // ${activeSessionBanner}`}
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
                    className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-red text-[#FFF1E8] font-heading text-[9px] uppercase"
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
                      onClick={toggleRunning}
                      className={`pixel-btn min-h-10 px-4 py-1.5 font-heading text-[10px] uppercase ${
                        isRunning
                          ? 'bg-pico-orange text-[#1D2B53]'
                          : 'bg-pico-green text-[#FFF1E8]'
                      }`}
                    >
                      {primaryStartLabel}
                    </button>
                    {elapsedSeconds > 0 && (
                      <button
                        type="button"
                        onClick={resetTimer}
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
                  ? 'bg-pico-red text-[#FFF1E8]'
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
                  ? 'bg-pico-red text-[#FFF1E8]'
                  : 'bg-pico-cream text-pico-navy'
              }`}
            >
              Timer
            </button>
          </div>

          <button
            type="button"
            onClick={() => void enterFullScreen()}
            className="pixel-btn min-h-10 px-3 py-1.5 bg-pico-blue text-[#1D2B53] font-heading text-[10px] uppercase"
          >
            [Full Screen]
          </button>
        </div>

        {/* Centerpiece Split-Flap Housing (Warm Peach/Cream Background Preserved) */}
        <section
          aria-label={viewMode === 'clock' ? 'Digital desk clock' : 'Focus timer'}
          className="pixel-card-peach p-5 sm:p-7 flex flex-col items-center justify-center"
        >
          {/* Subtle Top Subtitle */}
          <div className="w-full flex items-center justify-between gap-2 mb-5">
            <span className="font-heading text-[9px] sm:text-[10px] text-pico-navy uppercase truncate">
              {viewMode === 'clock'
                ? format(now, 'EEEE, MMM d').toUpperCase()
                : targetSeconds === null
                  ? `STOPWATCH // ${activeSessionBanner}`
                  : `TIMER (${formatDurationBadge(targetSeconds)}) // ${activeSessionBanner}`}
            </span>

            {viewMode === 'clock' ? (
              <button
                type="button"
                onClick={toggleHourFormat}
                className="border-2 border-pico-navy bg-pico-cream px-2 py-0.5 font-heading text-[9px] text-pico-navy uppercase cursor-pointer shrink-0"
              >
                {use24Hour ? '24H' : amPmStr}
              </button>
            ) : (
              <span
                className={`border-2 border-pico-navy px-2 py-0.5 font-heading text-[9px] uppercase shrink-0 ${
                  isRunning
                    ? 'bg-pico-green text-[#FFF1E8]'
                    : isCompleted
                      ? 'bg-pico-red text-[#FFF1E8]'
                      : 'bg-pico-cream text-pico-navy'
                }`}
              >
                {isRunning
                  ? 'RUNNING'
                  : isCompleted
                    ? 'DONE'
                    : elapsedSeconds > 0
                      ? 'PAUSED'
                      : 'READY'}
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

          {/* Timer & Stopwatch Session Controls */}
          {viewMode === 'timer' && (
            <div className="w-full max-w-md mt-6 pt-5 border-t-2 border-pico-navy space-y-4">
              {/* 1. What is this Session / Stopwatch for? */}
              <div className="bg-pico-cream border-2 border-pico-navy p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="session-purpose-input"
                    className="font-heading text-[8px] uppercase text-pico-navy"
                  >
                    Session / Stopwatch For:
                  </label>
                  <span className="font-heading text-[8px] text-pico-gray uppercase">
                    {targetSeconds === null ? 'Timelapse / Count-Up' : 'Countdown'}
                  </span>
                </div>

                {/* Quick Activity Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {SESSION_ACTIVITIES.map((act) => {
                    const isPicked =
                      sessionTitle.trim().toLowerCase() === act.toLowerCase();
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setSessionTitle(act)}
                        className={`border border-pico-navy px-2 py-0.5 font-heading text-[8px] uppercase cursor-pointer ${
                          isPicked
                            ? 'bg-pico-blue text-[#1D2B53]'
                            : 'bg-pico-peach text-pico-navy'
                        }`}
                      >
                        {act}
                      </button>
                    );
                  })}
                </div>

                <input
                  id="session-purpose-input"
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Or type custom activity (e.g. Math PSet, Gym)..."
                  maxLength={60}
                  className="pixel-input w-full px-2.5 py-1.5 text-sm sm:text-base text-pico-navy placeholder:text-pico-gray"
                />
              </div>

              {/* 2. Mode & Preset Pills (Hidden while actively running) */}
              {!isRunning && elapsedSeconds === 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {[
                      { label: 'Stopwatch', mins: null },
                      { label: '15m', mins: 15 },
                      { label: '25m', mins: 25 },
                      { label: '45m', mins: 45 },
                    ].map((preset) => {
                      const isSelected =
                        !isCustomOpen &&
                        ((preset.mins === null && targetSeconds === null) ||
                          (preset.mins !== null &&
                            targetSeconds === preset.mins * 60));
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset.mins)}
                          className={`pixel-btn min-h-9 px-2.5 py-1 font-heading text-[8px] sm:text-[9px] uppercase ${
                            isSelected
                              ? 'bg-pico-blue text-[#1D2B53]'
                              : 'bg-pico-cream text-pico-navy'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setIsCustomOpen((prev) => !prev)}
                      className={`pixel-btn min-h-9 px-2.5 py-1 font-heading text-[8px] sm:text-[9px] uppercase ${
                        isCustomOpen
                          ? 'bg-pico-blue text-[#1D2B53]'
                          : 'bg-pico-cream text-pico-navy'
                      }`}
                    >
                      [Custom]
                    </button>
                  </div>

                  {/* Collapsible Custom Timer Input Box */}
                  {isCustomOpen && (
                    <form
                      onSubmit={handleApplyCustomTimer}
                      className="pixel-card p-3 flex flex-wrap items-center justify-center gap-2"
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={customMinStr}
                          onChange={(e) => setCustomMinStr(e.target.value)}
                          aria-label="Custom minutes"
                          className="pixel-input w-16 px-2 py-1 text-base text-center text-pico-navy tabular-nums"
                        />
                        <span className="font-heading text-[8px] uppercase text-pico-navy">
                          MIN
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={customSecStr}
                          onChange={(e) => setCustomSecStr(e.target.value)}
                          aria-label="Custom seconds"
                          className="pixel-input w-16 px-2 py-1 text-base text-center text-pico-navy tabular-nums"
                        />
                        <span className="font-heading text-[8px] uppercase text-pico-navy">
                          SEC
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="pixel-btn min-h-9 px-3 py-1 bg-pico-red text-[#FFF1E8] font-heading text-[9px] uppercase"
                      >
                        Set
                      </button>
                    </form>
                  )}

                  {/* 8-Bit Sound Effect Selector */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <span className="font-heading text-[8px] uppercase text-pico-navy mr-0.5">
                      Sound:
                    </span>
                    {SOUND_OPTIONS.map((snd) => {
                      const active = soundPreset === snd.id;
                      return (
                        <button
                          key={snd.id}
                          type="button"
                          onClick={() => selectSound(snd.id)}
                          title="Tap to select and preview alarm sound"
                          className={`border-2 border-pico-navy px-2 py-0.5 font-heading text-[8px] uppercase cursor-pointer ${
                            active
                              ? 'bg-[#1D2B53] text-[#FFF1E8]'
                              : 'bg-pico-cream text-pico-navy hover:bg-pico-blue'
                          }`}
                        >
                          {snd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Primary Start/Pause, [+ Split / Lap], Save, Reset, and [Pin] Overlay Row */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={toggleRunning}
                  className={`pixel-btn min-h-11 px-5 py-2 font-heading text-[10px] sm:text-xs uppercase ${
                    isRunning
                      ? 'bg-pico-orange text-[#1D2B53]'
                      : 'bg-pico-green text-[#FFF1E8]'
                  }`}
                >
                  {primaryStartLabel}
                </button>

                {elapsedSeconds > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={addLapSplit}
                      className="pixel-btn min-h-11 px-3 py-2 bg-pico-blue text-[#1D2B53] font-heading text-[9px] sm:text-[10px] uppercase"
                    >
                      + Split
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSaveSession()}
                      className="pixel-btn min-h-11 px-3.5 py-2 bg-pico-red text-[#FFF1E8] font-heading text-[9px] sm:text-[10px] uppercase"
                    >
                      Save ({formatDurationBadge(elapsedSeconds)})
                    </button>

                    <button
                      type="button"
                      onClick={resetTimer}
                      className="pixel-btn min-h-11 px-3 py-2 bg-pico-cream text-pico-navy font-heading text-[9px] sm:text-[10px] uppercase"
                    >
                      Reset
                    </button>
                  </>
                )}

                {external.canPopOut && (
                  <button
                    type="button"
                    onClick={() => void external.openExternalWindow()}
                    aria-pressed={external.isExternalOpen}
                    title="Pop out floating timer window that can be dragged outside this tab or app"
                    className={`pixel-btn min-h-11 px-3 py-2 font-heading text-[9px] sm:text-[10px] uppercase ${
                      external.isExternalOpen
                        ? 'bg-pico-green text-[#FFF1E8]'
                        : 'bg-pico-peach text-pico-navy'
                    }`}
                  >
                    {external.isExternalOpen ? '[Popped]' : '[Pop Out]'}
                  </button>
                )}
              </div>

              {external.externalError && (
                <p className="bg-pico-cream border-2 border-pico-navy px-2.5 py-1.5 text-xs font-bold text-pico-red text-center">
                  {external.externalError}
                </p>
              )}

              {/* 4. Timelapse / Split Checkpoints List (Shown when splits exist) */}
              {laps.length > 0 && (
                <div className="bg-pico-cream border-2 border-pico-navy p-2.5 space-y-1.5">
                  <span className="font-heading text-[8px] uppercase text-pico-gray block">
                    // Timelapse Splits ({sessionTitle || 'Session'})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {laps.map((lap) => (
                      <div
                        key={lap.lapNumber}
                        className="flex items-center justify-between border-b border-pico-navy/20 pb-0.5 text-xs font-bold text-pico-navy"
                      >
                        <span className="font-heading text-[8px]">
                          SPLIT #{lap.lapNumber}
                        </span>
                        <span className="font-heading text-[9px] tabular-nums">
                          {formatDurationBadge(lap.atSeconds)}
                        </span>
                      </div>
                    ))}
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
                      <span className="bg-pico-green text-[#FFF1E8] px-1.5 py-0.5 font-heading text-[9px] tabular-nums">
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
