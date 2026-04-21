/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Noto Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#EDF8F2',
          100: '#D4F0E1',
          200: '#A8E0C0',
          300: '#6FCF97',
          400: '#4CB896',
          500: '#2FA084',
          600: '#2FA084',
          700: '#1F6F5F',
          800: '#1F6F5F',
          900: '#133D35',
          950: '#0B2E28',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          300: '#F4C430',
          400: '#E8B82A',
          500: '#D4A017',
          600: '#C99700',
          700: '#A67C00',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        focus: '0 0 0 3px rgba(82,183,136,0.35)',
        sm: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        md: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        lg: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.25s ease forwards',
        float: 'float 4s ease-in-out infinite',
        'fill-bar': 'fillBar 0.8s ease forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fillBar: {
          from: { width: '0%' },
          to: { width: 'var(--target-width)' },
        },
      },
    },
  },
  plugins: [],
};
