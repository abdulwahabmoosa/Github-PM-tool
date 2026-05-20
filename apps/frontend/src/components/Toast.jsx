import { useEffect } from 'react';

const VARIANT = {
  success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100',
  error:   'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-100',
  warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100',
  info:    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100',
};

const ICON = { success: '✓', error: '✕', warning: '⚠', info: 'i' };

export default function Toast({ message, variant = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] max-w-sm w-full pointer-events-none animate-fade-in">
      <div
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${VARIANT[variant] ?? VARIANT.info}`}
        role="alert"
      >
        <span className="flex-shrink-0 text-xs font-bold mt-0.5 opacity-70">
          {ICON[variant] ?? 'i'}
        </span>
        <span className="flex-1 text-sm leading-snug">{message}</span>
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-50 hover:opacity-100 text-lg leading-none transition-opacity"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
