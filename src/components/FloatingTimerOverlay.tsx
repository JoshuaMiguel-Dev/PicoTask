import { createPortal } from 'react-dom';
import { formatDurationBadge, type FocusTimerState } from '../hooks/useFocusTimer';
import type { ExternalTimerWindowController } from '../hooks/useExternalTimerWindow';

interface FloatingTimerOverlayProps {
  timer: FocusTimerState;
  external: ExternalTimerWindowController;
  onJumpToClock: () => void;
}

/**
 * Renders the PICO-8 mini-timer inside the external Document Picture-in-Picture
 * or detached popup fallback window (when Video PiP isn't used).
 */
export default function FloatingTimerOverlay({
  timer,
  external,
  onJumpToClock,
}: FloatingTimerOverlayProps) {
  if (!external.canPopOut || !external.isExternalOpen || !external.externalContainer) {
    return null;
  }

  const sessionLabel = timer.sessionTitle.trim() || 'Focus';
  const modeLabel = timer.targetSeconds === null ? 'SW' : 'TIMER';
  const isFinalCountdown =
    timer.targetSeconds !== null &&
    timer.isRunning &&
    timer.displaySeconds > 0 &&
    timer.displaySeconds <= 10;

  const statusLabel = timer.isRunning
    ? 'RUN'
    : timer.isCompleted
      ? 'DONE'
      : timer.elapsedSeconds > 0
        ? 'PAUSE'
        : 'READY';

  const statusDotColor =
    timer.isCompleted || isFinalCountdown
      ? 'bg-[#FF004D]'
      : timer.isRunning
        ? 'bg-[#008751]'
        : timer.elapsedSeconds > 0
          ? 'bg-[#FFA300]'
          : 'bg-[#29ADFF]';

  const startBtnLabel = timer.isRunning
    ? 'Pause'
    : timer.isCompleted
      ? 'Restart'
      : timer.elapsedSeconds > 0
        ? 'Resume'
        : 'Start';

  const remainingRatio =
    timer.targetSeconds !== null && timer.targetSeconds > 0
      ? Math.max(0, Math.min(1, timer.displaySeconds / timer.targetSeconds))
      : null;

  const progressFillColor =
    isFinalCountdown || timer.isCompleted
      ? 'bg-[#FF004D]'
      : remainingRatio !== null && remainingRatio <= 0.25
        ? 'bg-[#FFA300]'
        : 'bg-[#008751]';

  return createPortal(
    <div className="relative w-full h-full flex flex-col justify-between bg-[#FFCCAA] border-[3px] border-[#1D2B53] box-border select-none">
      {/* Header Bar */}
      <div className="shrink-0 bg-[#1D2B53] text-[#FFF1E8] border-b-2 border-[#1D2B53] px-1.5 py-0.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 shrink-0 border border-[#FFF1E8] ${statusDotColor}`}
          />
          <span className="font-heading text-[7px] uppercase truncate">
            {sessionLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => external.closeExternalWindow()}
          aria-label="Close floating timer window"
          title="Close window (timer keeps running)"
          className="pixel-btn min-w-4 min-h-4 px-1 py-0.5 bg-[#FF004D] text-[#FFF1E8] border-[#FFF1E8] font-heading text-[6px] leading-none flex items-center justify-center shrink-0"
        >
          X
        </button>
      </div>

      {/* Cream Readout + 8-Bit Progress Bar + Action Controls */}
      <div className="flex-1 min-h-0 p-1.5 flex flex-col justify-between gap-1.5">
        <div className="flex-1 min-h-0 bg-[#FFF1E8] border-2 border-[#1D2B53] px-2 py-1 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between gap-1 mb-0.5">
            <span className="font-heading text-[6px] text-[#5F574F] uppercase">
              {modeLabel}
            </span>
            <span
              className={`font-heading text-[6px] uppercase ${
                timer.isCompleted || isFinalCountdown
                  ? 'text-[#FF004D]'
                  : timer.isRunning
                    ? 'text-[#008751]'
                    : 'text-[#1D2B53]'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <span
            className={`font-heading text-base tabular-nums tracking-tight ${
              timer.isCompleted || isFinalCountdown ? 'text-[#FF004D]' : 'text-[#1D2B53]'
            }`}
          >
            {formatDurationBadge(timer.displaySeconds)}
          </span>

          {remainingRatio !== null && (
            <div
              aria-hidden="true"
              className="w-full h-1.5 mt-1 bg-[#FFCCAA] border border-[#1D2B53] overflow-hidden"
            >
              <div
                style={{ width: `${Math.round(remainingRatio * 100)}%` }}
                className={`h-full transition-[width] duration-200 ${progressFillColor}`}
              />
            </div>
          )}
        </div>

        <div
          className={`shrink-0 grid gap-1 ${
            timer.isCompleted ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {timer.isCompleted && (
            <button
              type="button"
              onClick={() => void timer.saveSession()}
              className="pixel-btn min-h-6 px-1 py-0.5 bg-[#FF004D] text-[#FFF1E8] font-heading text-[6px] uppercase"
            >
              Save
            </button>
          )}

          <button
            type="button"
            onClick={timer.toggleRunning}
            className={`pixel-btn min-h-6 px-1 py-0.5 font-heading text-[6px] uppercase ${
              timer.isRunning
                ? 'bg-[#FFA300] text-[#1D2B53]'
                : 'bg-[#008751] text-[#FFF1E8]'
            }`}
          >
            {startBtnLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                window.focus();
              } catch {
                // Ignore
              }
              onJumpToClock();
            }}
            className="pixel-btn min-h-6 px-1 py-0.5 bg-[#29ADFF] text-[#1D2B53] font-heading text-[6px] uppercase"
          >
            App
          </button>
        </div>
      </div>
    </div>,
    external.externalContainer,
  );
}
