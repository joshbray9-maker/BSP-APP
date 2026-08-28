/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // bg/surface/surface2/border, like accent, read from CSS custom properties (see
        // src/lib/theme.js) so the dashboard's background is subtly tinted per org — still a
        // dark theme, just tinted toward that org's hue instead of one fixed neutral gray.
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
        text: '#e8eaf0',
        muted: '#8b8fa3',
        // accent/accentFg read from CSS custom properties (see src/lib/theme.js) so a
        // per-team/org color palette can override them at runtime without a rebuild.
        accent: 'var(--accent)',
        accentFg: 'var(--accent-fg)',
        accentSoft: 'var(--accent-soft)',
        flagRed: '#ef4444',
        flagYellow: '#eab308',
        flagGreen: '#22c55e',
        flagNeutral: '#71717a',
      },
    },
  },
  plugins: [],
}
