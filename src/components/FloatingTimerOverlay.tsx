import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { formatDurationBadge, type FocusTimerState } from '../hooks/useFocusTimer';
import type { ExternalTimerWindowController } from '../hooks/useExternalTimerWindow';

interface FloatingTimerOverlayProps {
  timer: FocusTimerState;
  external: ExternalTimerWindowController;
  onJumpToClock: () => void;
  onClose: () => void;
}

interface OverlayPosition {
  x: number;
  y: number;
}

const VIEWPORT_MARGIN = 8;
const BOTTOM_NAV_CLEARANCE = 68;

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): OverlayPosition {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
  const maxY = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - height - BOTTOM_NAV_CLEARANCE,
  );
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  };
}

interface MiniTimerCardProps {
  timer: FocusTimerState;
  isExternal: boolean;
  errorMessage?: string | null;
  onJumpToClock: () => void;
  onPopOut?: () => void;
  onDockInApp?: () => void;
  onClose: () => void;
  onDragPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onDragPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onDragPointerEnd?: (e: PointerEvent<HTMLDivElement>) => void;
}

/**
 * Shared PICO-8 mini-timer card rendered inside both the in-app draggable overlay
 * and the external Document Picture-in-Picture / Pop-out window.
 */
function MiniTimerCard({
  timer,
  isExternal,
  errorMessage,
  onJumpToClock,
  onPopOut,
  onDockInApp,
  onClose,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerEnd,
}: MiniTimerCardProps) {
  const sessionLabel = timer.sessionTitle.trim() || 'Focus';
  const modeLabel = timer.targetSeconds === null ? 'SW' : 'TIMER';
  const statusLabel = timer.isRunning
    ? 'RUN'
    : timer.isCompleted
      ? 'DONE'
      : timer.elapsedSeconds > 0
        ? 'PAUSE'
        : 'READY';

  const statusDotColor = timer.isRunning
    ? 'bg-[#008751]'
    : timer.isCompleted
      ? 'bg-[#FF004D]'
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

  return (
    <div
      className={
        isExternal
          ? 'w-full h-full flex flex-col justify-between bg-[#FFCCAA] border-[3px] border-[#1D2B53] box-border select-none'
          : 'w-full bg-[#FFCCAA] border-[3px] border-[#1D2B53] shadow-[4px_4px_0px_#1D2B53] select-none'
      }
    >
      {/* Title / Drag Handle Bar */}
      <div
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerEnd}
        onPointerCancel={onDragPointerEnd}
        title={isExternal ? 'PicoTask External Timer' : 'Drag to move timer overlay'}
        className={`bg-[#1D2B53] text-[#FFF1E8] border-b-2 border-[#1D2B53] px-2 py-1.5 flex items-center justify-between gap-1.5 ${
          isExternal ? '' : 'cursor-grab active:cursor-grabbing touch-none'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className={`w-2 h-2 shrink-0 border border-[#FFF1E8] ${statusDotColor}`}
          />
          <span className="font-heading text-[8px] uppercase truncate">
            {sessionLabel}
          </span>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!isExternal && onPopOut && (
            <button
              type="button"
              onClick={onPopOut}
              aria-label="Pop out timer outside browser tab"
              title="Pop out outside browser tab / app"
              className="pixel-btn min-h-6 px-1.5 py-0.5 bg-[#29ADFF] text-[#1D2B53] border-[#FFF1E8] font-heading text-[7px] leading-none flex items-center justify-center"
            >
              OUT
            </button>
          )}

          {isExternal && onDockInApp && (
            <button
              type="button"
              onClick={onDockInApp}
              aria-label="Dock timer back inside app"
              title="Dock back inside app"
              className="pixel-btn min-h-6 px-1.5 py-0.5 bg-[#FFCCAA] text-[#1D2B53] border-[#FFF1E8] font-heading text-[7px] leading-none flex items-center justify-center"
            >
              DOCK
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Hide floating timer overlay"
            title="Hide overlay (timer keeps running)"
            className="pixel-btn min-w-6 min-h-6 px-1.5 py-0.5 bg-[#FF004D] text-[#FFF1E8] border-[#FFF1E8] font-heading text-[8px] leading-none flex items-center justify-center"
          >
            X
          </button>
        </div>
      </div>

      {/* Cream Readout + Compact Action Controls */}
      <div className={isExternal ? 'flex-1 p-2 flex flex-col justify-between gap-2' : 'p-2 space-y-2'}>
        <div
          className={`bg-[#FFF1E8] border-2 border-[#1D2B53] px-2.5 py-1.5 flex flex-col items-center justify-center ${
            isExternal ? 'flex-1' : ''
          }`}
        >
          <div className="w-full flex items-center justify-between gap-1 mb-0.5">
            <span className="font-heading text-[7px] text-[#5F574F] uppercase">
              {modeLabel}
            </span>
            <span
              className={`font-heading text-[7px] uppercase ${
                timer.isCompleted
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
            className={`font-heading text-base sm:text-lg tabular-nums tracking-tight ${
              timer.isCompleted ? 'text-[#FF004D]' : 'text-[#1D2B53]'
            }`}
          >
            {formatDurationBadge(timer.displaySeconds)}
          </span>
        </div>

        {errorMessage && (
          <p className="font-body text-[11px] leading-tight text-[#FF004D] bg-[#FFF1E8] border border-[#1D2B53] px-1.5 py-1">
            {errorMessage}
          </p>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={timer.toggleRunning}
            className={`pixel-btn min-h-8 px-1.5 py-1 font-heading text-[8px] uppercase ${
              timer.isRunning
                ? 'bg-[#FFA300] text-[#1D2B53]'
                : 'bg-[#008751] text-[#FFF1E8]'
            }`}
          >
            {startBtnLabel}
          </button>

          <button
            type="button"
            onClick={onJumpToClock}
            title={isExternal ? 'Focus PicoTask & open Clock' : 'Jump to Clock & Timer tab'}
            className="pixel-btn min-h-8 px-1.5 py-1 bg-[#29ADFF] text-[#1D2B53] font-heading text-[8px] uppercase"
          >
            {isExternal ? 'App' : 'Clock'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating PICO-8 mini-timer overlay supporting both:
 * 1. In-app draggable overlay across all tabs (via Portal to document.body).
 * 2. External always-on-top / detached window draggable outside the browser tab/app.
 */
export default function FloatingTimerOverlay({
  timer,
  external,
  onJumpToClock,
  onClose,
}: FloatingTimerOverlayProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [position, setPosition] = useState<OverlayPosition | null>(null);

  useEffect(() => {
    if (!timer.isOverlayOpen || position === null) return;

    function handleResize() {
      const card = cardRef.current;
      if (!card) return;
      setPosition((prev) =>
        prev
          ? clampPosition(prev.x, prev.y, card.offsetWidth, card.offsetHeight)
          : null,
      );
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [timer.isOverlayOpen, position]);

  function handleDragPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const originX = position ? position.x : rect.left;
    const originY = position ? position.y : rect.top;

    if (!position) {
      setPosition(clampPosition(originX, originY, rect.width, rect.height));
    }

    dragOriginRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX,
      originY,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragOriginRef.current;
    const card = cardRef.current;
    if (!drag || !card || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPosition(
      clampPosition(
        drag.originX + dx,
        drag.originY + dy,
        card.offsetWidth,
        card.offsetHeight,
      ),
    );
  }

  function handleDragPointerEnd(e: PointerEvent<HTMLDivElement>) {
    const drag = dragOriginRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragOriginRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  // Render inside the external PiP / Pop-out window when active
  if (external.isExternalOpen && external.externalContainer) {
    return createPortal(
      <MiniTimerCard
        timer={timer}
        isExternal
        onJumpToClock={() => {
          try {
            window.focus();
          } catch {
            // Ignore focus restriction
          }
          onJumpToClock();
        }}
        onDockInApp={() => {
          external.closeExternalWindow();
          timer.setIsOverlayOpen(true);
        }}
        onClose={() => {
          external.closeExternalWindow();
          timer.setIsOverlayOpen(false);
        }}
      />,
      external.externalContainer,
    );
  }

  // When external Video PiP is active or overlay is closed, don't duplicate in-app
  if (external.isExternalOpen || !timer.isOverlayOpen) {
    return null;
  }

  return createPortal(
    <aside
      ref={cardRef}
      role="region"
      aria-label="Floating focus timer overlay"
      style={
        position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined
      }
      className={`fixed z-50 w-[218px] sm:w-[238px] ${
        position ? '' : 'bottom-[72px] right-3 sm:right-5'
      }`}
    >
      <MiniTimerCard
        timer={timer}
        isExternal={false}
        errorMessage={external.externalError}
        onJumpToClock={onJumpToClock}
        onPopOut={() => void external.openExternalWindow()}
        onClose={onClose}
        onDragPointerDown={handleDragPointerDown}
        onDragPointerMove={handleDragPointerMove}
        onDragPointerEnd={handleDragPointerEnd}
      />
    </aside>,
    document.body,
  );
}
