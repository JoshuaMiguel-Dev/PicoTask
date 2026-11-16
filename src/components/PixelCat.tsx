import type { CatMood } from '../utils/streakUtils';

interface PixelCatProps {
  mood: CatMood;
  /** Optional size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the user just tapped/petted the cat */
  isPetted?: boolean;
  /** Triggered on every 5th pat combo */
  isSuperCombo?: boolean;
}

/**
 * Original 8-bit Pixelated Gray Cat drawn strictly with crisp SVG `<rect>` coordinates:
 * - Outline & Eyes: Dark Navy `#1D2B53`
 * - Primary Fur: Classic Gray `#7E7872` & Darker Gray `#5F574F` tabby stripes
 * - Chest / Paws / Highlight: Silver-Gray `#C2C3C7` & Cream `#FFF1E8`
 * - Nose / Inner Ears / Heart: Pink `#FF004D`
 * - Tears / Zzz: Blue `#29ADFF`
 */
export default function PixelCat({
  mood,
  size = 'md',
  isPetted = false,
  isSuperCombo = false,
}: PixelCatProps) {
  const dimensions = {
    sm: 'w-14 h-12',
    md: 'w-20 h-16',
    lg: 'w-24 h-20',
  }[size];

  const animClass = isSuperCombo
    ? 'animate-cat-super'
    : isPetted
      ? 'animate-cat-pat'
      : 'transition-transform duration-150';

  const isActiveReaction = isPetted || isSuperCombo;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 20"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Pixel gray companion cat feeling ${mood}`}
      className={`${dimensions} select-none ${animClass}`}
    >
      {/* --- MOOD: SLEEPY (Curled gray loaf posture + floating Blue Zzz) --- */}
      {mood === 'sleepy' && !isActiveReaction ? (
        <g>
          {/* Floating Zzz in PICO Blue */}
          <rect x="17" y="2" width="3" height="1" fill="#29ADFF" />
          <rect x="18" y="3" width="1" height="1" fill="#29ADFF" />
          <rect x="17" y="4" width="3" height="1" fill="#29ADFF" />

          <rect x="20" y="5" width="2" height="1" fill="#29ADFF" />
          <rect x="20" y="6" width="2" height="1" fill="#29ADFF" />

          {/* Ears (Navy outline + Pink/Gray inner) */}
          <rect x="4" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="5" y="8" width="1" height="1" fill="#FF004D" />
          <rect x="11" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="12" y="8" width="1" height="1" fill="#FF004D" />

          {/* Curled Body Outline (Navy) */}
          <rect x="3" y="9" width="16" height="8" fill="#1D2B53" />
          <rect x="2" y="11" width="18" height="5" fill="#1D2B53" />

          {/* Curled Body Fill (Gray fur + Silver belly highlight) */}
          <rect x="4" y="10" width="14" height="6" fill="#7E7872" />
          <rect x="3" y="11" width="16" height="4" fill="#7E7872" />
          <rect x="6" y="13" width="6" height="2" fill="#C2C3C7" />

          {/* Dark Gray Tabby Stripes on Back */}
          <rect x="14" y="10" width="2" height="3" fill="#5F574F" />
          <rect x="17" y="11" width="1" height="3" fill="#5F574F" />
          <rect x="8" y="10" width="2" height="1" fill="#5F574F" />

          {/* Closed Sleeping Eyes (- -) */}
          <rect x="5" y="12" width="2" height="1" fill="#1D2B53" />
          <rect x="11" y="12" width="2" height="1" fill="#1D2B53" />

          {/* Pink Nose */}
          <rect x="8" y="13" width="2" height="1" fill="#FF004D" />

          {/* Curled Tail Tucked in Front */}
          <rect x="13" y="14" width="5" height="1" fill="#1D2B53" />
          <rect x="14" y="15" width="4" height="1" fill="#5F574F" />
        </g>
      ) : (
        /* --- MOODS: HAPPY, NEUTRAL, SAD (Sitting Gray Cat Posture) --- */
        <g>
          {/* Floating Heart when HAPPY or PETTED */}
          {(mood === 'happy' || isActiveReaction) && (
            <g className={isActiveReaction ? 'animate-heart-float' : ''}>
              <rect x="18" y="2" width="2" height="1" fill="#FF004D" />
              <rect x="21" y="2" width="2" height="1" fill="#FF004D" />
              <rect x="17" y="3" width="7" height="2" fill="#FF004D" />
              <rect x="18" y="5" width="5" height="1" fill="#FF004D" />
              <rect x="19" y="6" width="3" height="1" fill="#FF004D" />
              <rect x="20" y="7" width="1" height="1" fill="#FF004D" />
            </g>
          )}

          {/* Extra left sparkle when patted, plus rainbow pixel confetti on 5x Super Combo */}
          {isActiveReaction && (
            <g className="animate-heart-float">
              <rect x="1" y="2" width="1" height="3" fill="#FFA300" />
              <rect x="0" y="3" width="3" height="1" fill="#FFA300" />
            </g>
          )}
          {isSuperCombo && (
            <g>
              <rect x="1" y="14" width="2" height="2" fill="#29ADFF" />
              <rect x="21" y="13" width="2" height="2" fill="#008751" />
              <rect x="9" y="1" width="2" height="2" fill="#FFA300" />
            </g>
          )}

          {/* Ears: Droopy if SAD, Perky if HAPPY/NEUTRAL */}
          {mood === 'sad' && !isActiveReaction ? (
            <g>
              <rect x="3" y="4" width="4" height="2" fill="#1D2B53" />
              <rect x="4" y="5" width="2" height="1" fill="#5F574F" />
              <rect x="13" y="4" width="4" height="2" fill="#1D2B53" />
              <rect x="14" y="5" width="2" height="1" fill="#5F574F" />
            </g>
          ) : (
            <g>
              <rect x="4" y="2" width="2" height="1" fill="#1D2B53" />
              <rect x="3" y="3" width="4" height="2" fill="#1D2B53" />
              <rect x="4" y="4" width="2" height="1" fill="#FF004D" />

              <rect x="14" y="2" width="2" height="1" fill="#1D2B53" />
              <rect x="13" y="3" width="4" height="2" fill="#1D2B53" />
              <rect x="14" y="4" width="2" height="1" fill="#FF004D" />
            </g>
          )}

          {/* Head Outline (Navy) */}
          <rect x="3" y="5" width="14" height="7" fill="#1D2B53" />
          <rect x="2" y="6" width="16" height="5" fill="#1D2B53" />

          {/* Head Fill (Gray fur + Dark Gray forehead tabby stripes + Silver muzzle) */}
          <rect x="4" y="5" width="12" height="6" fill="#7E7872" />
          <rect x="3" y="6" width="14" height="4" fill="#7E7872" />
          <rect x="6" y="8" width="8" height="3" fill="#C2C3C7" />
          <rect x="9" y="5" width="2" height="2" fill="#5F574F" />
          <rect x="4" y="5" width="2" height="1" fill="#5F574F" />
          <rect x="14" y="5" width="2" height="1" fill="#5F574F" />

          {/* Whiskers */}
          <rect x="1" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="1" y="10" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="10" width="2" height="1" fill="#1D2B53" />

          {/* Eyes by Mood */}
          {isSuperCombo ? (
            <g>
              {/* Starry / Excited > < pixel eyes on 5x Combo */}
              <rect x="5" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="6" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="5" y="8" width="1" height="1" fill="#1D2B53" />

              <rect x="14" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="13" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="14" y="8" width="1" height="1" fill="#1D2B53" />

              <rect x="4" y="8" width="2" height="1" fill="#FF004D" />
              <rect x="14" y="8" width="2" height="1" fill="#FF004D" />
            </g>
          ) : mood === 'happy' || isPetted ? (
            <g>
              {/* Happy ^ ^ pixel eyes */}
              <rect x="5" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="6" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="7" y="7" width="1" height="1" fill="#1D2B53" />

              <rect x="12" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="13" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="14" y="7" width="1" height="1" fill="#1D2B53" />

              {/* Rosy cheeks */}
              <rect x="4" y="8" width="2" height="1" fill="#FF004D" />
              <rect x="14" y="8" width="2" height="1" fill="#FF004D" />
            </g>
          ) : mood === 'sad' ? (
            <g>
              {/* Sad watery eyes + Blue pixel tears */}
              <rect x="5" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="5" y="7" width="1" height="1" fill="#FFF1E8" />
              <rect x="5" y="9" width="1" height="2" fill="#29ADFF" />

              <rect x="13" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="13" y="7" width="1" height="1" fill="#FFF1E8" />
              <rect x="14" y="9" width="1" height="2" fill="#29ADFF" />
            </g>
          ) : (
            <g>
              {/* Neutral alert eyes with white pixel shine */}
              <rect x="5" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="5" y="7" width="1" height="1" fill="#FFF1E8" />

              <rect x="13" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="13" y="7" width="1" height="1" fill="#FFF1E8" />
            </g>
          )}

          {/* Nose & Mouth */}
          <rect x="9" y="8" width="2" height="1" fill="#FF004D" />
          {mood === 'sad' && !isActiveReaction ? (
            <rect x="9" y="10" width="2" height="1" fill="#1D2B53" />
          ) : (
            <g>
              <rect x="8" y="9" width="1" height="1" fill="#1D2B53" />
              <rect x="11" y="9" width="1" height="1" fill="#1D2B53" />
            </g>
          )}

          {/* Sitting Torso & Paws */}
          <rect x="5" y="12" width="10" height="6" fill="#1D2B53" />
          <rect x="6" y="12" width="8" height="5" fill="#7E7872" />
          {/* Silver-Gray Chest Patch */}
          <rect x="8" y="12" width="4" height="3" fill="#C2C3C7" />
          {/* Front Paws */}
          <rect x="6" y="16" width="3" height="2" fill="#C2C3C7" />
          <rect x="11" y="16" width="3" height="2" fill="#C2C3C7" />
          <rect x="5" y="18" width="10" height="1" fill="#1D2B53" />

          {/* Tail (High & perky when happy/neutral, wags when petted, low when sad) */}
          {mood === 'sad' && !isActiveReaction ? (
            <g>
              <rect x="15" y="16" width="4" height="2" fill="#1D2B53" />
              <rect x="15" y="16" width="3" height="1" fill="#5F574F" />
            </g>
          ) : (
            <g className={isActiveReaction ? 'animate-tail-wag' : ''}>
              <rect x="15" y="14" width="3" height="3" fill="#1D2B53" />
              <rect x="17" y="11" width="3" height="4" fill="#1D2B53" />
              <rect x="18" y="9" width="2" height="2" fill="#1D2B53" />
              <rect x="16" y="15" width="2" height="1" fill="#7E7872" />
              <rect x="18" y="11" width="1" height="3" fill="#5F574F" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
