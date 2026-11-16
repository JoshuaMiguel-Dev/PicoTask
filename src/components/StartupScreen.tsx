import { useEffect, useState, type FormEvent } from 'react';
import PixelCat from './PixelCat';

const ONBOARDED_KEY = 'pico_onboarded_v1';
const CAT_NAME_STORAGE_KEY = 'pico_cat_name_v1';

interface StartupScreenProps {
  onFinish: () => void;
}

/**
 * Handles two distinct startup experiences before entering the main app:
 * 1. First-Time Users (`!pico_onboarded_v1`):
 *    Full PICO-8 Cartridge Title Screen & Startup Menu where the user names their
 *    streak cat companion and presses `[START GAME // LAUNCH]`.
 * 2. Returning Users (`pico_onboarded_v1 === 'true'`):
 *    Crisp 8-bit Console Boot / Loading Screen with a segmented pixel progress bar
 *    and their companion cat before entering the workspace.
 */
export default function StartupScreen({ onFinish }: StartupScreenProps) {
  const [isReturningUser] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem(ONBOARDED_KEY) ||
        localStorage.getItem(CAT_NAME_STORAGE_KEY),
    );
  });

  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) || '';
  });

  // Boot progress (0 -> 100) for returning users (or after pressing Start)
  const [isBooting, setIsBooting] = useState<boolean>(isReturningUser);
  const [bootStep, setBootStep] = useState<number>(0);

  useEffect(() => {
    if (!isBooting) return;

    const stepInterval = window.setInterval(() => {
      setBootStep((prev) => {
        if (prev >= 4) {
          window.clearInterval(stepInterval);
          return 4;
        }
        return prev + 1;
      });
    }, 260);

    const finishTimer = window.setTimeout(() => {
      onFinish();
    }, 1350);

    return () => {
      window.clearInterval(stepInterval);
      window.clearTimeout(finishTimer);
    };
  }, [isBooting, onFinish]);

  function handleStartFirstTime(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const finalCatName = (catName.trim() || 'MINGMING').toUpperCase();
    localStorage.setItem(CAT_NAME_STORAGE_KEY, finalCatName);
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setCatName(finalCatName);
    setIsBooting(true);
  }

  const savedCatDisplay = (catName.trim() || 'MINGMING').toUpperCase();

  const bootMessages = [
    'MOUNTING INDEXEDDB STORAGE...',
    'SYNCING CALENDAR & DEADLINES...',
    `WAKING UP ${savedCatDisplay}...`,
    'CALIBRATING SPLIT-FLAP CLOCK...',
    'READY!',
  ];

  return (
    <div className="min-h-dvh bg-pico-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md pixel-card-peach p-5 sm:p-7 border-4 border-pico-navy shadow-[6px_6px_0px_#0B1228] text-center space-y-5">
        {/* Top Cartridge Header Strip */}
        <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-pico-red border border-pico-navy inline-block" />
            <span className="w-2.5 h-2.5 bg-pico-orange border border-pico-navy inline-block" />
            <span className="w-2.5 h-2.5 bg-pico-green border border-pico-navy inline-block" />
          </div>
          <span className="font-heading text-[8px] text-pico-navy uppercase">
            CART // PICO-OS v1.0
          </span>
        </div>

        {/* Title Banner */}
        <div className="bg-pico-navy text-pico-cream border-2 border-pico-navy py-4 px-3 space-y-1.5">
          <p className="font-heading text-[8px] text-pico-blue uppercase tracking-widest">
            Personal Desk Companion
          </p>
          <h1 className="font-heading text-lg sm:text-xl text-pico-cream tracking-tight">
            PICO TASK
          </h1>
        </div>

        {/* Center Cat Showcase */}
        <div className="bg-pico-cream border-2 border-pico-navy p-4 flex flex-col items-center justify-center">
          <PixelCat mood="happy" size="lg" isPetted />

          {isBooting ? (
            <p className="mt-2 font-heading text-[9px] uppercase text-pico-navy">
              Companion: {savedCatDisplay}
            </p>
          ) : (
            <p className="mt-2 text-sm font-bold text-pico-navy">
              Complete 1 task a day to keep your cat happy & build your streak!
            </p>
          )}
        </div>

        {/* Mode 1: Returning User (or Post-Setup) Loading Screen */}
        {isBooting ? (
          <div className="space-y-3 pt-1" role="status" aria-live="polite">
            {/* 4-Segment 8-Bit Progress Bar */}
            <div className="bg-pico-cream border-2 border-pico-navy p-1.5 grid grid-cols-4 gap-1.5 h-7">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`transition-colors duration-150 ${
                    bootStep > idx ? 'bg-pico-green' : 'bg-pico-navy/15'
                  }`}
                />
              ))}
            </div>

            <p className="font-heading text-[8px] sm:text-[9px] text-pico-navy uppercase truncate">
              &gt; {bootMessages[bootStep] ?? 'READY!'}
            </p>
          </div>
        ) : (
          /* Mode 2: First-Time User Startup Menu */
          <form onSubmit={handleStartFirstTime} className="space-y-4 text-left">
            <div>
              <label
                htmlFor="startup-cat-name"
                className="block font-heading text-[9px] uppercase text-pico-navy mb-1.5"
              >
                Name Your Streak Cat:
              </label>
              <input
                id="startup-cat-name"
                type="text"
                autoFocus
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Mingming, Mochi, Byte..."
                maxLength={14}
                className="pixel-input w-full px-3 py-2.5 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            <button
              type="submit"
              className="pixel-btn w-full min-h-12 py-3 bg-pico-red text-pico-cream font-heading text-xs uppercase"
            >
              [Press Start]
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
