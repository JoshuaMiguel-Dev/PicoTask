import { useCallback, useEffect, useRef, useState } from 'react';
import { addFocusSession } from '../db/db';
import { sendOsNotification } from '../utils/notificationUtils';
import {
  playTimerAlarm,
  playUiBlip,
  stopTimerAlarm,
  type TimerSoundPreset,
} from '../utils/soundUtils';

export type ClockViewMode = 'clock' | 'timer';

export interface LapSplit {
  lapNumber: number;
  atSeconds: number;
}

export const SOUND_STORAGE_KEY = 'pico_timer_sound_v1';
export const TIMER_STORAGE_KEY = 'pico_timer_state_v1';

export const SOUND_OPTIONS: { id: TimerSoundPreset; label: string }[] = [
  { id: 'chiptune', label: 'Chiptune' },
  { id: 'beep', label: 'Watch Beep' },
  { id: 'fanfare', label: 'Fanfare' },
  { id: 'mute', label: 'Mute' },
];

export function splitSecondsToHMS(totalSeconds: number): {
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

export function formatDurationBadge(totalSeconds: number): string {
  const { hrs, min, sec } = splitSecondsToHMS(totalSeconds);
  if (hrs !== '00') {
    return `${hrs}:${min}:${sec}`;
  }
  return `${min}:${sec}`;
}

interface PersistedTimerState {
  viewMode: ClockViewMode;
  sessionTitle: string;
  isRunning: boolean;
  baseElapsed: number;
  runStartedAt: number | null;
  targetSeconds: number | null;
  laps: LapSplit[];
}

interface InitialTimerSnapshot {
  viewMode: ClockViewMode;
  sessionTitle: string;
  isRunning: boolean;
  elapsedSeconds: number;
  baseElapsed: number;
  runStartedAt: number | null;
  targetSeconds: number | null;
  laps: LapSplit[];
}

function loadInitialTimerSnapshot(): InitialTimerSnapshot {
  const fallback: InitialTimerSnapshot = {
    viewMode: 'clock',
    sessionTitle: 'Study',
    isRunning: false,
    elapsedSeconds: 0,
    baseElapsed: 0,
    runStartedAt: null,
    targetSeconds: null,
    laps: [],
  };

  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedTimerState>;

    const viewMode: ClockViewMode =
      parsed.viewMode === 'timer' || parsed.viewMode === 'clock'
        ? parsed.viewMode
        : 'clock';
    const sessionTitle =
      typeof parsed.sessionTitle === 'string' ? parsed.sessionTitle.slice(0, 60) : 'Study';
    const targetSeconds =
      typeof parsed.targetSeconds === 'number' &&
      Number.isFinite(parsed.targetSeconds) &&
      parsed.targetSeconds > 0
        ? Math.floor(parsed.targetSeconds)
        : null;
    const baseElapsed =
      typeof parsed.baseElapsed === 'number' &&
      Number.isFinite(parsed.baseElapsed) &&
      parsed.baseElapsed >= 0
        ? Math.floor(parsed.baseElapsed)
        : 0;
    const laps: LapSplit[] = Array.isArray(parsed.laps)
      ? parsed.laps.filter(
          (item): item is LapSplit =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.lapNumber === 'number' &&
            typeof item.atSeconds === 'number',
        )
      : [];

    if (
      parsed.isRunning &&
      typeof parsed.runStartedAt === 'number' &&
      Number.isFinite(parsed.runStartedAt)
    ) {
      const delta = Math.max(0, Math.floor((Date.now() - parsed.runStartedAt) / 1000));
      const liveTotal = baseElapsed + delta;

      if (targetSeconds !== null && liveTotal >= targetSeconds) {
        return {
          viewMode,
          sessionTitle,
          isRunning: false,
          elapsedSeconds: targetSeconds,
          baseElapsed: targetSeconds,
          runStartedAt: null,
          targetSeconds,
          laps,
        };
      }

      return {
        viewMode,
        sessionTitle,
        isRunning: true,
        elapsedSeconds: liveTotal,
        baseElapsed,
        runStartedAt: parsed.runStartedAt,
        targetSeconds,
        laps,
      };
    }

    const clampedPaused =
      targetSeconds !== null ? Math.min(targetSeconds, baseElapsed) : baseElapsed;

    return {
      viewMode,
      sessionTitle,
      isRunning: false,
      elapsedSeconds: clampedPaused,
      baseElapsed: clampedPaused,
      runStartedAt: null,
      targetSeconds,
      laps,
    };
  } catch {
    return fallback;
  }
}

export interface FocusTimerState {
  viewMode: ClockViewMode;
  setViewMode: (mode: ClockViewMode) => void;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  displaySeconds: number;
  isCompleted: boolean;
  completionNotice: string | null;
  dismissCompletionNotice: () => void;
  sessionTitle: string;
  setSessionTitle: (title: string) => void;
  laps: LapSplit[];
  soundPreset: TimerSoundPreset;
  toggleRunning: () => void;
  selectPreset: (minutes: number | null) => void;
  applyCustomDuration: (totalSeconds: number) => boolean;
  selectSound: (nextSound: TimerSoundPreset) => void;
  addLapSplit: () => void;
  resetTimer: () => void;
  saveSession: () => Promise<boolean>;
  syncElapsed: () => void;
}

/**
 * Lifted timer & stopwatch state hook anchored to `Date.now()` timestamps and
 * auto-saved to `localStorage` so active or paused timers survive tab switches,
 * browser reloads, and app restarts.
 */
export function useFocusTimer(): FocusTimerState {
  const initialRef = useRef<InitialTimerSnapshot | null>(null);
  if (initialRef.current === null) {
    initialRef.current = loadInitialTimerSnapshot();
  }
  const initial = initialRef.current;

  const [viewMode, setViewMode] = useState<ClockViewMode>(initial.viewMode);
  const [sessionTitle, setSessionTitle] = useState<string>(initial.sessionTitle);
  const [isRunning, setIsRunning] = useState<boolean>(initial.isRunning);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initial.elapsedSeconds);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(initial.targetSeconds);
  const [laps, setLaps] = useState<LapSplit[]>(initial.laps);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  const [soundPreset, setSoundPreset] = useState<TimerSoundPreset>(() => {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    if (
      saved === 'chiptune' ||
      saved === 'beep' ||
      saved === 'fanfare' ||
      saved === 'mute'
    ) {
      return saved;
    }
    return 'chiptune';
  });

  const soundPresetRef = useRef(soundPreset);
  soundPresetRef.current = soundPreset;

  const sessionTitleRef = useRef(sessionTitle);
  sessionTitleRef.current = sessionTitle;

  const targetSecondsRef = useRef<number | null>(targetSeconds);
  targetSecondsRef.current = targetSeconds;

  // Timestamp-anchored counters prevent drift if the browser throttles background tabs
  const baseElapsedRef = useRef<number>(initial.baseElapsed);
  const runStartedAtRef = useRef<number | null>(initial.runStartedAt);

  const persistCurrentState = useCallback(
    (overrides?: Partial<PersistedTimerState>) => {
      try {
        const payload: PersistedTimerState = {
          viewMode,
          sessionTitle,
          isRunning,
          baseElapsed: baseElapsedRef.current,
          runStartedAt: runStartedAtRef.current,
          targetSeconds,
          laps,
          ...overrides,
        };
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota / private-mode errors
      }
    },
    [viewMode, sessionTitle, isRunning, targetSeconds, laps],
  );

  // Auto-save whenever timer state changes and right before page unload/quit
  useEffect(() => {
    persistCurrentState();
  }, [persistCurrentState, elapsedSeconds]);

  useEffect(() => {
    function handleQuitSave() {
      persistCurrentState();
    }
    window.addEventListener('pagehide', handleQuitSave);
    window.addEventListener('beforeunload', handleQuitSave);
    return () => {
      window.removeEventListener('pagehide', handleQuitSave);
      window.removeEventListener('beforeunload', handleQuitSave);
    };
  }, [persistCurrentState]);

  const computeLiveElapsed = useCallback((): number => {
    if (runStartedAtRef.current === null) {
      return baseElapsedRef.current;
    }
    const delta = Math.max(0, Math.floor((Date.now() - runStartedAtRef.current) / 1000));
    const total = baseElapsedRef.current + delta;
    return targetSecondsRef.current !== null
      ? Math.min(targetSecondsRef.current, total)
      : total;
  }, []);

  const syncElapsed = useCallback(() => {
    if (runStartedAtRef.current === null) return;
    const live = computeLiveElapsed();
    setElapsedSeconds((prev) => (prev === live ? prev : live));
  }, [computeLiveElapsed]);

  useEffect(() => {
    if (!isRunning) return;

    syncElapsed();
    const intervalId = window.setInterval(syncElapsed, 250);
    document.addEventListener('visibilitychange', syncElapsed);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncElapsed);
    };
  }, [isRunning, syncElapsed]);

  useEffect(() => {
    if (isRunning && targetSeconds !== null && elapsedSeconds >= targetSeconds) {
      baseElapsedRef.current = targetSeconds;
      runStartedAtRef.current = null;
      setIsRunning(false);

      const label = sessionTitleRef.current.trim() || 'Focus';
      const durationText = formatDurationBadge(targetSeconds);
      setCompletionNotice(`${label} (${durationText}) complete!`);

      playTimerAlarm(soundPresetRef.current, 'alarm');
      void sendOsNotification(`PicoTask // ${label} Complete!`, {
        body: `Finished ${durationText} focus session. Tap to save or start another.`,
        tag: 'pico-timer-complete',
        requireInteraction: true,
        renotify: true,
        vibrate: [180, 90, 180],
      });
    }
  }, [isRunning, targetSeconds, elapsedSeconds]);

  const dismissCompletionNotice = useCallback(() => {
    stopTimerAlarm();
    setCompletionNotice(null);
  }, []);

  const toggleRunning = useCallback(() => {
    playUiBlip(soundPresetRef.current);
    setCompletionNotice(null);

    if (isRunning) {
      const live = computeLiveElapsed();
      baseElapsedRef.current = live;
      runStartedAtRef.current = null;
      stopTimerAlarm();
      setElapsedSeconds(live);
      setIsRunning(false);
      return;
    }

    if (targetSecondsRef.current !== null && elapsedSeconds >= targetSecondsRef.current) {
      stopTimerAlarm();
      baseElapsedRef.current = 0;
      runStartedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setLaps([]);
      setIsRunning(true);
      return;
    }

    baseElapsedRef.current = elapsedSeconds;
    runStartedAtRef.current = Date.now();
    setIsRunning(true);
  }, [isRunning, elapsedSeconds, computeLiveElapsed]);

  const selectPreset = useCallback((minutes: number | null) => {
    stopTimerAlarm();
    setCompletionNotice(null);
    baseElapsedRef.current = 0;
    runStartedAtRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
    setTargetSeconds(minutes !== null ? minutes * 60 : null);
  }, []);

  const applyCustomDuration = useCallback((totalSeconds: number): boolean => {
    if (totalSeconds <= 0) return false;
    stopTimerAlarm();
    setCompletionNotice(null);
    baseElapsedRef.current = 0;
    runStartedAtRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
    setTargetSeconds(totalSeconds);
    playUiBlip(soundPresetRef.current);
    return true;
  }, []);

  const selectSound = useCallback((nextSound: TimerSoundPreset) => {
    setSoundPreset(nextSound);
    localStorage.setItem(SOUND_STORAGE_KEY, nextSound);
    playTimerAlarm(nextSound, 'preview');
  }, []);

  const addLapSplit = useCallback(() => {
    const live = isRunning ? computeLiveElapsed() : elapsedSeconds;
    if (live <= 0) return;
    playUiBlip(soundPresetRef.current);
    setLaps((prev) => [
      { lapNumber: prev.length + 1, atSeconds: live },
      ...prev,
    ]);
  }, [isRunning, elapsedSeconds, computeLiveElapsed]);

  const resetTimer = useCallback(() => {
    stopTimerAlarm();
    setCompletionNotice(null);
    baseElapsedRef.current = 0;
    runStartedAtRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
  }, []);

  const saveSession = useCallback(async (): Promise<boolean> => {
    stopTimerAlarm();
    setCompletionNotice(null);
    const live = isRunning ? computeLiveElapsed() : elapsedSeconds;
    if (live <= 0) return false;

    const baseTitle = sessionTitleRef.current.trim() || 'Focus Session';
    const modeLabel = targetSeconds === null ? 'Stopwatch' : 'Timer';
    const finalTitle =
      laps.length > 0
        ? `${baseTitle} (${modeLabel} • ${laps.length} splits)`
        : `${baseTitle} (${modeLabel})`;

    await addFocusSession(finalTitle, live);
    baseElapsedRef.current = 0;
    runStartedAtRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
    return true;
  }, [isRunning, elapsedSeconds, targetSeconds, laps.length, computeLiveElapsed]);

  const displaySeconds =
    targetSeconds !== null
      ? Math.max(0, targetSeconds - elapsedSeconds)
      : elapsedSeconds;

  const isCompleted =
    targetSeconds !== null && elapsedSeconds >= targetSeconds && !isRunning;

  return {
    viewMode,
    setViewMode,
    isRunning,
    elapsedSeconds,
    targetSeconds,
    displaySeconds,
    isCompleted,
    completionNotice,
    dismissCompletionNotice,
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
    syncElapsed,
  };
}
