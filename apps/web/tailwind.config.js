/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // original "boomtown" palette — warm earth + civic teal on dark clay
        ink: {
          900: '#16110d',
          800: '#1f1813',
          700: '#2a211a',
          600: '#3a2e24',
          500: '#4d3e30',
        },
        sand: {
          100: '#f6efe4',
          200: '#ece0cd',
          300: '#d8c4a4',
        },
        ember: {
          400: '#f0a35e',
          500: '#e8843f',
          600: '#d26a28',
        },
        teal: {
          400: '#3fb8a6',
          500: '#1f9b88',
          600: '#157a6b',
        },
        gold: '#f2c84b',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 1px 0 rgba(255,255,255,0.06), 0 6px 16px rgba(0,0,0,0.35)',
        pop: '0 12px 40px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
