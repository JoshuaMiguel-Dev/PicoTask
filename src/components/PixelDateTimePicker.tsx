import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

interface PixelDateTimePickerProps {
  /** ISO-like string: "YYYY-MM-DDTHH:mm" (or "YYYY-MM-DD" when dateOnly is true) */
  value: string;
  onChange: (nextValue: string) => void;
  /** If true, only shows the PICO-8 calendar grid without the time selector (used in Finance) */
  dateOnly?: boolean;
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTE_STEPS = [0, 15, 30, 45, 59] as const;

/**
 * Custom PICO-8 Pixel Calendar & Time Picker.
 * Opens as a locked centered modal (`createPortal` with `fixed inset-0`) so it never
 * shifts layout or drags around inside mobile forms.
 */
export default function PixelDateTimePicker({
  value,
  onChange,
  dateOnly = false,
}: PixelDateTimePickerProps) {
  const parsedInitial = value ? parseISO(value) : new Date();
  const safeDate = Number.isNaN(parsedInitial.getTime())
    ? new Date()
    : parsedInitial;

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(safeDate),
  );

  // Extract 12-hour clock components from `safeDate`
  const currentHour24 = safeDate.getHours();
  const currentMinute = safeDate.getMinutes();
  const isPm = currentHour24 >= 12;
  const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;

  function emitDateChange(nextDate: Date) {
    if (dateOnly) {
      onChange(format(nextDate, 'yyyy-MM-dd'));
    } else {
      onChange(format(nextDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }

  function handleDayClick(day: Date) {
    const updated = new Date(safeDate);
    updated.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    emitDateChange(updated);
    if (dateOnly) {
      setIsOpen(false);
    }
  }

  function handleHourSelect(hour12: number, targetPm: boolean = isPm) {
    let hour24 = hour12 % 12;
    if (targetPm) hour24 += 12;
    const updated = setHours(safeDate, hour24);
    emitDateChange(updated);
  }

  function handleMinuteSelect(min: number) {
    const updated = setMinutes(safeDate, min);
    emitDateChange(updated);
  }

  function handleAmPmToggle(nextPm: boolean) {
    handleHourSelect(currentHour12, nextPm);
  }

  function applyQuickPreset(daysOffset: number, hour24: number, min: number) {
    const base = addDays(new Date(), daysOffset);
    base.setHours(hour24, min, 0, 0);
    setViewMonth(startOfMonth(base));
    emitDateChange(base);
  }

  // Build 7-column calendar days
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const displayLabel = dateOnly
    ? format(safeDate, 'EEE, MMM d, yyyy').toUpperCase()
    : format(safeDate, 'MMM d, yyyy // hh:mm a').toUpperCase();

  return (
    <div className="space-y-2 w-full">
      {/* Main Trigger Bar */}
      <button
        type="button"
        onClick={() => {
          setViewMonth(startOfMonth(safeDate));
          setIsOpen(true);
        }}
        className="pixel-btn w-full min-h-11 px-3 py-2 bg-white text-pico-navy flex items-center justify-between gap-2 text-left"
      >
        <span className="font-heading text-[9px] sm:text-xs text-pico-navy tabular-nums truncate">
          {displayLabel}
        </span>
        <span className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[8px] uppercase shrink-0">
          [Pick]
        </span>
      </button>

      {/* Quick 1-Tap Deadline Presets */}
      {!dateOnly && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => applyQuickPreset(0, 18, 0)}
            className="border-2 border-pico-navy bg-pico-cream active:bg-pico-blue py-1 font-heading text-[8px] uppercase text-pico-navy text-center cursor-pointer"
          >
            Today 6PM
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(0, 23, 59)}
            className="border-2 border-pico-navy bg-pico-cream active:bg-pico-blue py-1 font-heading text-[8px] uppercase text-pico-navy text-center cursor-pointer"
          >
            Tonight 11:59P
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(1, 9, 0)}
            className="border-2 border-pico-navy bg-pico-cream active:bg-pico-blue py-1 font-heading text-[8px] uppercase text-pico-navy text-center cursor-pointer"
          >
            Tmrw 9AM
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(1, 18, 0)}
            className="border-2 border-pico-navy bg-pico-cream active:bg-pico-blue py-1 font-heading text-[8px] uppercase text-pico-navy text-center cursor-pointer"
          >
            Tmrw 6PM
          </button>
        </div>
      )}

      {/* Locked Centered PICO-8 Date & Time Modal (Never drags or overflows mobile screens) */}
      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pick date and time"
            className="fixed inset-0 z-[9999] bg-pico-navy/80 p-3 flex items-center justify-center overflow-hidden touch-none"
          >
            <div className="w-full max-w-sm pixel-card-peach p-3.5 space-y-3 border-4 border-pico-navy">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
                <span className="font-heading text-[9px] uppercase text-pico-navy truncate">
                  {displayLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="pixel-btn px-2 py-0.5 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
                >
                  X
                </button>
              </div>

              {/* 1. PICO-8 Mini Month Calendar Grid */}
              <div className="bg-pico-cream border-2 border-pico-navy p-2 space-y-1.5">
                <div className="flex items-center justify-between bg-pico-navy text-pico-cream px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => subMonths(m, 1))}
                    aria-label="Previous month"
                    className="px-2 py-0.5 bg-pico-peach text-pico-navy font-heading text-[9px] cursor-pointer"
                  >
                    &lt;
                  </button>
                  <span className="font-heading text-[9px] uppercase">
                    {format(viewMonth, 'MMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    aria-label="Next month"
                    className="px-2 py-0.5 bg-pico-peach text-pico-navy font-heading text-[9px] cursor-pointer"
                  >
                    &gt;
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-center font-heading text-[7px] text-pico-gray py-0.5"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calDays.map((day) => {
                    const isSelected = isSameDay(day, safeDate);
                    const inMonth = isSameMonth(day, monthStart);
                    const today = isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className={`h-7 border border-pico-navy font-heading text-[8px] tabular-nums flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-pico-red text-pico-cream'
                            : today
                              ? 'bg-pico-peach text-pico-navy underline'
                              : inMonth
                                ? 'bg-white text-pico-navy'
                                : 'bg-pico-cream/40 text-pico-gray opacity-40'
                        }`}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. PICO-8 Compact Time Matrix (Only when !dateOnly) */}
              {!dateOnly && (
                <div className="bg-pico-cream border-2 border-pico-navy p-2 space-y-2">
                  {/* Hour Row + AM/PM */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-[8px] uppercase text-pico-navy">
                      Hour:
                    </span>
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleAmPmToggle(false)}
                        className={`px-2 py-0.5 border border-pico-navy font-heading text-[8px] uppercase cursor-pointer ${
                          !isPm
                            ? 'bg-pico-blue text-pico-navy'
                            : 'bg-white text-pico-navy'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAmPmToggle(true)}
                        className={`px-2 py-0.5 border border-pico-navy font-heading text-[8px] uppercase cursor-pointer ${
                          isPm
                            ? 'bg-pico-blue text-pico-navy'
                            : 'bg-white text-pico-navy'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {HOURS_12.map((h) => {
                      const active = currentHour12 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleHourSelect(h)}
                          className={`h-7 border border-pico-navy font-heading text-[8px] tabular-nums cursor-pointer ${
                            active
                              ? 'bg-pico-red text-pico-cream'
                              : 'bg-white text-pico-navy'
                          }`}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Minute Row */}
                  <div className="grid grid-cols-5 gap-1 pt-1 border-t border-pico-navy/20">
                    {MINUTE_STEPS.map((m) => {
                      const active = currentMinute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMinuteSelect(m)}
                          className={`h-7 border border-pico-navy font-heading text-[8px] tabular-nums cursor-pointer ${
                            active
                              ? 'bg-pico-green text-pico-cream'
                              : 'bg-white text-pico-navy'
                          }`}
                        >
                          :{String(m).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Confirm Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="pixel-btn w-full min-h-10 py-2 bg-pico-green text-pico-cream font-heading text-[9px] uppercase"
              >
                [Confirm]
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
