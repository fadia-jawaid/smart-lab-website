/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#172554',
          DEFAULT: '#3B82F6',
        },
        accent: { 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2' },
        canvas: '#0B1120',
        surface: { DEFAULT: '#111827', 2: '#1E293B' },
        hairline: 'rgba(148,163,184,0.12)',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        glow: '0 0 20px rgba(59,130,246,0.35)',
        'glow-cyan': '0 0 24px rgba(6,182,212,0.45)',
        'glow-danger': '0 0 20px rgba(239,68,68,0.40)',
        card: '0 8px 30px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(148,163,184,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.06) 1px,transparent 1px)',
        'brand-gradient': 'linear-gradient(135deg,#2563EB 0%,#06B6D4 100%)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(.95)', opacity: '.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'flow-dash': { to: { 'stroke-dashoffset': '-16' } },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        'flow-dash': 'flow-dash 0.6s linear infinite',
      },
    },
  },
  plugins: [],
};
