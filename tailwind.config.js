/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15161A',
        coal: '#1E2026',
        graphite: '#2B2E36',
        bone: '#ECEAE5',
        paper: '#F6F5F2',
        stone: '#7A7C84',
        signal: { DEFAULT: '#4A5CFF', soft: '#8F9BFF', deep: '#3242E0' },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', '"Arial Narrow"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulseRing: { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        pulseRing: 'pulseRing 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
