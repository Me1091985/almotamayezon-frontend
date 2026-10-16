/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#4f8aff',
          600: '#2563eb', // Brand primary blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#07111d', // Deep Navy
        },
        navy: {
          800: '#0b1929',
          900: '#07111d',
          950: '#040910',
        },
        gold: {
          400: '#e5c058',
          500: '#c9a227', // Premium Accent
          600: '#b08a1d',
        }
      }
    },
  },
  plugins: [],
}
