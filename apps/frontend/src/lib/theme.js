/**
 * Theme management. Stores user preference in localStorage.
 * Modes: 'light' | 'dark' | 'system'.
 * 'system' follows OS preference, re-evaluated on each page load.
 */

const STORAGE_KEY = 'theme';
const VALID_MODES = ['light', 'dark', 'system'];

export function getStoredMode() {
  try {
    const mode = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(mode) ? mode : 'system';
  } catch {
    return 'system';
  }
}

export function isDarkMode() {
  const mode = getStoredMode();
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function setMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  applyMode(mode);
}

export function applyMode(mode) {
  const html = document.documentElement;
  // Briefly disable transitions to avoid color flash
  document.body.classList.add('no-transitions');
  setTimeout(() => document.body.classList.remove('no-transitions'), 100);

  if (mode === 'dark') {
    html.classList.add('dark');
  } else if (mode === 'light') {
    html.classList.remove('dark');
  } else {
    // System
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemDark) html.classList.add('dark');
    else html.classList.remove('dark');
  }
}

/**
 * Cycles through: light → dark → system → light...
 */
export function cycleMode() {
  const current = getStoredMode();
  const next = current === 'light' ? 'dark'
             : current === 'dark' ? 'system'
             : 'light';
  setMode(next);
  return next;
}
