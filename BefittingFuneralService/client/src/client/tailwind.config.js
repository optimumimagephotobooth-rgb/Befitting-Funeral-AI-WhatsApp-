/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#030712',
        dusk: '#111827',
        calm: '#1e293b'
      }
    }
  },
  plugins: []
};



