export default function UnclaimedCallout({ count }) {
  if (!count || count === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100 rounded-lg p-3 mb-3">
      <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
        🚩 {count} unclaimed {count === 1 ? 'task' : 'tasks'} available
      </p>
      <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
        Push{' '}
        <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200">
          task-N-claim
        </code>{' '}
        to take one
      </p>
    </div>
  );
}
