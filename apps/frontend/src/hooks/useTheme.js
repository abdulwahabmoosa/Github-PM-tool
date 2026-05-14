import { useState, useEffect, useCallback } from 'react';
import { getStoredMode, cycleMode, applyMode } from '../lib/theme.js';

export function useTheme() {
  const [mode, setMode] = useState(getStoredMode());

  const cycle = useCallback(() => {
    const next = cycleMode();
    setMode(next);
  }, []);

  // Listen for system theme changes and re-apply if the user is on 'system' mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getStoredMode() === 'system') {
        applyMode('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { mode, cycle };
}
