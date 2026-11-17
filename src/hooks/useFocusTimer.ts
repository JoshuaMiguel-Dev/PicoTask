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

export interface FocusTimerState {
  viewMode: ClockViewMode;
  setViewMode: (mode: ClockViewMode) => void;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  displaySeconds: number;
  isCompleted: boolean;
  sessionTitle: string;
  setSessionTitle: (title: string) => void;
  laps: LapSplit[];
  soundPreset: TimerSoundPreset;
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
  toggleOverlay: () => void;
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
 * Lifted timer & stopwatch state hook anchored to `Date.now()` timestamps so active
 * focus timers stay accurate across tab switches, background throttling, and external pop-outs.
 */
export function useFocusTimer(): FocusTimerState {
  const [viewMode, setViewMode] = useState<ClockViewMode>('clock');
  const [sessionTitle, setSessionTitle] = useState<string>('Study');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(null);
  const [laps, setLaps] = useState<LapSplit[]>([]);
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);

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
  const baseElapsedRef = useRef<number>(0);
  const runStartedAtRef = useRef<number | null>(null);

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
      playTimerAlarm(soundPresetRef.current, 'alarm');
      void sendOsNotification('PicoTask // Timer Complete!', {
        body: `Your ${sessionTitleRef.current.trim() || 'Focus'} session finished!`,
        tag: 'pico-timer-complete',
      });
    }
  }, [isRunning, targetSeconds, elapsedSeconds]);

  const toggleRunning = useCallback(() => {
    playUiBlip(soundPresetRef.current);

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
    baseElapsedRef.current = 0;
    runStartedAtRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
  }, []);

  const saveSession = useCallback(async (): Promise<boolean> => {
    stopTimerAlarm();
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

  const toggleOverlay = useCallback(() => {
    playUiBlip(soundPresetRef.current);
    setIsOverlayOpen((prev) => !prev);
  }, []);

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
    sessionTitle,
    setSessionTitle,
    laps,
    soundPreset,
    isOverlayOpen,
    setIsOverlayOpen,
    toggleOverlay,
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
