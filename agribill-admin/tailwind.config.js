/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfaf5',
          100: '#d3f3e7',
          200: '#a9e7d0',
          300: '#70d4b4',
          400: '#38bc94',
          500: '#1a9e7a',
          600: '#1F6F5F',
          700: '#175a4d',
          800: '#144840',
          900: '#123c35',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Noto Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
