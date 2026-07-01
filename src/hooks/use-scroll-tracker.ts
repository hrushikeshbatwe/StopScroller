import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { ScrollTracker, type ServiceHealth } from '../../modules/scroll-tracker';

/**
 * Live scroll count + service health. The count is READ from the native single source of truth
 * (plan R1): pushed live via `onCountChanged` while the app is foreground, and re-read from
 * persistence whenever the app returns to foreground (covers counts accrued while backgrounded).
 */
export function useScrollTracker() {
  const [count, setCount] = useState(0);
  const [health, setHealth] = useState<ServiceHealth | null>(null);

  const refresh = useCallback(() => {
    try {
      setCount(ScrollTracker.getCount());
      setHealth(ScrollTracker.serviceHealth());
    } catch {
      // native module unavailable (e.g. web) — leave defaults
    }
  }, []);

  useEffect(() => {
    refresh();

    const sub = ScrollTracker.addListener('onCountChanged', ({ count }) => setCount(count));
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      sub.remove();
      appSub.remove();
    };
  }, [refresh]);

  return { count, health, refresh };
}
