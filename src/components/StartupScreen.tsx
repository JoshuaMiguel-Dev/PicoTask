import { useEffect, useRef, useState, type FormEvent } from 'react';
import PixelCat, {
  CAT_ACCESSORY_STORAGE_KEY,
  CAT_VARIANTS,
  CAT_VARIANT_STORAGE_KEY,
  getSavedCatAccessory,
  getSavedCatVariant,
  STARTER_ACCESSORIES,
  type CatAccessory,
  type CatVariant,
} from './PixelCat';

const ONBOARDED_KEY = 'pico_onboarded_v1';
const CAT_NAME_STORAGE_KEY = 'pico_cat_name_v1';

interface StartupScreenProps {
  onFinish: () => void;
}

export default function StartupScreen({ onFinish }: StartupScreenProps) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [isReturningUser] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem(ONBOARDED_KEY) ||
        localStorage.getItem(CAT_NAME_STORAGE_KEY),
    );
  });

  const [catName, setCatName] = useState<string>(() => {
    return localStorage.getItem(CAT_NAME_STORAGE_KEY) || '';
  });
  const [catVariant, setCatVariant] = useState<CatVariant>(() =>
    getSavedCatVariant(),
  );
  const [catAccessory, setCatAccessory] = useState<CatAccessory>(() =>
    getSavedCatAccessory(),
  );

  const [isBooting, setIsBooting] = useState<boolean>(isReturningUser);
  const [bootStep, setBootStep] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

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
    }, 220);

    const exitAnimTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 1050);

    const finishTimer = window.setTimeout(() => {
      onFinishRef.current();
    }, 1330);

    return () => {
      window.clearInterval(stepInterval);
      window.clearTimeout(exitAnimTimer);
      window.clearTimeout(finishTimer);
    };
  }, [isBooting]);

  function handleStartFirstTime(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      // Ignore if browser blocks fullscreen
    }
    const finalCatName = (catName.trim() || 'MINGMING').toUpperCase();
    localStorage.setItem(CAT_NAME_STORAGE_KEY, finalCatName);
    localStorage.setItem(CAT_VARIANT_STORAGE_KEY, catVariant);
    localStorage.setItem(CAT_ACCESSORY_STORAGE_KEY, catAccessory);
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
    <div className="min-h-dvh bg-pico-navy flex items-center justify-center p-4 overflow-hidden">
      <div
        className={`w-full max-w-md pixel-card-peach p-5 sm:p-6 border-4 border-pico-navy shadow-[6px_6px_0px_#0B1228] text-center space-y-4 ${
          isExiting ? 'animate-startup-exit' : 'animate-power-on'
        }`}
      >
        {/* Title Banner (Removed CART // PICO-OS v1.0 header strip) */}
        <div className="bg-pico-navy text-pico-cream border-2 border-pico-navy py-3.5 px-3 space-y-1">
          <p className="font-heading text-[8px] text-pico-blue uppercase tracking-widest">
            Personal Desk Companion
          </p>
          <h1 className="font-heading text-lg sm:text-xl text-pico-cream tracking-tight">
            PicoTask
          </h1>
        </div>

        {/* Center Cat Live Preview */}
        <div className="bg-pico-cream border-2 border-pico-navy p-3.5 flex flex-col items-center justify-center">
          <PixelCat
            mood="happy"
            size="lg"
            isPetted
            variant={catVariant}
            accessory={catAccessory}
          />

          {isBooting ? (
            <p className="mt-2 font-heading text-[9px] uppercase text-pico-navy">
              Companion: {savedCatDisplay}
            </p>
          ) : (
            <p className="mt-1.5 text-sm font-bold text-pico-navy">
              Pick your cat&apos;s look & complete 1 task daily to build your streak!
            </p>
          )}
        </div>

        {/* Mode 1: Returning User (or Post-Setup) Loading Screen */}
        {isBooting ? (
          <div className="space-y-3 pt-1" role="status" aria-live="polite">
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
          /* Mode 2: First-Time User Startup & Cat Customization Menu */
          <form onSubmit={handleStartFirstTime} className="space-y-3 text-left">
            {/* 1. Cat Coat Selector */}
            <div>
              <span className="block font-heading text-[8px] uppercase text-pico-navy mb-1">
                1. Choose Cat Style:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {CAT_VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setCatVariant(v.id)}
                    className={`pixel-btn py-1.5 font-heading text-[8px] uppercase ${
                      catVariant === v.id
                        ? 'bg-pico-blue text-pico-navy'
                        : 'bg-pico-cream text-pico-navy'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Cosmetic Accessory Selector */}
            <div>
              <span className="block font-heading text-[8px] uppercase text-pico-navy mb-1">
                2. Choose Cosmetic:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {STARTER_ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setCatAccessory(acc.id)}
                    className={`pixel-btn py-1.5 font-heading text-[7px] sm:text-[8px] uppercase ${
                      catAccessory === acc.id
                        ? 'bg-pico-green text-pico-cream'
                        : 'bg-pico-cream text-pico-navy'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Cat Name Input */}
            <div>
              <label
                htmlFor="startup-cat-name"
                className="block font-heading text-[8px] uppercase text-pico-navy mb-1"
              >
                3. Name Your Cat:
              </label>
              <input
                id="startup-cat-name"
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Mingming, Mochi, Byte..."
                maxLength={14}
                className="pixel-input w-full px-3 py-2 text-base text-pico-navy placeholder:text-pico-gray"
              />
            </div>

            <button
              type="submit"
              className="pixel-btn w-full min-h-11 py-2.5 bg-pico-red text-pico-cream font-heading text-xs uppercase"
            >
              [Press Start]
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
