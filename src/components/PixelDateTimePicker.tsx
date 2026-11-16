import { useState } from 'react';
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
 * Custom PICO-8 Pixel Calendar & Time Picker that replaces the browser's default
 * white/blue `<input type="datetime-local">` and `<input type="date">` popups.
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
    : format(safeDate, 'EEE, MMM d, yyyy // hh:mm a').toUpperCase();

  return (
    <div className="space-y-2">
      {/* Main Trigger Bar (Replaces native datetime-local input) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setViewMonth(startOfMonth(safeDate));
            setIsOpen((prev) => !prev);
          }}
          aria-expanded={isOpen}
          className="pixel-btn flex-1 min-h-11 px-3 py-2 bg-white text-pico-navy flex items-center justify-between gap-2 text-left"
        >
          <span className="font-heading text-[10px] sm:text-xs text-pico-navy tabular-nums truncate">
            {displayLabel}
          </span>
          <span className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[8px] uppercase shrink-0">
            {isOpen ? '[Close]' : '[Pick]'}
          </span>
        </button>
      </div>

      {/* Quick 1-Tap Deadline Presets (When in Date+Time mode) */}
      {!dateOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-heading text-[8px] uppercase text-pico-gray mr-0.5">
            Quick:
          </span>
          <button
            type="button"
            onClick={() => applyQuickPreset(0, 18, 0)}
            className="border-2 border-pico-navy bg-pico-cream hover:bg-pico-blue px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
          >
            Today 6PM
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(0, 23, 59)}
            className="border-2 border-pico-navy bg-pico-cream hover:bg-pico-blue px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
          >
            Tonight 11:59PM
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(1, 9, 0)}
            className="border-2 border-pico-navy bg-pico-cream hover:bg-pico-blue px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
          >
            Tmrw 9AM
          </button>
          <button
            type="button"
            onClick={() => applyQuickPreset(1, 18, 0)}
            className="border-2 border-pico-navy bg-pico-cream hover:bg-pico-blue px-2 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
          >
            Tmrw 6PM
          </button>
        </div>
      )}

      {/* Custom PICO-8 Pixel Calendar + Time Picker Panel */}
      {isOpen && (
        <div className="pixel-card p-3 sm:p-4 bg-pico-cream space-y-4">
          <div
            className={`grid grid-cols-1 ${
              dateOnly ? '' : 'md:grid-cols-12'
            } gap-4`}
          >
            {/* LEFT / TOP: PICO-8 Mini Month Calendar Grid */}
            <div className={dateOnly ? 'w-full' : 'md:col-span-7 space-y-2'}>
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between bg-pico-navy text-pico-cream px-2 py-1.5 border-2 border-pico-navy">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                  className="px-2 py-0.5 bg-pico-peach text-pico-navy font-heading text-[9px] cursor-pointer"
                >
                  &lt;
                </button>
                <span className="font-heading text-[9px] sm:text-[10px] uppercase">
                  {format(viewMonth, 'MMMM yyyy')}
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

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-center font-heading text-[8px] text-pico-gray py-0.5"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Day Buttons */}
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
                      className={`h-8 border-2 border-pico-navy font-heading text-[9px] tabular-nums flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-pico-red text-pico-cream shadow-[2px_2px_0px_#1D2B53] -translate-x-0.5 -translate-y-0.5'
                          : today
                            ? 'bg-pico-peach text-pico-navy underline decoration-2'
                            : inMonth
                              ? 'bg-white text-pico-navy hover:bg-pico-blue'
                              : 'bg-pico-cream/50 text-pico-gray opacity-45'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Footer: Today & Clear */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewMonth(startOfMonth(now));
                    handleDayClick(now);
                  }}
                  className="pixel-btn px-2.5 py-1 bg-pico-peach text-pico-navy font-heading text-[8px] uppercase"
                >
                  Jump to Today
                </button>

                {dateOnly && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="pixel-btn px-3 py-1 bg-pico-green text-pico-cream font-heading text-[8px] uppercase"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT / BOTTOM: PICO-8 Pixel Time Matrix (Only if !dateOnly) */}
            {!dateOnly && (
              <div className="md:col-span-5 border-t-2 md:border-t-0 md:border-l-2 border-pico-navy pt-3 md:pt-0 md:pl-4 flex flex-col justify-between space-y-3">
                {/* Digital Time Readout + AM/PM Switch */}
                <div className="space-y-2">
                  <div className="bg-pico-navy text-pico-cream border-2 border-pico-navy p-2 flex items-center justify-between">
                    <span className="font-heading text-[8px] text-pico-peach uppercase">
                      TIME
                    </span>
                    <span className="font-heading text-xs text-pico-cream tabular-nums">
                      {format(safeDate, 'hh:mm a')}
                    </span>
                  </div>

                  {/* AM / PM Toggle */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAmPmToggle(false)}
                      className={`pixel-btn py-1.5 font-heading text-[9px] uppercase ${
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
                      className={`pixel-btn py-1.5 font-heading text-[9px] uppercase ${
                        isPm
                          ? 'bg-pico-blue text-pico-navy'
                          : 'bg-white text-pico-navy'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Hour Picker Grid (12, 1..11) */}
                <div>
                  <span className="block font-heading text-[8px] uppercase text-pico-gray mb-1">
                    Hour
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {HOURS_12.map((h) => {
                      const active = currentHour12 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleHourSelect(h)}
                          className={`h-7 border-2 border-pico-navy font-heading text-[9px] tabular-nums cursor-pointer ${
                            active
                              ? 'bg-pico-red text-pico-cream'
                              : 'bg-white text-pico-navy hover:bg-pico-peach'
                          }`}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minute Picker Grid (:00, :15, :30, :45, :59) + +/-5m */}
                <div>
                  <span className="block font-heading text-[8px] uppercase text-pico-gray mb-1">
                    Minute
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    {MINUTE_STEPS.map((m) => {
                      const active = currentMinute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMinuteSelect(m)}
                          className={`h-7 border-2 border-pico-navy font-heading text-[9px] tabular-nums cursor-pointer ${
                            active
                              ? 'bg-pico-green text-pico-cream'
                              : 'bg-white text-pico-navy hover:bg-pico-peach'
                          }`}
                        >
                          :{String(m).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="pixel-btn w-full py-2 bg-pico-green text-pico-cream font-heading text-[9px] uppercase"
                >
                  [Confirm Deadline]
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
