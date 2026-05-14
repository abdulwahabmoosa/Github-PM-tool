import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class names. Handles conditionals and deduplication.
 * Usage: cn('bg-red-500', isActive && 'bg-blue-500', 'p-4')
 */
export function cn(...classes) {
  return twMerge(classes.filter(Boolean).join(' '));
}
