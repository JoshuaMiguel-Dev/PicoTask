import { useEffect, useState } from 'react';

/**
 * TypeScript interface for the non-standard Chromium `beforeinstallprompt` event.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Displays:
 * 1. An `[OFFLINE]` status badge whenever `navigator.onLine` is false (proving offline readiness).
 * 2. An `[INSTALL]` button when the browser supports PWA installation (`beforeinstallprompt`).
 */
export default function PwaStatusPill() {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    function handleBeforeInstallPrompt(e: Event) {
      // Prevent the default mini-infobar so we can trigger installation from our custom pixel button
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {!isOnline && (
        <span
          role="status"
          title="Working offline from local IndexedDB storage"
          className="bg-pico-orange text-pico-navy border-2 border-pico-navy px-2 py-1 font-heading text-[8px] sm:text-[9px] uppercase"
        >
          Offline
        </span>
      )}

      {installEvent && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="pixel-btn bg-pico-green text-pico-cream px-2 py-1 font-heading text-[8px] sm:text-[9px] uppercase"
        >
          + Install
        </button>
      )}
    </div>
  );
}
