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
 * Compact, non-intrusive Streak Cat companion bar.
 * - Zero popups on startup (defaults to "MINGMING" and lets the user rename inline by tapping the name).
 * - Fits cleanly in a single horizontal row on mobile so tasks stay front-and-center.
 */
export default function StreakPetCard() {
  const [isPetted, setIsPetted] = useState(false);
  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) || 'Mingming';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(catName);

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const summary = calculateStreakSummary(allTasks ?? []);

  function handlePetCat() {
    setIsPetted(true);
    window.setTimeout(() => {
      setIsPetted(false);
    }, 800);
  }

  function handleSaveCatName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = nameInput.trim() || 'Mingming';
    localStorage.setItem(CAT_NAME_STORAGE_KEY, cleaned);
    setCatName(cleaned);
    setNameInput(cleaned);
    setIsEditingName(false);
  }

  const badge = MOOD_BADGES[summary.mood];

  return (
    <section
      aria-label="Streak companion pet"
      className="pixel-card-peach p-3 flex items-center gap-3"
    >
      {/* Tap-to-Pet Cat Avatar */}
      <button
        type="button"
        onClick={handlePetCat}
        aria-label={`Pet ${catName}`}
        className="pixel-btn bg-pico-cream p-1.5 shrink-0 flex items-center justify-center"
      >
        <PixelCat mood={summary.mood} size="sm" isPetted={isPetted} />
      </button>

      {/* Compact Right Column: Inline Name + Streak + 1-Line Status */}
      <div className="flex-1 min-w-0">
        {isEditingName ? (
          <form onSubmit={handleSaveCatName} className="flex items-center gap-1.5 mb-1">
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={16}
              placeholder="Cat name..."
              className="pixel-input px-2 py-0.5 text-base text-pico-navy w-32 min-w-0"
            />
            <button
              type="submit"
              className="pixel-btn px-2 py-1 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
            >
              OK
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
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNameInput(catName);
                  setIsEditingName(true);
                }}
                title="Tap to rename your cat"
                className="font-heading text-[10px] uppercase text-pico-navy hover:underline cursor-pointer"
              >
                {catName} [Edit]
              </button>
              <span
                className={`border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase ${badge.bg}`}
              >
                {badge.label}
              </span>
            </div>

            <span className="bg-pico-navy text-pico-cream px-1.5 py-0.5 font-heading text-[8px] uppercase tabular-nums">
              {summary.streakCount}D Streak
            </span>
          </div>
        )}

        <p className="text-sm font-bold text-pico-navy truncate">
          {isPetted ? `*Purrrr!* ${catName} is happy!` : summary.statusMessage}
        </p>
      </div>
    </section>
  );
}
