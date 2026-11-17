import { useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calculateStreakSummary, type CatMood } from '../utils/streakUtils';
import PixelCat, {
  CAT_ACCESSORIES,
  CAT_ACCESSORY_STORAGE_KEY,
  CAT_VARIANTS,
  CAT_VARIANT_STORAGE_KEY,
  getSavedCatAccessory,
  getSavedCatVariant,
  type CatAccessory,
  type CatVariant,
} from './PixelCat';

const CAT_NAME_STORAGE_KEY = 'pico_cat_name_v1';

const MOOD_BADGES: Record<CatMood, { label: string; bg: string }> = {
  happy: { label: 'HAPPY', bg: 'bg-pico-green text-pico-cream' },
  neutral: { label: 'ALERT', bg: 'bg-pico-blue text-pico-navy' },
  sleepy: { label: 'SLEEPY', bg: 'bg-pico-cream text-pico-navy' },
  sad: { label: 'SAD', bg: 'bg-pico-red text-pico-cream' },
};

/**
 * Rich PICO-8 Streak Companion Card with:
 * - Normal tap (1–4 pats): Headpat squish & happy bounce animation.
 * - Every 5th tap (`patCount % 5 === 0`): Special 360° Super Zoomies Backflip + confetti!
 * - `[Customize]` button: Lets existing users change their cat's Name, Coat Style, and Cosmetic anytime!
 */
export default function StreakPetCard() {
  const [isPetted, setIsPetted] = useState(false);
  const [isSuperCombo, setIsSuperCombo] = useState(false);
  const [secretPhase, setSecretPhase] = useState<
    'idle' | 'vanishing' | 'gone' | 'returning'
  >('idle');
  const [, setPatCount] = useState(0);
  const resetTimerRef = useRef<number | null>(null);
  const spamTimestampsRef = useRef<number[]>([]);
  const secretTimersRef = useRef<number[]>([]);

  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) || 'MINGMING';
  });
  const [catVariant, setCatVariant] = useState<CatVariant>(() =>
    getSavedCatVariant(),
  );
  const [catAccessory, setCatAccessory] = useState<CatAccessory>(() =>
    getSavedCatAccessory(),
  );

  // Wardrobe & Rename Modal State for Existing Users
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [nameInput, setNameInput] = useState(catName);
  const [draftVariant, setDraftVariant] = useState<CatVariant>(catVariant);
  const [draftAccessory, setDraftAccessory] =
    useState<CatAccessory>(catAccessory);

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const summary = calculateStreakSummary(allTasks ?? []);

  function handlePetCat() {
    if (secretPhase !== 'idle') return;

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    // Track rapid taps within a 4-second window (10 rapid taps triggers the secret vanish + spin return)
    const nowMs = Date.now();
    const recentTaps = spamTimestampsRef.current.filter(
      (t) => nowMs - t < 4000,
    );
    recentTaps.push(nowMs);
    spamTimestampsRef.current = recentTaps;

    if (recentTaps.length >= 10) {
      spamTimestampsRef.current = [];
      setIsPetted(false);
      setIsSuperCombo(false);
      setSecretPhase('vanishing');

      const t1 = window.setTimeout(() => {
        setSecretPhase('gone');
      }, 420);

      const t2 = window.setTimeout(() => {
        setSecretPhase('returning');
      }, 2800);

      const t3 = window.setTimeout(() => {
        setSecretPhase('idle');
      }, 3650);

      secretTimersRef.current.forEach((id) => window.clearTimeout(id));
      secretTimersRef.current = [t1, t2, t3];
      return;
    }

    setIsPetted(false);
    setIsSuperCombo(false);

    setPatCount((prev) => {
      const next = prev + 1;
      const reachedFiveCombo = next % 5 === 0;

      window.requestAnimationFrame(() => {
        if (reachedFiveCombo) {
          setIsSuperCombo(true);
        } else {
          setIsPetted(true);
        }
      });

      resetTimerRef.current = window.setTimeout(() => {
        setIsPetted(false);
        setIsSuperCombo(false);
      }, reachedFiveCombo ? 950 : 780);

      return next;
    });
  }

  function openCustomizeModal() {
    setNameInput(catName);
    setDraftVariant(catVariant);
    setDraftAccessory(catAccessory);
    setIsCustomizing(true);
  }

  function handleSaveCustomization(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = (nameInput.trim() || 'MINGMING').toUpperCase();
    localStorage.setItem(CAT_NAME_STORAGE_KEY, cleaned);
    localStorage.setItem(CAT_VARIANT_STORAGE_KEY, draftVariant);
    localStorage.setItem(CAT_ACCESSORY_STORAGE_KEY, draftAccessory);

    setCatName(cleaned);
    setCatVariant(draftVariant);
    setCatAccessory(draftAccessory);
    setIsCustomizing(false);
  }

  const badge = MOOD_BADGES[summary.mood];
  const questDone = summary.completedTodayCount > 0;

  return (
    <>
      {/* Cat Wardrobe & Name Customizer Modal (For Existing Users) */}
      {isCustomizing &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Customize your streak cat"
            className="fixed inset-0 z-[9999] bg-pico-navy/80 p-3 flex items-center justify-center overflow-hidden touch-none"
          >
            <form
              onSubmit={handleSaveCustomization}
              className="w-full max-w-sm pixel-card-peach p-4 space-y-3.5 border-4 border-pico-navy"
            >
              <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
                <span className="font-heading text-[10px] uppercase text-pico-navy">
                  // Cat Wardrobe
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="pixel-btn px-2 py-0.5 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
                >
                  X
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="bg-pico-cream border-2 border-pico-navy p-3 flex flex-col items-center justify-center">
                <PixelCat
                  mood="happy"
                  size="lg"
                  isPetted
                  variant={draftVariant}
                  accessory={draftAccessory}
                />
                <span className="mt-1 font-heading text-[9px] uppercase text-pico-navy">
                  {(nameInput.trim() || 'MINGMING').toUpperCase()}
                </span>
              </div>

              {/* 1. Cat Style / Fur Variant */}
              <div>
                <span className="block font-heading text-[8px] uppercase text-pico-navy mb-1">
                  Cat Style:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {CAT_VARIANTS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setDraftVariant(v.id)}
                      className={`pixel-btn py-1.5 font-heading text-[8px] uppercase ${
                        draftVariant === v.id
                          ? 'bg-pico-blue text-pico-navy'
                          : 'bg-pico-cream text-pico-navy'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Cosmetic Accessory */}
              <div>
                <span className="block font-heading text-[8px] uppercase text-pico-navy mb-1">
                  Cosmetic:
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {CAT_ACCESSORIES.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setDraftAccessory(acc.id)}
                      className={`pixel-btn py-1.5 font-heading text-[7px] sm:text-[8px] uppercase ${
                        draftAccessory === acc.id
                          ? 'bg-pico-green text-pico-cream'
                          : 'bg-pico-cream text-pico-navy'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Cat Name */}
              <div>
                <label
                  htmlFor="wardrobe-cat-name"
                  className="block font-heading text-[8px] uppercase text-pico-navy mb-1"
                >
                  Cat Name:
                </label>
                <input
                  id="wardrobe-cat-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={14}
                  placeholder="Cat name..."
                  className="pixel-input w-full px-3 py-2 text-base text-pico-navy"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="pixel-btn flex-1 min-h-10 py-2 bg-pico-red text-pico-cream font-heading text-[9px] uppercase"
                >
                  [Save Look]
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="pixel-btn min-h-10 px-3 py-2 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      <section
        aria-label="Streak companion pet"
        className="pixel-card-peach p-3.5 sm:p-4 space-y-3"
      >
        {/* Top Console Strip: Cat Name + [Style] + Mood + Streak Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-pico-navy pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-heading text-[10px] sm:text-xs uppercase text-pico-navy">
              {catName}
            </span>
            <button
              type="button"
              onClick={openCustomizeModal}
              className="border-2 border-pico-navy bg-pico-cream hover:bg-pico-blue px-1.5 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
            >
              [Style]
            </button>
            <span
              className={`border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase ${badge.bg}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[9px] uppercase tabular-nums">
            Streak: {summary.streakCount}D
          </div>
        </div>

        {/* Main Side-by-Side Companion Body */}
        <div className="flex items-stretch gap-3">
          {/* Framed Pixel Cat Portrait Box */}
          <button
            type="button"
            onClick={handlePetCat}
            aria-label={`Pet ${catName}`}
            className="pixel-btn bg-pico-cream px-2.5 py-2 shrink-0 flex flex-col items-center justify-center group overflow-hidden"
          >
            <PixelCat
              mood={summary.mood}
              size="md"
              isPetted={isPetted}
              isSuperCombo={isSuperCombo}
              secretPhase={secretPhase}
              variant={catVariant}
              accessory={catAccessory}
            />
            <span className="mt-1 font-heading text-[7px] uppercase text-pico-gray group-hover:text-pico-navy">
              [Pet]
            </span>
          </button>

          {/* Right: Speech Bubble & Daily Quest Progress Bar */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
            <div className="bg-pico-cream border-2 border-pico-navy p-2.5 shadow-[2px_2px_0px_#1D2B53] flex-1 flex items-center">
              <p className="text-sm sm:text-base font-bold text-pico-navy leading-snug">
                &ldquo;
                {secretPhase === 'vanishing' || secretPhase === 'gone'
                  ? `*POOF!* ${catName} zoomed away from too many pats...`
                  : secretPhase === 'returning'
                    ? `*WHEEEEE!!* ${catName} spun right back in!`
                    : isSuperCombo
                      ? `*SUPER ZOOMIES!!* ${catName} did a 5-pat backflip!`
                      : isPetted
                        ? `Purrrr! ${catName} loves the headpats!`
                        : summary.statusMessage}
                &rdquo;
              </p>
            </div>

            {/* 8-Bit Daily Quest Progress Bar */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-[8px] uppercase text-pico-navy shrink-0">
                Daily Quest:
              </span>
              <div className="flex-1 h-3 bg-pico-cream border-2 border-pico-navy p-0.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    questDone ? 'w-full bg-pico-green' : 'w-1/6 bg-pico-orange'
                  }`}
                />
              </div>
              <span className="font-heading text-[8px] uppercase text-pico-navy shrink-0 tabular-nums">
                {questDone ? 'DONE!' : '0/1'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
