import { useEffect, useRef, type PointerEvent } from 'react';

interface PixelTimeSlotPickerProps {
  /** 24-hour time string in "HH:mm" format, e.g. "08:00", "18:30" */
  value: string;
  onChange: (nextTime: string) => void;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'] as const;
type Period = (typeof PERIODS)[number];

const ITEM_HEIGHT = 28;

export function formatTimeSlot12h(time24: string): string {
  const [rawH, rawM] = time24.split(':');
  const h24 = Number.parseInt(rawH || '18', 10);
  const m = Number.parseInt(rawM || '0', 10);
  if (Number.isNaN(h24) || Number.isNaN(m)) return time24;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function parse24hTime(value: string): { hour12: number; minute: number; period: Period } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return { hour12: 6, minute: 0, period: 'PM' };
  }
  const h24 = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  const period: Period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, period };
}

function to24hTime(hour12: number, minute: number, period: Period): string {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface RollerColumnProps<T extends string | number> {
  label: string;
  items: readonly T[];
  selectedValue: T;
  formatItem: (item: T) => string;
  onSelect: (item: T) => void;
}

function RollerColumn<T extends string | number>({
  label,
  items,
  selectedValue,
  formatItem,
  onSelect,
}: RollerColumnProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const isProgrammaticRef = useRef(false);
  const mouseDragRef = useRef<{
    pointerId: number;
    startY: number;
    startScrollTop: number;
    moved: boolean;
  } | null>(null);

  const selectedIndex = Math.max(0, items.indexOf(selectedValue));
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) <= 1) return;

    isProgrammaticRef.current = true;
    el.scrollTop = targetTop;
    const releaseId = window.setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 60);
    return () => window.clearTimeout(releaseId);
  }, [selectedIndex]);

  // Smooth mouse-wheel rolling without scrolling the outer page
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIdx = Math.min(
        items.length - 1,
        Math.max(0, selectedIndexRef.current + direction),
      );
      if (nextIdx === selectedIndexRef.current) return;

      onSelectRef.current(items[nextIdx]);
      isProgrammaticRef.current = true;
      el?.scrollTo({ top: nextIdx * ITEM_HEIGHT, behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 140);
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [items]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  function commitIndexFromScroll(el: HTMLDivElement) {
    const idx = Math.min(
      items.length - 1,
      Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)),
    );
    if (idx !== selectedIndexRef.current) {
      onSelectRef.current(items[idx]);
    }
    return idx;
  }

  function handleScroll() {
    if (isProgrammaticRef.current || mouseDragRef.current) return;
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const el = listRef.current;
      if (el) commitIndexFromScroll(el);
    }, 60);
  }

  function handleMousePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = listRef.current;
    if (!el) return;

    mouseDragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startScrollTop: el.scrollTop,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleMousePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = mouseDragRef.current;
    const el = listRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;

    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 3) {
      drag.moved = true;
    }
    el.scrollTop = drag.startScrollTop - dy;
    commitIndexFromScroll(el);
  }

  function handleMousePointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = mouseDragRef.current;
    const el = listRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const wasMoved = drag.moved;
    mouseDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (el && wasMoved) {
      const idx = commitIndexFromScroll(el);
      isProgrammaticRef.current = true;
      el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 140);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <span className="font-heading text-[6px] sm:text-[7px] uppercase text-pico-gray mb-0.5">
        {label}
      </span>

      <div
        onPointerDown={handleMousePointerDown}
        onPointerMove={handleMousePointerMove}
        onPointerUp={handleMousePointerUp}
        onPointerCancel={handleMousePointerUp}
        className="relative w-full h-[84px] border-2 border-pico-navy bg-white overflow-hidden select-none cursor-ns-resize"
      >
        {/* Center selection band */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[28px] h-[28px] bg-pico-blue/25 border-y-2 border-pico-navy z-10"
        />

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
        >
          <div style={{ height: `${ITEM_HEIGHT}px` }} aria-hidden="true" />
          {items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={String(item)}
                type="button"
                onClick={() => {
                  onSelect(item);
                  const el = listRef.current;
                  if (el) {
                    isProgrammaticRef.current = true;
                    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                    window.setTimeout(() => {
                      isProgrammaticRef.current = false;
                    }, 140);
                  }
                }}
                style={{ height: `${ITEM_HEIGHT}px` }}
                className={`w-full snap-center flex items-center justify-center font-heading tabular-nums cursor-pointer transition-colors ${
                  isSelected
                    ? 'text-[10px] sm:text-xs text-pico-navy'
                    : 'text-[8px] sm:text-[9px] text-pico-gray/65 hover:text-pico-navy'
                }`}
              >
                {formatItem(item)}
              </button>
            );
          })}
          <div style={{ height: `${ITEM_HEIGHT}px` }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact PICO-8 wheel/roller time picker: Hour (1-12), Minute (00-59), and AM/PM.
 * Supports touch swipe, mouse-wheel rolling, and click-drag rolling.
 */
export default function PixelTimeSlotPicker({
  value,
  onChange,
}: PixelTimeSlotPickerProps) {
  const { hour12, minute, period } = parse24hTime(value);

  return (
    <div className="max-w-xs bg-pico-cream border-2 border-pico-navy p-2 space-y-1.5">
      <div className="flex items-center justify-between border-b border-pico-navy/25 pb-1">
        <span className="font-heading text-[7px] uppercase text-pico-navy">
          Roll Time
        </span>
        <span className="bg-pico-navy text-pico-cream px-1.5 py-0.5 font-heading text-[8px] tabular-nums">
          {formatTimeSlot12h(to24hTime(hour12, minute, period))}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <RollerColumn
          label="Hour"
          items={HOURS_12}
          selectedValue={hour12}
          formatItem={(h) => String(h).padStart(2, '0')}
          onSelect={(nextHour) => onChange(to24hTime(nextHour, minute, period))}
        />

        <RollerColumn
          label="Min"
          items={MINUTES_60}
          selectedValue={minute}
          formatItem={(m) => String(m).padStart(2, '0')}
          onSelect={(nextMin) => onChange(to24hTime(hour12, nextMin, period))}
        />

        <RollerColumn
          label="AM/PM"
          items={PERIODS}
          selectedValue={period}
          formatItem={(p) => p}
          onSelect={(nextPeriod) => onChange(to24hTime(hour12, minute, nextPeriod))}
        />
      </div>
    </div>
  );
}
