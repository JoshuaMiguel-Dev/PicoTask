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

const STAR_DELAY_BY_LABEL: Record<string, string> = {
  HRS: '0s',
  MIN: '2.1s',
  SEC: '4.3s',
};

/**
 * Mechanical split-flap digit tile inspired by classic Braun / PICO-8 desk clocks,
 * with a subtle 8-bit falling star streaking across the dark clock housing.
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

  const starDelay = STAR_DELAY_BY_LABEL[label] ?? '0s';

  return (
    <div className="flex flex-col items-center">
      {/* Outer Dark Navy Split-Flap Housing */}
      <div
        className={`relative bg-[#1D2B53] border-pico-navy flex items-center justify-center overflow-hidden select-none ${boxSizeClasses}`}
      >
        {/* Top half subtle light catch */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 bg-white/5 pointer-events-none"
          aria-hidden="true"
        />

        {/* Twinkling Pixel Stars inside the Dark Clock Housing */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
          <span className="animate-tile-twinkle-1 absolute top-3 left-4 w-1 h-1 bg-[#FFF1E8]" />
          <span className="animate-tile-twinkle-2 absolute top-5 right-5 w-1 h-1 bg-[#29ADFF]" />
          <span className="animate-tile-twinkle-2 absolute bottom-4 left-5 w-1 h-1 bg-[#FFCCAA]" />
          <span className="animate-tile-twinkle-1 absolute bottom-6 right-4 w-1.5 h-1.5 bg-[#FFF1E8]" />
          <span className="animate-tile-twinkle-1 absolute top-1/3 left-3 w-1 h-1 bg-[#29ADFF]/80" />
        </div>

        {/* Falling Pixel Star inside the Dark Clock Housing */}
        <div
          aria-hidden="true"
          style={{ animationDelay: starDelay }}
          className="animate-tile-star absolute -top-2 -right-2 pointer-events-none z-0 flex items-start"
        >
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#FFF1E8]" />
          <span className="w-2 h-1 sm:w-3 sm:h-1 bg-[#29ADFF]/85 -ml-0.5 -mt-0.5" />
          <span className="w-2.5 h-0.5 sm:w-3.5 sm:h-0.5 bg-[#FFCCAA]/60 -ml-0.5 -mt-1" />
        </div>

        {/* Corner pixel rivets */}
        <span
          className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-[#5F574F] z-10"
          aria-hidden="true"
        />
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#5F574F] z-10"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-[#5F574F] z-10"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-[#5F574F] z-10"
          aria-hidden="true"
        />

        {/* Animated Numeral */}
        <span
          key={value}
          className={`relative z-10 animate-flap font-heading tracking-tighter tabular-nums ${textSizeClasses} ${textColor}`}
        >
          {value}
        </span>

        {/* Center horizontal split-flap seam line + side notches */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#0B1228] z-20 pointer-events-none"
          aria-hidden="true"
        />
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-pico-peach z-20"
          aria-hidden="true"
        />
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-pico-peach z-20"
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
