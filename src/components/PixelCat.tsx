import type { CatMood } from '../utils/streakUtils';

interface PixelCatProps {
  mood: CatMood;
  /** Optional size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the user just tapped/petted the cat */
  isPetted?: boolean;
}

/**
 * Original 8-bit Pixel Art Cat drawn strictly with crisp SVG `<rect>` coordinates
 * using the official PICO-8 palette:
 * - Outline & Eyes: Navy `#1D2B53`
 * - Primary Fur: Peach `#FFCCAA` & Orange `#FFA300` tabby stripes
 * - Belly / Highlight: Cream `#FFF1E8`
 * - Nose / Heart: Red-Pink `#FF004D`
 * - Tears / Zzz: Blue `#29ADFF`
 */
export default function PixelCat({
  mood,
  size = 'md',
  isPetted = false,
}: PixelCatProps) {
  const dimensions = {
    sm: 'w-14 h-12',
    md: 'w-20 h-16',
    lg: 'w-24 h-20',
  }[size];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 20"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Pixel companion cat feeling ${mood}`}
      className={`${dimensions} select-none transition-transform duration-150 ${
        isPetted ? '-translate-y-1' : ''
      }`}
    >
      {/* --- MOOD: SLEEPY (Curled loaf posture + floating Blue Zzz) --- */}
      {mood === 'sleepy' ? (
        <g>
          {/* Floating Zzz in PICO Blue */}
          <rect x="17" y="2" width="3" height="1" fill="#29ADFF" />
          <rect x="18" y="3" width="1" height="1" fill="#29ADFF" />
          <rect x="17" y="4" width="3" height="1" fill="#29ADFF" />

          <rect x="20" y="5" width="2" height="1" fill="#29ADFF" />
          <rect x="20" y="6" width="2" height="1" fill="#29ADFF" />

          {/* Ears (Navy outline + Orange/Peach inner) */}
          <rect x="4" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="5" y="8" width="1" height="1" fill="#FFA300" />
          <rect x="11" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="12" y="8" width="1" height="1" fill="#FFA300" />

          {/* Curled Body Outline (Navy) */}
          <rect x="3" y="9" width="16" height="8" fill="#1D2B53" />
          <rect x="2" y="11" width="18" height="5" fill="#1D2B53" />

          {/* Curled Body Fill (Peach fur + Orange stripes) */}
          <rect x="4" y="10" width="14" height="6" fill="#FFCCAA" />
          <rect x="3" y="11" width="16" height="4" fill="#FFCCAA" />

          {/* Tabby Stripes on Back */}
          <rect x="14" y="10" width="2" height="3" fill="#FFA300" />
          <rect x="17" y="11" width="1" height="3" fill="#FFA300" />
          <rect x="8" y="10" width="2" height="1" fill="#FFA300" />

          {/* Closed Sleeping Eyes (- -) */}
          <rect x="5" y="12" width="2" height="1" fill="#1D2B53" />
          <rect x="11" y="12" width="2" height="1" fill="#1D2B53" />

          {/* Pink Nose */}
          <rect x="8" y="13" width="2" height="1" fill="#FF004D" />

          {/* Curled Tail Tucked in Front */}
          <rect x="13" y="14" width="5" height="1" fill="#1D2B53" />
          <rect x="14" y="15" width="4" height="1" fill="#FFA300" />
        </g>
      ) : (
        /* --- MOODS: HAPPY, NEUTRAL, SAD (Sitting Posture) --- */
        <g>
          {/* Floating Heart when HAPPY or PETTED */}
          {(mood === 'happy' || isPetted) && (
            <g>
              <rect x="18" y="2" width="2" height="1" fill="#FF004D" />
              <rect x="21" y="2" width="2" height="1" fill="#FF004D" />
              <rect x="17" y="3" width="7" height="2" fill="#FF004D" />
              <rect x="18" y="5" width="5" height="1" fill="#FF004D" />
              <rect x="19" y="6" width="3" height="1" fill="#FF004D" />
              <rect x="20" y="7" width="1" height="1" fill="#FF004D" />
            </g>
          )}

          {/* Ears: Droopy if SAD, Perky if HAPPY/NEUTRAL */}
          {mood === 'sad' ? (
            <g>
              {/* Flattened droopy ears */}
              <rect x="3" y="4" width="4" height="2" fill="#1D2B53" />
              <rect x="4" y="5" width="2" height="1" fill="#FFA300" />
              <rect x="13" y="4" width="4" height="2" fill="#1D2B53" />
              <rect x="14" y="5" width="2" height="1" fill="#FFA300" />
            </g>
          ) : (
            <g>
              {/* Perky pointed ears */}
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

          {/* Head Fill (Peach fur + Orange forehead stripes) */}
          <rect x="4" y="5" width="12" height="6" fill="#FFCCAA" />
          <rect x="3" y="6" width="14" height="4" fill="#FFCCAA" />
          <rect x="9" y="5" width="2" height="2" fill="#FFA300" />
          <rect x="4" y="5" width="2" height="1" fill="#FFA300" />
          <rect x="14" y="5" width="2" height="1" fill="#FFA300" />

          {/* Whiskers */}
          <rect x="1" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="1" y="10" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="10" width="2" height="1" fill="#1D2B53" />

          {/* Eyes by Mood */}
          {mood === 'happy' || isPetted ? (
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
          {mood === 'sad' ? (
            <rect x="9" y="10" width="2" height="1" fill="#1D2B53" />
          ) : (
            <g>
              <rect x="8" y="9" width="1" height="1" fill="#1D2B53" />
              <rect x="11" y="9" width="1" height="1" fill="#1D2B53" />
            </g>
          )}

          {/* Sitting Torso & Paws */}
          <rect x="5" y="12" width="10" height="6" fill="#1D2B53" />
          <rect x="6" y="12" width="8" height="5" fill="#FFCCAA" />
          {/* Cream Chest Patch */}
          <rect x="8" y="12" width="4" height="3" fill="#FFF1E8" />
          {/* Front Paws */}
          <rect x="6" y="16" width="3" height="2" fill="#FFF1E8" />
          <rect x="11" y="16" width="3" height="2" fill="#FFF1E8" />
          <rect x="5" y="18" width="10" height="1" fill="#1D2B53" />

          {/* Tail (High & perky when happy/neutral, low when sad) */}
          {mood === 'sad' ? (
            <g>
              <rect x="15" y="16" width="4" height="2" fill="#1D2B53" />
              <rect x="15" y="16" width="3" height="1" fill="#FFA300" />
            </g>
          ) : (
            <g>
              <rect x="15" y="14" width="3" height="3" fill="#1D2B53" />
              <rect x="17" y="11" width="3" height="4" fill="#1D2B53" />
              <rect x="18" y="9" width="2" height="2" fill="#1D2B53" />
              <rect x="16" y="15" width="2" height="1" fill="#FFA300" />
              <rect x="18" y="11" width="1" height="3" fill="#FFA300" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
