/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        damco: {
          red: '#E32200',
          black: '#100D08',
          cream: '#FBEEDB',
          white: '#FFFFFF',
          burgundy: '#94122C',
          orange: '#CA3F16',
          yellow: '#FF9408',
          plum: '#330033',
          purple: '#721562',
        }
      },
      fontFamily: {
        sans: ['Calibri', 'sans-serif'], 
        display: ['Meiryo', 'sans-serif'], 
      }
    },
  },
  plugins: [],
};