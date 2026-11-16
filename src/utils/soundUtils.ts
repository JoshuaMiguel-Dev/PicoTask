/**
 * Synthesizes authentic 8-bit PICO-8 chiptune sounds using the browser's native
 * Web Audio API (`AudioContext` + square/triangle oscillators).
 *
 * Interview Note:
 * Why Web Audio API instead of loading `.mp3` files?
 * - Zero network requests and 0 KB bundle size.
 * - Guaranteed to work 100% offline inside a PWA without caching audio blobs.
 */

export type TimerSoundPreset = 'chiptune' | 'beep' | 'fanfare' | 'mute';

let sharedAudioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Immediately stops any currently ringing alarm oscillators.
 */
export function stopTimerAlarm(): void {
  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Ignore if already stopped
    }
  }
  activeOscillators = [];
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.12,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
  activeOscillators.push(osc);
}

/**
 * Plays a short 8-bit button feedback blip when starting or pausing the timer.
 */
export function playUiBlip(preset: TimerSoundPreset): void {
  if (preset === 'mute') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 587.33, now, 0.06, 'square', 0.08); // D5
}

/**
 * Plays the selected 8-bit alarm sound.
 * - `mode: 'alarm'` (default when timer ends): Rings continuously for ~5 seconds.
 * - `mode: 'preview'` (when clicking a sound button): Plays 1 short cycle (~1s).
 */
export function playTimerAlarm(
  preset: TimerSoundPreset,
  mode: 'alarm' | 'preview' = 'alarm',
): void {
  stopTimerAlarm();
  if (preset === 'mute') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Repeat cycles to fill ~5 seconds when the timer finishes, or 1 cycle for preview
  const cycles = mode === 'alarm' ? 5 : 1;

  if (preset === 'chiptune') {
    // Each cycle is ~1.0s -> 5 cycles = 5.0 seconds
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const lengths = [0.11, 0.11, 0.11, 0.16, 0.1, 0.24];
    for (let c = 0; c < cycles; c++) {
      let offset = c * 1.0;
      notes.forEach((freq, idx) => {
        playTone(ctx, freq, now + offset, lengths[idx], 'square', 0.14);
        offset += lengths[idx] + 0.02;
      });
    }
  } else if (preset === 'beep') {
    // Classic digital watch double-beep: 1 group per second for 5 seconds (or 2 groups for preview)
    const beepGroups = mode === 'alarm' ? 10 : 2;
    for (let i = 0; i < beepGroups; i++) {
      const groupStart = now + i * 0.5;
      playTone(ctx, 2093.0, groupStart, 0.08, 'square', 0.12); // C7
      playTone(ctx, 2093.0, groupStart + 0.12, 0.08, 'square', 0.12);
    }
  } else if (preset === 'fanfare') {
    // Arcade Quest Complete fanfare: ~1.0s per cycle -> 5 cycles = 5.0 seconds
    const notes = [392.0, 523.25, 659.25, 783.99, 659.25, 783.99];
    const times = [0, 0.12, 0.24, 0.36, 0.52, 0.66];
    const durations = [0.1, 0.1, 0.1, 0.14, 0.12, 0.28];
    for (let c = 0; c < cycles; c++) {
      const cycleStart = c * 1.0;
      notes.forEach((freq, idx) => {
        playTone(
          ctx,
          freq,
          now + cycleStart + times[idx],
          durations[idx],
          'triangle',
          0.22,
        );
      });
    }
  }
}
