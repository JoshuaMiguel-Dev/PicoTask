import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calculateStreakSummary, type CatMood } from '../utils/streakUtils';
import PixelCat from './PixelCat';

interface StreakPetCardProps {
  /** 'full' for the Tasks page companion dock, 'compact' for smaller headers */
  variant?: 'full' | 'compact';
}

const CAT_NAME_STORAGE_KEY = 'pico_cat_name_v1';

const MOOD_BADGES: Record<CatMood, { label: string; bg: string }> = {
  happy: { label: 'MOOD: HAPPY', bg: 'bg-pico-green text-pico-cream' },
  neutral: { label: 'MOOD: ALERT', bg: 'bg-pico-blue text-pico-navy' },
  sleepy: { label: 'MOOD: SLEEPY', bg: 'bg-pico-peach text-pico-navy' },
  sad: { label: 'MOOD: SAD', bg: 'bg-pico-red text-pico-cream' },
};

export default function StreakPetCard({ variant = 'full' }: StreakPetCardProps) {
  const [isPetted, setIsPetted] = useState(false);

  // Load saved cat name; if none exists yet, open the first-time naming modal automatically
  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) ?? '';
  });
  const [isNamingOpen, setIsNamingOpen] = useState<boolean>(() => {
    return !localStorage.getItem(CAT_NAME_STORAGE_KEY);
  });
  const [nameInput, setNameInput] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) ?? '';
  });

  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);
  const summary = calculateStreakSummary(allTasks ?? []);

  function handlePetCat() {
    setIsPetted(true);
    window.setTimeout(() => {
      setIsPetted(false);
    }, 900);
  }

  function handleSaveCatName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleaned = nameInput.trim() || 'MINGMING';
    localStorage.setItem(CAT_NAME_STORAGE_KEY, cleaned);
    setCatName(cleaned);
    setNameInput(cleaned);
    setIsNamingOpen(false);
  }

  const displayCatName = (catName || 'MINGMING').toUpperCase();
  const badge = MOOD_BADGES[summary.mood];

  return (
    <>
      {/* First-Time Welcome / Rename Cat Modal */}
      {isNamingOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adopt-cat-title"
            className="fixed inset-0 z-[9999] bg-pico-navy/85 p-4 flex items-center justify-center"
          >
            <form
              onSubmit={handleSaveCatName}
              className="pixel-card-peach w-full max-w-sm p-5 space-y-4 text-center"
            >
              <div className="inline-block bg-pico-red text-pico-cream border-2 border-pico-navy px-2 py-0.5 font-heading text-[9px] uppercase">
                Companion Setup
              </div>

              <h2
                id="adopt-cat-title"
                className="font-heading text-xs sm:text-sm text-pico-navy uppercase leading-relaxed"
              >
                Name Your Streak Cat!
              </h2>

              <div className="bg-pico-cream border-2 border-pico-navy p-4 flex flex-col items-center justify-center">
                <PixelCat mood="happy" size="lg" isPetted />
                <p className="mt-2 text-sm text-pico-gray">
                  Complete at least 1 task each day to keep your cat happy and build your streak.
                </p>
              </div>

              <div className="text-left">
                <label
                  htmlFor="cat-name-input"
                  className="block font-heading text-[10px] uppercase text-pico-navy mb-1.5"
                >
                  Cat&apos;s Name *
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g., Mochi, Mingming, Siopao, Byte..."
                  maxLength={20}
                  className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="submit"
                  className="pixel-btn min-h-11 px-5 py-2 bg-pico-red text-pico-cream font-heading text-[10px] sm:text-xs uppercase w-full"
                >
                  {catName ? 'Save Name' : 'Adopt & Start'}
                </button>

                {catName && (
                  <button
                    type="button"
                    onClick={() => setIsNamingOpen(false)}
                    className="pixel-btn min-h-11 px-4 py-2 bg-pico-cream text-pico-navy font-heading text-[10px] uppercase"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>,
          document.body,
        )}

      {variant === 'compact' ? (
        <div className="pixel-card p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handlePetCat}
              title={`Tap to pet ${displayCatName}!`}
              className="pixel-btn bg-pico-cream p-1.5 shrink-0"
            >
              <PixelCat mood={summary.mood} size="sm" isPetted={isPetted} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="font-heading text-[9px] uppercase text-pico-navy">
                  {displayCatName}
                </span>
                <span className="bg-pico-navy text-pico-cream px-1.5 py-0.5 font-heading text-[9px] uppercase">
                  {summary.streakCount}D STREAK
                </span>
              </div>
              <p className="text-sm font-bold text-pico-navy truncate">
                {isPetted ? '*PURRRR!* Keep up the focus!' : summary.statusMessage}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <section
          aria-label="Streak companion pet"
          className="pixel-card-peach p-4 flex flex-col sm:flex-row items-center gap-4"
        >
          {/* Left: Interactive Pixel Cat Avatar Box */}
          <div className="flex flex-col items-center shrink-0">
            <button
              type="button"
              onClick={handlePetCat}
              aria-label={`Pet ${displayCatName}`}
              className="pixel-btn bg-pico-cream p-3 flex flex-col items-center justify-center group"
            >
              <PixelCat mood={summary.mood} size="lg" isPetted={isPetted} />
              <span className="mt-1 font-heading text-[8px] uppercase text-pico-gray group-hover:text-pico-navy">
                [Tap to Pet]
              </span>
            </button>
          </div>

          {/* Right: Streak Stats & Cat Speech Bubble */}
          <div className="flex-1 min-w-0 w-full space-y-2.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 border-b-2 border-pico-navy pb-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-heading text-xs uppercase text-pico-navy">
                  {displayCatName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(catName);
                    setIsNamingOpen(true);
                  }}
                  title="Rename your cat"
                  className="border border-pico-navy bg-pico-cream hover:bg-pico-blue px-1.5 py-0.5 font-heading text-[8px] uppercase text-pico-navy cursor-pointer"
                >
                  [Rename]
                </button>
                <span
                  className={`border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[9px] uppercase ${badge.bg}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Streak Counter Pill */}
              <div className="bg-pico-navy text-pico-cream border-2 border-pico-navy px-2.5 py-1 font-heading text-[10px] uppercase tabular-nums">
                Streak: {summary.streakCount}{' '}
                {summary.streakCount === 1 ? 'Day' : 'Days'}
              </div>
            </div>

            {/* Speech Bubble */}
            <div className="bg-pico-cream border-2 border-pico-navy p-3 shadow-[2px_2px_0px_#1D2B53]">
              <p className="text-base font-bold text-pico-navy">
                &ldquo;
                {isPetted
                  ? `Purrrr! ${displayCatName} loves the headpats!`
                  : summary.statusMessage}
                &rdquo;
              </p>
            </div>

            {/* Daily Quest Footer */}
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 text-xs text-pico-navy">
              <span className="font-heading text-[9px] uppercase">
                Daily Goal:{' '}
                <strong
                  className={
                    summary.completedTodayCount > 0
                      ? 'text-pico-green'
                      : 'text-pico-red'
                  }
                >
                  {summary.completedTodayCount > 0
                    ? `COMPLETE (${summary.completedTodayCount} DONE TODAY)`
                    : '0/1 TASK COMPLETED TODAY'}
                </strong>
              </span>

              {summary.lastActiveDate && (
                <span className="font-heading text-[9px] text-pico-gray uppercase">
                  Last Active: {summary.lastActiveDate}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
