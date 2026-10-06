/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      boxShadow: {
        'clay-sm': 'var(--clay-shadow-sm)',
        'clay-card': 'var(--clay-shadow-card)',
        'clay-card-hover': 'var(--clay-shadow-card-hover)',
        'clay-inset': 'var(--clay-shadow-inset)',
        'clay-inset-focus': 'var(--clay-shadow-inset-focus)',
        'clay-btn': 'var(--clay-shadow-btn)',
        'clay-btn-hover': 'var(--clay-shadow-btn-hover)',
        'clay-btn-active': 'var(--clay-shadow-btn-active)',
      },
      keyframes: {
        clayFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        clayPop: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        clayWiggle: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        clayPulseSoft: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
      animation: {
        'clay-float': 'clayFloat 4s ease-in-out infinite',
        'clay-pop': 'clayPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'clay-wiggle': 'clayWiggle 0.4s ease-in-out',
        'clay-pulse-soft': 'clayPulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
