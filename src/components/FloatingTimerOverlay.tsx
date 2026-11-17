import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { formatDurationBadge, type FocusTimerState } from '../hooks/useFocusTimer';

interface FloatingTimerOverlayProps {
  timer: FocusTimerState;
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

/**
 * Draggable PICO-8 mini-timer floating overlay rendered via React Portal.
 * Stays visible across all tabs and keeps clear of the bottom navigation bar on mobile.
 */
export default function FloatingTimerOverlay({
  timer,
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

  if (!timer.isOverlayOpen) return null;

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
    ? 'bg-pico-green'
    : timer.isCompleted
      ? 'bg-pico-red'
      : timer.elapsedSeconds > 0
        ? 'bg-pico-orange'
        : 'bg-pico-blue';

  const startBtnLabel = timer.isRunning
    ? 'Pause'
    : timer.isCompleted
      ? 'Restart'
      : timer.elapsedSeconds > 0
        ? 'Resume'
        : 'Start';

  return createPortal(
    <aside
      ref={cardRef}
      role="region"
      aria-label="Floating focus timer overlay"
      style={
        position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined
      }
      className={`fixed z-50 w-[212px] sm:w-[232px] bg-[#FFCCAA] border-[3px] border-[#1D2B53] shadow-[4px_4px_0px_#1D2B53] select-none ${
        position ? '' : 'bottom-[72px] right-3 sm:right-5'
      }`}
    >
      {/* Draggable Title Bar */}
      <div
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerEnd}
        onPointerCancel={handleDragPointerEnd}
        title="Drag to move timer overlay"
        className="bg-[#1D2B53] text-[#FFF1E8] border-b-2 border-[#1D2B53] px-2 py-1.5 flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing touch-none"
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

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          aria-label="Hide floating timer overlay"
          title="Hide overlay (timer keeps running)"
          className="pixel-btn min-w-6 min-h-6 px-1.5 py-0.5 bg-[#FF004D] text-[#FFF1E8] border-[#FFF1E8] font-heading text-[8px] leading-none flex items-center justify-center shrink-0"
        >
          X
        </button>
      </div>

      {/* Cream Readout + Compact Action Controls */}
      <div className="p-2 space-y-2">
        <div className="bg-[#FFF1E8] border-2 border-[#1D2B53] px-2.5 py-1.5 flex flex-col items-center">
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
            title="Jump to Clock & Timer tab"
            className="pixel-btn min-h-8 px-1.5 py-1 bg-[#29ADFF] text-[#1D2B53] font-heading text-[8px] uppercase"
          >
            Clock
          </button>
        </div>
      </div>
    </aside>,
    document.body,
  );
}
