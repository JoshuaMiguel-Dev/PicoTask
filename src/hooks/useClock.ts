import { useEffect, useState } from 'react';

/**
 * Custom React hook that returns a live `Date` object updated every second
 * and immediately re-synced when the tab regains focus or visibility.
 */
export function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    function syncNow() {
      setNow(new Date());
    }

    const timerId = window.setInterval(syncNow, 1000);
    document.addEventListener('visibilitychange', syncNow);
    window.addEventListener('focus', syncNow);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', syncNow);
      window.removeEventListener('focus', syncNow);
    };
  }, []);

  return now;
}
