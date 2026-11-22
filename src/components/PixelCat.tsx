import type { CatMood } from '../utils/streakUtils';

export type CatVariant = 'gray' | 'ginger' | 'tuxedo' | 'cream';
export type CatAccessory =
  | 'none'
  | 'ribbon'
  | 'crown'
  | 'shades'
  | 'sprout'
  | 'scarf'
  | 'bell'
  | 'beret'
  | 'santa'
  | 'antlers'
  | 'wreath'
  | 'halo'
  | 'wizard'
  | 'headphones'
  | 'monocle'
  | 'wings';

export interface CatAccessoryInfo {
  id: CatAccessory;
  label: string;
  unlockDays: number;
}

export const CAT_VARIANT_STORAGE_KEY = 'pico_cat_variant_v1';
export const CAT_ACCESSORY_STORAGE_KEY = 'pico_cat_accessory_v1';
export const CAT_ACCESSORIES_STORAGE_KEY = 'pico_cat_accessories_v1';

export const CAT_VARIANTS: { id: CatVariant; label: string }[] = [
  { id: 'gray', label: 'Gray' },
  { id: 'ginger', label: 'Ginger' },
  { id: 'tuxedo', label: 'Tuxedo' },
  { id: 'cream', label: 'Siamese' },
];

export const CAT_ACCESSORIES: CatAccessoryInfo[] = [
  { id: 'none', label: 'None', unlockDays: 0 },
  { id: 'ribbon', label: 'Bow', unlockDays: 0 },
  { id: 'crown', label: 'Crown', unlockDays: 0 },
  { id: 'shades', label: 'Shades', unlockDays: 0 },
  { id: 'sprout', label: 'Sprout', unlockDays: 0 },
  { id: 'scarf', label: 'Scarf', unlockDays: 0 },
  { id: 'bell', label: 'Bell', unlockDays: 0 },
  { id: 'beret', label: 'Beret', unlockDays: 0 },
  // Christmas theme cosmetics
  { id: 'santa', label: 'Santa', unlockDays: 0 },
  { id: 'antlers', label: 'Antler', unlockDays: 0 },
  { id: 'wreath', label: 'Wreath', unlockDays: 0 },
  // 5 weekly streak level-up cosmetics (7D, 14D, 21D, 28D, 35D)
  { id: 'halo', label: 'Halo', unlockDays: 7 },
  { id: 'wizard', label: 'Wizard', unlockDays: 14 },
  { id: 'headphones', label: 'Beats', unlockDays: 21 },
  { id: 'monocle', label: 'Monocle', unlockDays: 28 },
  { id: 'wings', label: 'Wings', unlockDays: 35 },
];

export const STARTER_ACCESSORIES = CAT_ACCESSORIES.filter((a) => a.unlockDays === 0);
export const WEEKLY_ACCESSORIES = CAT_ACCESSORIES.filter((a) => a.unlockDays > 0);

export function getSavedCatVariant(): CatVariant {
  const val = localStorage.getItem(CAT_VARIANT_STORAGE_KEY);
  if (val === 'gray' || val === 'ginger' || val === 'tuxedo' || val === 'cream') {
    return val;
  }
  return 'gray';
}

export function getSavedCatAccessory(): CatAccessory {
  const val = localStorage.getItem(CAT_ACCESSORY_STORAGE_KEY);
  if (val && CAT_ACCESSORIES.some((a) => a.id === val)) {
    return val as CatAccessory;
  }
  return 'none';
}

export function getSavedCatAccessories(): CatAccessory[] {
  try {
    const raw = localStorage.getItem(CAT_ACCESSORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (id): id is CatAccessory =>
            typeof id === 'string' &&
            id !== 'none' &&
            CAT_ACCESSORIES.some((a) => a.id === id),
        );
        return Array.from(new Set(valid)).slice(0, 2);
      }
    }
  } catch {
    // Ignore parse errors
  }

  const legacy = getSavedCatAccessory();
  return legacy !== 'none' ? [legacy] : [];
}

export function saveCatAccessories(list: CatAccessory[]): void {
  const clean = Array.from(new Set(list.filter((id) => id !== 'none'))).slice(0, 2);
  localStorage.setItem(CAT_ACCESSORIES_STORAGE_KEY, JSON.stringify(clean));
  localStorage.setItem(CAT_ACCESSORY_STORAGE_KEY, clean[0] ?? 'none');
}

export function toggleAccessorySelection(
  current: CatAccessory[],
  target: CatAccessory,
): CatAccessory[] {
  if (target === 'none') return [];
  if (current.includes(target)) {
    return current.filter((item) => item !== target);
  }
  if (current.length >= 2) {
    return [current[1], target];
  }
  return [...current, target];
}

interface PixelCatProps {
  mood: CatMood;
  size?: 'sm' | 'md' | 'lg';
  isPetted?: boolean;
  isSuperCombo?: boolean;
  secretPhase?: 'idle' | 'vanishing' | 'gone' | 'returning';
  variant?: CatVariant;
  accessory?: CatAccessory;
  accessories?: CatAccessory[];
}

const PALETTES: Record<
  CatVariant,
  { fur: string; stripe: string; chest: string; earInner: string }
> = {
  gray: {
    fur: '#7E7872',
    stripe: '#5F574F',
    chest: '#C2C3C7',
    earInner: '#FF004D',
  },
  ginger: {
    fur: '#FFA300',
    stripe: '#D95700',
    chest: '#FFCCAA',
    earInner: '#FF004D',
  },
  tuxedo: {
    fur: '#2B3654',
    stripe: '#1D2B53',
    chest: '#FFF1E8',
    earInner: '#FF004D',
  },
  cream: {
    fur: '#FFF1E8',
    stripe: '#5F574F',
    chest: '#FFCCAA',
    earInner: '#FF004D',
  },
};

/**
 * Original 8-bit Pixel Cat with 4 coat variants ('gray', 'ginger', 'tuxedo', 'cream')
 * and 5 cosmetic accessories ('none', 'ribbon', 'crown', 'shades', 'sprout').
 */
export default function PixelCat({
  mood,
  size = 'md',
  isPetted = false,
  isSuperCombo = false,
  secretPhase = 'idle',
  variant = 'gray',
  accessory = 'none',
  accessories,
}: PixelCatProps) {
  const equipped = new Set<CatAccessory>(
    accessories && accessories.length > 0
      ? accessories.filter((id) => id !== 'none')
      : accessory !== 'none'
        ? [accessory]
        : [],
  );
  const has = (id: CatAccessory) => equipped.has(id);
  const dimensions = {
    sm: 'w-14 h-12',
    md: 'w-20 h-16',
    lg: 'w-24 h-20',
  }[size];

  if (secretPhase === 'gone') {
    return (
      <div
        className={`${dimensions} flex items-center justify-center font-heading text-[8px] text-pico-gray select-none`}
        aria-label="Cat is hiding"
      >
        ...
      </div>
    );
  }

  const animClass =
    secretPhase === 'vanishing'
      ? 'animate-cat-vanish'
      : secretPhase === 'returning'
        ? 'animate-cat-spin-return'
        : isSuperCombo
          ? 'animate-cat-super'
          : isPetted
            ? 'animate-cat-pat'
            : 'transition-transform duration-150';

  const isActiveReaction =
    isPetted || isSuperCombo || secretPhase === 'returning';
  const colors = PALETTES[variant] ?? PALETTES.gray;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 20"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Pixel ${variant} companion cat feeling ${mood}`}
      className={`${dimensions} select-none ${animClass}`}
    >
      {/* --- MOOD: SLEEPY (Curled loaf posture + floating Blue Zzz) --- */}
      {mood === 'sleepy' && !isActiveReaction ? (
        <g>
          {/* Floating Zzz in PICO Blue */}
          <rect x="17" y="2" width="3" height="1" fill="#29ADFF" />
          <rect x="18" y="3" width="1" height="1" fill="#29ADFF" />
          <rect x="17" y="4" width="3" height="1" fill="#29ADFF" />

          <rect x="20" y="5" width="2" height="1" fill="#29ADFF" />
          <rect x="20" y="6" width="2" height="1" fill="#29ADFF" />

          {/* Ears */}
          <rect x="4" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="5" y="8" width="1" height="1" fill={colors.earInner} />
          <rect x="11" y="7" width="3" height="2" fill="#1D2B53" />
          <rect x="12" y="8" width="1" height="1" fill={colors.earInner} />

          {/* Curled Body Outline */}
          <rect x="3" y="9" width="16" height="8" fill="#1D2B53" />
          <rect x="2" y="11" width="18" height="5" fill="#1D2B53" />

          {/* Curled Body Fill */}
          <rect x="4" y="10" width="14" height="6" fill={colors.fur} />
          <rect x="3" y="11" width="16" height="4" fill={colors.fur} />
          <rect x="6" y="13" width="6" height="2" fill={colors.chest} />

          {/* Stripes on Back */}
          <rect x="14" y="10" width="2" height="3" fill={colors.stripe} />
          <rect x="17" y="11" width="1" height="3" fill={colors.stripe} />
          <rect x="8" y="10" width="2" height="1" fill={colors.stripe} />

          {/* Closed Sleeping Eyes (- -) */}
          <rect x="5" y="12" width="2" height="1" fill="#1D2B53" />
          <rect x="11" y="12" width="2" height="1" fill="#1D2B53" />

          {/* Pink Nose */}
          <rect x="8" y="13" width="2" height="1" fill="#FF004D" />

          {/* Curled Tail Tucked in Front */}
          <rect x="13" y="14" width="5" height="1" fill="#1D2B53" />
          <rect x="14" y="15" width="4" height="1" fill={colors.stripe} />

          {/* Sleeping Head & Neck Accessories */}
          {has('crown') && (
            <g>
              <rect x="7" y="6" width="5" height="2" fill="#FFA300" />
              <rect x="7" y="5" width="1" height="1" fill="#FFA300" />
              <rect x="9" y="5" width="1" height="1" fill="#FFA300" />
              <rect x="11" y="5" width="1" height="1" fill="#FFA300" />
              <rect x="9" y="6" width="1" height="1" fill="#FF004D" />
            </g>
          )}
          {has('sprout') && (
            <g>
              <rect x="8" y="6" width="1" height="3" fill="#008751" />
              <rect x="6" y="5" width="2" height="2" fill="#008751" />
              <rect x="9" y="5" width="2" height="1" fill="#008751" />
            </g>
          )}
          {has('ribbon') && (
            <g>
              <rect x="6" y="14" width="5" height="2" fill="#FF004D" />
              <rect x="8" y="14" width="1" height="2" fill="#FFA300" />
            </g>
          )}
          {has('shades') && (
            <g>
              <rect x="4" y="11" width="10" height="1" fill="#1D2B53" />
              <rect x="4" y="12" width="4" height="2" fill="#1D2B53" />
              <rect x="10" y="12" width="4" height="2" fill="#1D2B53" />
              <rect x="5" y="12" width="1" height="1" fill="#29ADFF" />
              <rect x="11" y="12" width="1" height="1" fill="#29ADFF" />
            </g>
          )}
          {has('scarf') && (
            <g>
              <rect x="4" y="14" width="10" height="2" fill="#29ADFF" />
              <rect x="6" y="14" width="2" height="2" fill="#FFF1E8" />
              <rect x="10" y="15" width="3" height="2" fill="#29ADFF" />
            </g>
          )}
          {has('bell') && (
            <g>
              <rect x="5" y="14" width="8" height="1" fill="#FF004D" />
              <rect x="8" y="15" width="2" height="2" fill="#FFA300" />
            </g>
          )}
          {has('beret') && (
            <g>
              <rect x="5" y="7" width="8" height="2" fill="#FF004D" />
              <rect x="6" y="6" width="6" height="1" fill="#FF004D" />
              <rect x="9" y="5" width="1" height="1" fill="#1D2B53" />
            </g>
          )}
          {has('santa') && (
            <g>
              <rect x="5" y="7" width="8" height="2" fill="#FFF1E8" />
              <rect x="6" y="5" width="6" height="2" fill="#FF004D" />
              <rect x="8" y="4" width="5" height="1" fill="#FF004D" />
              <rect x="13" y="4" width="2" height="2" fill="#FFF1E8" />
            </g>
          )}
          {has('antlers') && (
            <g>
              <rect x="4" y="5" width="1" height="3" fill="#8B4513" />
              <rect x="3" y="4" width="1" height="2" fill="#8B4513" />
              <rect x="13" y="5" width="1" height="3" fill="#8B4513" />
              <rect x="14" y="4" width="1" height="2" fill="#8B4513" />
              <rect x="8" y="13" width="2" height="1" fill="#FF004D" />
            </g>
          )}
          {has('wreath') && (
            <g>
              <rect x="5" y="14" width="8" height="2" fill="#008751" />
              <rect x="6" y="14" width="1" height="1" fill="#FF004D" />
              <rect x="9" y="15" width="1" height="1" fill="#FF004D" />
              <rect x="11" y="14" width="1" height="1" fill="#FFA300" />
            </g>
          )}
          {has('halo') && (
            <g>
              <rect x="6" y="4" width="6" height="1" fill="#FFA300" />
              <rect x="5" y="5" width="1" height="1" fill="#FFA300" />
              <rect x="12" y="5" width="1" height="1" fill="#FFA300" />
              <rect x="6" y="6" width="6" height="1" fill="#FFF1E8" />
            </g>
          )}
          {has('wizard') && (
            <g>
              <rect x="4" y="8" width="10" height="1" fill="#1D2B53" />
              <rect x="6" y="6" width="6" height="2" fill="#29ADFF" />
              <rect x="7" y="4" width="4" height="2" fill="#29ADFF" />
              <rect x="8" y="3" width="2" height="1" fill="#FFA300" />
              <rect x="6" y="7" width="6" height="1" fill="#FFA300" />
            </g>
          )}
          {has('headphones') && (
            <g>
              <rect x="5" y="6" width="8" height="1" fill="#1D2B53" />
              <rect x="3" y="9" width="2" height="4" fill="#FF004D" />
              <rect x="13" y="9" width="2" height="4" fill="#FF004D" />
              <rect x="3" y="10" width="1" height="2" fill="#29ADFF" />
              <rect x="14" y="10" width="1" height="2" fill="#29ADFF" />
            </g>
          )}
          {has('monocle') && (
            <g>
              <rect x="10" y="11" width="4" height="3" fill="#FFA300" />
              <rect x="11" y="12" width="2" height="1" fill="#29ADFF" />
              <rect x="14" y="13" width="1" height="2" fill="#FFA300" />
            </g>
          )}
          {has('wings') && (
            <g>
              <rect x="12" y="7" width="4" height="2" fill="#FFF1E8" />
              <rect x="13" y="9" width="4" height="2" fill="#29ADFF" />
              <rect x="12" y="8" width="1" height="2" fill="#1D2B53" />
            </g>
          )}
        </g>
      ) : (
        /* --- MOODS: HAPPY, NEUTRAL, SAD (Sitting Cat Posture) --- */
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

          {/* Extra left sparkle when patted + confetti on 5x Super Combo */}
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
              <rect x="4" y="5" width="2" height="1" fill={colors.stripe} />
              <rect x="13" y="4" width="4" height="2" fill="#1D2B53" />
              <rect x="14" y="5" width="2" height="1" fill={colors.stripe} />
            </g>
          ) : (
            <g>
              <rect x="4" y="2" width="2" height="1" fill="#1D2B53" />
              <rect x="3" y="3" width="4" height="2" fill="#1D2B53" />
              <rect x="4" y="4" width="2" height="1" fill={colors.earInner} />

              <rect x="14" y="2" width="2" height="1" fill="#1D2B53" />
              <rect x="13" y="3" width="4" height="2" fill="#1D2B53" />
              <rect x="14" y="4" width="2" height="1" fill={colors.earInner} />
            </g>
          )}

          {/* Head Outline (Navy) */}
          <rect x="3" y="5" width="14" height="7" fill="#1D2B53" />
          <rect x="2" y="6" width="16" height="5" fill="#1D2B53" />

          {/* Head Fill */}
          <rect x="4" y="5" width="12" height="6" fill={colors.fur} />
          <rect x="3" y="6" width="14" height="4" fill={colors.fur} />
          <rect x="6" y="8" width="8" height="3" fill={colors.chest} />
          <rect x="9" y="5" width="2" height="2" fill={colors.stripe} />
          <rect x="4" y="5" width="2" height="1" fill={colors.stripe} />
          <rect x="14" y="5" width="2" height="1" fill={colors.stripe} />

          {/* Whiskers */}
          <rect x="1" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="1" y="10" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="8" width="2" height="1" fill="#1D2B53" />
          <rect x="17" y="10" width="2" height="1" fill="#1D2B53" />

          {/* Eyes by Mood (or Cool Shades if equipped) */}
          {has('shades') ? (
            <g>
              {/* Pixel Sunglasses */}
              <rect x="3" y="6" width="14" height="1" fill="#1D2B53" />
              <rect x="4" y="7" width="5" height="2" fill="#1D2B53" />
              <rect x="11" y="7" width="5" height="2" fill="#1D2B53" />
              <rect x="5" y="7" width="1" height="1" fill="#29ADFF" />
              <rect x="12" y="7" width="1" height="1" fill="#29ADFF" />
            </g>
          ) : isSuperCombo ? (
            <g>
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
              <rect x="5" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="6" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="7" y="7" width="1" height="1" fill="#1D2B53" />

              <rect x="12" y="7" width="1" height="1" fill="#1D2B53" />
              <rect x="13" y="6" width="1" height="1" fill="#1D2B53" />
              <rect x="14" y="7" width="1" height="1" fill="#1D2B53" />

              <rect x="4" y="8" width="2" height="1" fill="#FF004D" />
              <rect x="14" y="8" width="2" height="1" fill="#FF004D" />
            </g>
          ) : mood === 'sad' ? (
            <g>
              <rect x="5" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="5" y="7" width="1" height="1" fill="#FFF1E8" />
              <rect x="5" y="9" width="1" height="2" fill="#29ADFF" />

              <rect x="13" y="7" width="2" height="2" fill="#1D2B53" />
              <rect x="13" y="7" width="1" height="1" fill="#FFF1E8" />
              <rect x="14" y="9" width="1" height="2" fill="#29ADFF" />
            </g>
          ) : (
            <g>
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
          <rect x="6" y="12" width="8" height="5" fill={colors.fur} />
          <rect x="8" y="12" width="4" height="3" fill={colors.chest} />
          <rect x="6" y="16" width="3" height="2" fill={colors.chest} />
          <rect x="11" y="16" width="3" height="2" fill={colors.chest} />
          <rect x="5" y="18" width="10" height="1" fill="#1D2B53" />

          {/* Cosmetic Accessories on Head / Neck */}
          {has('ribbon') && (
            <g>
              {/* Cute Red Bow Tie on Neck */}
              <rect x="7" y="11" width="2" height="3" fill="#FF004D" />
              <rect x="11" y="11" width="2" height="3" fill="#FF004D" />
              <rect x="9" y="12" width="2" height="1" fill="#FFA300" />
            </g>
          )}

          {has('crown') && (
            <g>
              {/* Gold Pixel Crown on Forehead */}
              <rect x="7" y="1" width="1" height="1" fill="#FFA300" />
              <rect x="9" y="0" width="2" height="2" fill="#FFA300" />
              <rect x="12" y="1" width="1" height="1" fill="#FFA300" />
              <rect x="7" y="2" width="6" height="2" fill="#FFA300" />
              <rect x="9" y="2" width="2" height="1" fill="#FF004D" />
              <rect x="7" y="4" width="6" height="1" fill="#1D2B53" />
            </g>
          )}

          {has('sprout') && (
            <g>
              {/* Green Pixel Leaf Sprout on Top of Head */}
              <rect x="9" y="2" width="1" height="3" fill="#008751" />
              <rect x="7" y="1" width="2" height="2" fill="#008751" />
              <rect x="10" y="1" width="2" height="1" fill="#008751" />
            </g>
          )}

          {has('scarf') && (
            <g>
              {/* Cozy Blue & Cream Striped Scarf */}
              <rect x="5" y="11" width="10" height="2" fill="#29ADFF" />
              <rect x="7" y="11" width="2" height="2" fill="#FFF1E8" />
              <rect x="11" y="11" width="2" height="2" fill="#FFF1E8" />
              <rect x="6" y="13" width="3" height="3" fill="#29ADFF" />
              <rect x="7" y="14" width="1" height="1" fill="#FFF1E8" />
            </g>
          )}

          {has('bell') && (
            <g>
              {/* Red Collar + Golden Bell */}
              <rect x="5" y="11" width="10" height="1" fill="#FF004D" />
              <rect x="9" y="12" width="2" height="2" fill="#FFA300" />
              <rect x="9" y="13" width="1" height="1" fill="#FFF1E8" />
            </g>
          )}

          {has('beret') && (
            <g>
              {/* Red Artist Beret */}
              <rect x="5" y="3" width="9" height="2" fill="#FF004D" />
              <rect x="6" y="2" width="7" height="1" fill="#FF004D" />
              <rect x="9" y="1" width="1" height="1" fill="#1D2B53" />
              <rect x="5" y="5" width="9" height="1" fill="#1D2B53" />
            </g>
          )}

          {has('santa') && (
            <g>
              {/* Christmas Santa Hat */}
              <rect x="4" y="4" width="11" height="2" fill="#FFF1E8" />
              <rect x="5" y="2" width="9" height="2" fill="#FF004D" />
              <rect x="7" y="0" width="6" height="2" fill="#FF004D" />
              <rect x="13" y="1" width="2" height="1" fill="#FF004D" />
              <rect x="15" y="1" width="2" height="2" fill="#FFF1E8" />
            </g>
          )}

          {has('antlers') && (
            <g>
              {/* Christmas Reindeer Antlers + Red Nose */}
              <rect x="4" y="1" width="1" height="3" fill="#8B4513" />
              <rect x="2" y="0" width="2" height="2" fill="#8B4513" />
              <rect x="5" y="1" width="1" height="1" fill="#8B4513" />
              <rect x="15" y="1" width="1" height="3" fill="#8B4513" />
              <rect x="16" y="0" width="2" height="2" fill="#8B4513" />
              <rect x="14" y="1" width="1" height="1" fill="#8B4513" />
              <rect x="9" y="8" width="2" height="2" fill="#FF004D" />
            </g>
          )}

          {has('wreath') && (
            <g>
              {/* Christmas Holly Wreath Collar */}
              <rect x="5" y="11" width="10" height="2" fill="#008751" />
              <rect x="6" y="11" width="1" height="1" fill="#FF004D" />
              <rect x="13" y="11" width="1" height="1" fill="#FF004D" />
              <rect x="9" y="12" width="2" height="1" fill="#FFA300" />
            </g>
          )}

          {has('halo') && (
            <g>
              {/* Week 1 (7D): Golden Pixel Halo */}
              <rect x="6" y="0" width="8" height="1" fill="#FFA300" />
              <rect x="5" y="1" width="1" height="1" fill="#FFA300" />
              <rect x="14" y="1" width="1" height="1" fill="#FFA300" />
              <rect x="6" y="2" width="8" height="1" fill="#FFF1E8" />
            </g>
          )}

          {has('wizard') && (
            <g>
              {/* Week 2 (14D): Blue & Gold Wizard Hat */}
              <rect x="3" y="4" width="14" height="1" fill="#1D2B53" />
              <rect x="6" y="2" width="8" height="2" fill="#29ADFF" />
              <rect x="8" y="0" width="4" height="2" fill="#29ADFF" />
              <rect x="9" y="0" width="2" height="1" fill="#FFA300" />
              <rect x="6" y="3" width="8" height="1" fill="#FFA300" />
            </g>
          )}

          {has('headphones') && (
            <g>
              {/* Week 3 (21D): Retro Pixel Headphones */}
              <rect x="5" y="2" width="10" height="1" fill="#1D2B53" />
              <rect x="3" y="3" width="2" height="3" fill="#1D2B53" />
              <rect x="15" y="3" width="2" height="3" fill="#1D2B53" />
              <rect x="2" y="6" width="2" height="4" fill="#FF004D" />
              <rect x="16" y="6" width="2" height="4" fill="#FF004D" />
              <rect x="2" y="7" width="1" height="2" fill="#29ADFF" />
              <rect x="17" y="7" width="1" height="2" fill="#29ADFF" />
            </g>
          )}

          {has('monocle') && (
            <g>
              {/* Week 4 (28D): Fancy Gold Monocle */}
              <rect x="12" y="6" width="4" height="3" fill="#FFA300" />
              <rect x="13" y="7" width="2" height="1" fill="#29ADFF" />
              <rect x="16" y="8" width="1" height="4" fill="#FFA300" />
            </g>
          )}

          {has('wings') && (
            <g>
              {/* Week 5 (35D): Pixel Angel Wings */}
              <rect x="1" y="12" width="4" height="2" fill="#FFF1E8" />
              <rect x="2" y="14" width="3" height="2" fill="#29ADFF" />
              <rect x="1" y="11" width="3" height="1" fill="#1D2B53" />
              <rect x="15" y="12" width="4" height="2" fill="#FFF1E8" />
              <rect x="15" y="14" width="3" height="2" fill="#29ADFF" />
              <rect x="16" y="11" width="3" height="1" fill="#1D2B53" />
            </g>
          )}

          {/* Tail */}
          {mood === 'sad' && !isActiveReaction ? (
            <g>
              <rect x="15" y="16" width="4" height="2" fill="#1D2B53" />
              <rect x="15" y="16" width="3" height="1" fill={colors.stripe} />
            </g>
          ) : (
            <g className={isActiveReaction ? 'animate-tail-wag' : ''}>
              <rect x="15" y="14" width="3" height="3" fill="#1D2B53" />
              <rect x="17" y="11" width="3" height="4" fill="#1D2B53" />
              <rect x="18" y="9" width="2" height="2" fill="#1D2B53" />
              <rect x="16" y="15" width="2" height="1" fill={colors.fur} />
              <rect x="18" y="11" width="1" height="3" fill={colors.stripe} />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
