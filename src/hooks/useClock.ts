import { useEffect, useState } from 'react';

/**
 * Custom React hook that returns a live `Date` object updated every second.
 *
 * Interview Concept:
 * `useEffect` sets up a side effect (a browser `setInterval` timer) after the component mounts.
 * Returning `() => clearInterval(timerId)` is the **cleanup function**—React calls it
 * when the component unmounts so the timer doesn't keep running in memory (preventing a memory leak).
 */
export function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  return now;
}
