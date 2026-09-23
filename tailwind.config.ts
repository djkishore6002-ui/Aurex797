import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — vibrant violet (premium SaaS accent)
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Warm accent — amber (XP, certificates, highlights)
        marigold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Neutrals — dark-aware: 50–300 are dark surfaces, 400–950 are light text
        ink: {
          50: '#060913',
          100: '#0b101f',
          200: '#141c33',
          300: '#1f2a4d',
          400: '#8b95b3',
          500: '#a2abc7',
          600: '#bcc4da',
          700: '#d3d9ec',
          800: '#e6eaf6',
          900: '#f1f4fc',
          950: '#f9fbff',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        tamil: ['var(--font-tamil)', 'var(--font-sans)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(139, 92, 246, 0.5)',
        'glow-sm': '0 0 24px -6px rgba(139, 92, 246, 0.45)',
        'glow-lg': '0 0 70px -12px rgba(139, 92, 246, 0.65)',
        'glow-cyan': '0 0 40px -10px rgba(34, 211, 238, 0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.08)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        drift: 'drift 14s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        shimmer: 'shimmer 3.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
