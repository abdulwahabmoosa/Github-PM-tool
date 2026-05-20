export const OVERRIDE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function hasRecentOverride(task) {
  if (!task.lastManualOverrideAt) return false;
  return Date.now() - new Date(task.lastManualOverrideAt).getTime() < OVERRIDE_WINDOW_MS;
}

export function overrideRemainingMs(task) {
  if (!task.lastManualOverrideAt) return 0;
  return Math.max(0, OVERRIDE_WINDOW_MS - (Date.now() - new Date(task.lastManualOverrideAt).getTime()));
}

export function computeOverride(task) {
  if (!task.lastManualOverrideAt) return null;
  const until = new Date(new Date(task.lastManualOverrideAt).getTime() + OVERRIDE_WINDOW_MS);
  const remainingMs = Math.max(0, until.getTime() - Date.now());
  return { active: remainingMs > 0, until: until.toISOString(), remainingMs };
}
