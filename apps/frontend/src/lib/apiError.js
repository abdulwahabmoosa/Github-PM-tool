/**
 * Convert API errors into user-friendly toast messages.
 */
export function formatApiError(err) {
  if (!err) return 'An error occurred.';

  if (err.status === 403) {
    if (err.code === 'permission_denied') return "You don't have permission to do that.";
    return 'Permission denied.';
  }

  if (err.status === 401) {
    window.location.href = '/';
    return 'Your session has expired. Please sign in again.';
  }

  if (err.status >= 500) {
    console.error('[API] Server error:', err);
    return 'Something went wrong on our end. Please try again.';
  }

  if (err.status === 400) return err.message ?? 'Invalid request.';
  if (err.status === 404) return err.message ?? 'Not found.';
  if (err.status === 409) return err.message ?? 'Conflict — that already exists.';

  return err.message ?? 'An error occurred.';
}
