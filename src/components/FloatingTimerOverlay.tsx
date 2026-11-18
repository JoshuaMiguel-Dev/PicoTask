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

interface OverlaySize {
  width: number;
  height: number;
}

const VIEWPORT_MARGIN = 8;
const BOTTOM_NAV_CLEARANCE = 68;
const MIN_OVERLAY_WIDTH = 184;
const MAX_OVERLAY_WIDTH = 380;
const MIN_OVERLAY_HEIGHT = 142;
const MAX_OVERLAY_HEIGHT = 280;

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

function clampSize(
  width: number,
  height: number,
  left: number,
  top: number,
): OverlaySize {
  const maxAllowedW = Math.max(
    MIN_OVERLAY_WIDTH,
    Math.min(MAX_OVERLAY_WIDTH, window.innerWidth - left - VIEWPORT_MARGIN),
  );
  const maxAllowedH = Math.max(
    MIN_OVERLAY_HEIGHT,
    Math.min(MAX_OVERLAY_HEIGHT, window.innerHeight - top - BOTTOM_NAV_CLEARANCE),
  );
  return {
    width: Math.min(Math.max(MIN_OVERLAY_WIDTH, width), maxAllowedW),
    height: Math.min(Math.max(MIN_OVERLAY_HEIGHT, height), maxAllowedH),
  };
}

interface MiniTimerCardProps {
  timer: FocusTimerState;
  isExternal: boolean;
  size: OverlaySize | null;
  errorMessage?: string | null;
  onJumpToClock: () => void;
  onPopOut?: () => void;
  onDockInApp?: () => void;
  onClose: () => void;
  onDragPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onDragPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onDragPointerEnd?: (e: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onResizePointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
  onResizePointerEnd?: (e: PointerEvent<HTMLDivElement>) => void;
}

/**
 * Shared PICO-8 mini-timer card rendered inside both the in-app draggable/resizable
 * overlay and the external Document Picture-in-Picture / Pop-out window.
 */
function MiniTimerCard({
  timer,
  isExternal,
  size,
  errorMessage,
  onJumpToClock,
  onPopOut,
  onDockInApp,
  onClose,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerEnd,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerEnd,
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

  const readoutTextClass =
    size && (size.width >= 300 || size.height >= 210)
      ? 'text-2xl'
      : size && (size.width >= 255 || size.height >= 175)
        ? 'text-xl'
        : 'text-base sm:text-lg';

  const isStretched = isExternal || size !== null;

  return (
    <div
      className={
        isExternal
          ? 'relative w-full h-full flex flex-col justify-between bg-[#FFCCAA] border-[3px] border-[#1D2B53] box-border select-none'
          : 'relative w-full h-full flex flex-col justify-between bg-[#FFCCAA] border-[3px] border-[#1D2B53] shadow-[4px_4px_0px_#1D2B53] select-none'
      }
    >
      {/* Title / Drag Handle Bar */}
      <div
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerEnd}
        onPointerCancel={onDragPointerEnd}
        title={isExternal ? 'PicoTask External Timer' : 'Drag to move timer overlay'}
        className={`shrink-0 bg-[#1D2B53] text-[#FFF1E8] border-b-2 border-[#1D2B53] px-2 py-1.5 flex items-center justify-between gap-1.5 ${
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
      <div
        className={
          isStretched
            ? 'flex-1 min-h-0 p-2 flex flex-col justify-between gap-2'
            : 'p-2 space-y-2'
        }
      >
        <div
          className={`bg-[#FFF1E8] border-2 border-[#1D2B53] px-2.5 py-1.5 flex flex-col items-center justify-center ${
            isStretched ? 'flex-1 min-h-0' : ''
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
            className={`font-heading tabular-nums tracking-tight ${readoutTextClass} ${
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

        <div className="shrink-0 grid grid-cols-2 gap-1.5 pr-2">
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

      {/* PICO-8 Corner Resize Grip (In-App Overlay) */}
      {!isExternal && onResizePointerDown && (
        <div
          role="separator"
          aria-label="Resize floating timer overlay"
          title="Drag corner to resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerEnd}
          onPointerCancel={onResizePointerEnd}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none flex items-end justify-end p-0.5"
        >
          <span aria-hidden="true" className="grid grid-cols-2 gap-[1px]">
            <span className="w-[3px] h-[3px] bg-transparent" />
            <span className="w-[3px] h-[3px] bg-[#1D2B53]" />
            <span className="w-[3px] h-[3px] bg-[#1D2B53]" />
            <span className="w-[3px] h-[3px] bg-[#1D2B53]" />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Floating PICO-8 mini-timer overlay supporting both:
 * 1. In-app draggable & resizable overlay across all tabs (via Portal to document.body).
 * 2. Desktop-only external floating window draggable/resizable outside the browser tab/app.
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
  const resizeOriginRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  const [position, setPosition] = useState<OverlayPosition | null>(null);
  const [size, setSize] = useState<OverlaySize | null>(null);

  useEffect(() => {
    if (!timer.isOverlayOpen || (position === null && size === null)) return;

    function handleResize() {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const nextPos = position
        ? clampPosition(position.x, position.y, rect.width, rect.height)
        : null;
      if (nextPos) {
        setPosition(nextPos);
      }
      if (size) {
        const left = nextPos ? nextPos.x : rect.left;
        const top = nextPos ? nextPos.y : rect.top;
        setSize((prev) =>
          prev ? clampSize(prev.width, prev.height, left, top) : null,
        );
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [timer.isOverlayOpen, position, size]);

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

  function handleResizePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const lockedPos = clampPosition(rect.left, rect.top, rect.width, rect.height);
    if (!position) {
      setPosition(lockedPos);
    }

    resizeOriginRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originWidth: rect.width,
      originHeight: rect.height,
      originLeft: lockedPos.x,
      originTop: lockedPos.y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: PointerEvent<HTMLDivElement>) {
    const resize = resizeOriginRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;

    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;
    setSize(
      clampSize(
        resize.originWidth + dx,
        resize.originHeight + dy,
        resize.originLeft,
        resize.originTop,
      ),
    );
  }

  function handleResizePointerEnd(e: PointerEvent<HTMLDivElement>) {
    const resize = resizeOriginRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    resizeOriginRef.current = null;
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
        size={null}
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

  const inlineStyle = {
    ...(position ? { left: `${position.x}px`, top: `${position.y}px` } : {}),
    ...(size ? { width: `${size.width}px`, height: `${size.height}px` } : {}),
  };

  return createPortal(
    <aside
      ref={cardRef}
      role="region"
      aria-label="Floating focus timer overlay"
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
      className={`fixed z-50 ${size ? '' : 'w-[218px] sm:w-[238px]'} ${
        position ? '' : 'bottom-[72px] right-3 sm:right-5'
      }`}
    >
      <MiniTimerCard
        timer={timer}
        isExternal={false}
        size={size}
        errorMessage={external.externalError}
        onJumpToClock={onJumpToClock}
        onPopOut={external.canPopOut ? () => void external.openExternalWindow() : undefined}
        onClose={onClose}
        onDragPointerDown={handleDragPointerDown}
        onDragPointerMove={handleDragPointerMove}
        onDragPointerEnd={handleDragPointerEnd}
        onResizePointerDown={handleResizePointerDown}
        onResizePointerMove={handleResizePointerMove}
        onResizePointerEnd={handleResizePointerEnd}
      />
    </aside>,
    document.body,
  );
}
