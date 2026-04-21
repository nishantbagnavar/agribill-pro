/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfaf5',
          100: '#d3f3e7',
          300: '#70d4b4',
          600: '#1F6F5F',
          700: '#175a4d',
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
