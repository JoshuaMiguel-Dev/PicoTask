import { useEffect, useRef } from 'react';

/**
 * Keeps the device screen awake via the Screen Wake Lock API while `enabled` is true.
 * Re-acquires automatically when the tab returns to visibility and releases on cleanup.
 */
export function useWakeLock(enabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let cancelled = false;

    async function acquire() {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (sentinelRef.current && !sentinelRef.current.released) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Ignore if battery saver, low power mode, or browser policy denies wake lock
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {});
      }
    };
  }, [enabled]);
}
