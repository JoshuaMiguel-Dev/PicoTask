import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calculateStreakSummary, type CatMood } from '../utils/streakUtils';
import PixelCat from './PixelCat';

const CAT_NAME_STORAGE_KEY = 'pico_cat_name_v1';

const MOOD_BADGES: Record<CatMood, { label: string; bg: string }> = {
  happy: { label: 'HAPPY', bg: 'bg-pico-green text-pico-cream' },
  neutral: { label: 'ALERT', bg: 'bg-pico-blue text-pico-navy' },
  sleepy: { label: 'SLEEPY', bg: 'bg-pico-cream text-pico-navy' },
  sad: { label: 'SAD', bg: 'bg-pico-red text-pico-cream' },
};

/**
 * Rich PICO-8 Streak Companion Card with:
 * - Framed interactive Pixel Cat portrait on the left (even on mobile 375px!)
 * - Speech bubble, Streak counter, Daily Quest progress bar, and inline Rename on the right
 * - No blocking full-screen modal popup on launch
 */
export default function StreakPetCard() {
  const [isPetted, setIsPetted] = useState(false);
  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) || 'MINGMING';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(catName);

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const summary = calculateStreakSummary(allTasks ?? []);

  function handlePetCat() {
    setIsPetted(true);
    window.setTimeout(() => {
      setIsPetted(false);
    }, 850);
  }

  function handleSaveCatName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = (nameInput.trim() || 'MINGMING').toUpperCase();
    localStorage.setItem(CAT_NAME_STORAGE_KEY, cleaned);
    setCatName(cleaned);
    setNameInput(cleaned);
    setIsEditingName(false);
  }

  const badge = MOOD_BADGES[summary.mood];
  const questDone = summary.completedTodayCount > 0;

  return (
    <section
      aria-label="Streak companion pet"
      className="pixel-card-peach p-3.5 sm:p-4 space-y-3"
    >
      {/* Top Console Strip: Cat Name + Rename + Streak Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-pico-navy pb-2">
        {isEditingName ? (
          <form onSubmit={handleSaveCatName} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={14}
              placeholder="Cat name..."
              className="pixel-input px-2 py-0.5 text-base text-pico-navy w-32 sm:w-40"
            />
            <button
              type="submit"
              className="pixel-btn px-2.5 py-1 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setNameInput(catName);
                setIsEditingName(false);
              }}
              className="pixel-btn px-2 py-1 bg-pico-cream text-pico-navy font-heading text-[8px] uppercase"
            >
              X
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-heading text-[10px] sm:text-xs uppercase text-pico-navy">
              {catName}
            </span>
            <button
              type="button"
              onClick={() => {
                setNameInput(catName);
                setIsEditingName(true);
              }}
              className="border border-pico-navy bg-pico-cream hover:bg-pico-blue px-1.5 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
            >
              [Rename]
            </button>
            <span
              className={`border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase ${badge.bg}`}
            >
              {badge.label}
            </span>
          </div>
        )}

        <div className="bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[9px] uppercase tabular-nums">
          Streak: {summary.streakCount}D
        </div>
      </div>

      {/* Main Side-by-Side Companion Body (Horizontal even on 375px mobile!) */}
      <div className="flex items-stretch gap-3">
        {/* Framed Pixel Cat Portrait Box */}
        <button
          type="button"
          onClick={handlePetCat}
          aria-label={`Pet ${catName}`}
          className="pixel-btn bg-pico-cream px-2.5 py-2 shrink-0 flex flex-col items-center justify-center group"
        >
          <PixelCat mood={summary.mood} size="md" isPetted={isPetted} />
          <span className="mt-1 font-heading text-[7px] uppercase text-pico-gray group-hover:text-pico-navy">
            [Pet]
          </span>
        </button>

        {/* Right: Speech Bubble & Daily Quest Progress Bar */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div className="bg-pico-cream border-2 border-pico-navy p-2.5 shadow-[2px_2px_0px_#1D2B53] flex-1 flex items-center">
            <p className="text-sm sm:text-base font-bold text-pico-navy leading-snug">
              &ldquo;
              {isPetted
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
  );
}
