/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'system-ui',
          'Segoe UI', 'Roboto', 'sans-serif',
        ],
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo',
          'Monaco', 'Consolas', 'monospace',
        ],
      },
      colors: {
        status: {
          open:          '#64748B',
          todo:          '#6366F1',
          'in-progress': '#F59E0B',
          'help-needed': '#EF4444',
          'in-review':   '#3B82F6',
          done:          '#10B981',
        },
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  safelist: [
    { pattern: /^bg-(slate|indigo|amber|red|blue|emerald)-(50|100|200|800|900|950)$/ },
    { pattern: /^text-(slate|indigo|amber|red|blue|emerald)-(50|400|500|600|700|800|900)$/ },
    { pattern: /^border-(slate|indigo|amber|red|blue|emerald)-(200|300|700|800)$/ },
  ],
};
