import { useEffect } from 'react';

export default function ConfirmDialog({ state, onClose }) {
  useEffect(() => {
    if (!state) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') {
        state.onConfirm?.();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  if (!state) return null;

  const { title, body, confirmLabel = 'Confirm', confirmVariant = 'default', onConfirm } = state;

  const confirmClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-2">
          {title}
        </h3>
        {body && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            {body}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm?.(); onClose(); }}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
