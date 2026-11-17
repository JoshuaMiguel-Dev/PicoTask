interface FlipDigitCardProps {
  /** Two-character string for the unit, e.g. "09", "42", "58" */
  value: string;
  /** Label shown underneath or inside the housing, e.g. "HRS", "MIN", "SEC" */
  label: string;
  /** Optional accent style for seconds or urgent state */
  accent?: 'default' | 'red' | 'blue';
  /** 'normal' for standard page card, 'fullscreen' for giant horizontal desk mode */
  size?: 'normal' | 'fullscreen';
}

/**
 * Mechanical split-flap digit tile inspired by classic Braun / PICO-8 desk clocks.
 */
export default function FlipDigitCard({
  value,
  label,
  accent = 'default',
  size = 'normal',
}: FlipDigitCardProps) {
  const textColor =
    accent === 'red'
      ? 'text-[#FF004D]'
      : accent === 'blue'
        ? 'text-[#29ADFF]'
        : 'text-[#FFF1E8]';

  const boxSizeClasses =
    size === 'fullscreen'
      ? 'w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52 border-4 shadow-[6px_6px_0px_#0B1228]'
      : 'w-24 h-24 sm:w-36 sm:h-36 border-4 shadow-[4px_4px_0px_#5F574F]';

  const textSizeClasses =
    size === 'fullscreen'
      ? 'text-4xl sm:text-6xl md:text-7xl'
      : 'text-3xl sm:text-5xl';

  return (
    <div className="flex flex-col items-center">
      {/* Outer Dark Navy Split-Flap Housing (Always dark charcoal/navy in both light & dark themes) */}
      <div
        className={`relative bg-[#1D2B53] border-pico-navy flex items-center justify-center overflow-hidden select-none ${boxSizeClasses}`}
      >
        {/* Top half subtle light catch */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 bg-white/5 pointer-events-none"
          aria-hidden="true"
        />

        {/* Corner pixel rivets */}
        <span
          className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-[#5F574F]"
          aria-hidden="true"
        />
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#5F574F]"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-[#5F574F]"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-[#5F574F]"
          aria-hidden="true"
        />

        {/* Animated Numeral */}
        <span
          key={value}
          className={`animate-flap font-heading tracking-tighter tabular-nums ${textSizeClasses} ${textColor}`}
        >
          {value}
        </span>

        {/* Center horizontal split-flap seam line + side notches */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#0B1228] z-10 pointer-events-none"
          aria-hidden="true"
        />
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-pico-peach z-10"
          aria-hidden="true"
        />
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-pico-peach z-10"
          aria-hidden="true"
        />
      </div>

      {/* Unit Label Tag */}
      <span className="mt-2 bg-pico-peach border-2 border-pico-navy px-2 py-0.5 font-heading text-[9px] sm:text-[10px] uppercase text-pico-navy">
        {label}
      </span>
    </div>
  );
}
