import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7f3',
          100: '#e0ede3',
          200: '#c2dbc9',
          300: '#98c0a4',
          400: '#699e7c',
          500: '#47805d',
          600: '#346649',
          700: '#2a513b',
          800: '#234130',
          900: '#1d3629',
          950: '#0e1d16',
        },
        marigold: {
          50: '#fdf9ef',
          100: '#f9efcf',
          200: '#f2dd9b',
          300: '#eac563',
          400: '#e3ac35',
          500: '#d4921f',
          600: '#b96f19',
          700: '#944f18',
          800: '#7a3f1a',
          900: '#68351a',
        },
        ink: {
          50: '#f6f7f8',
          100: '#eceef0',
          200: '#d5dade',
          300: '#b0bac1',
          400: '#82929e',
          500: '#647480',
          600: '#505d68',
          700: '#434d56',
          800: '#3b434a',
          900: '#353c42',
          950: '#23282c',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        tamil: ['var(--font-tamil)', 'var(--font-sans)', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
