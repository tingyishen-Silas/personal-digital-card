/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ochre: 'var(--color-ochre)',
        sienna: 'var(--color-sienna)',
        warmGold: 'var(--color-warm-gold)',
        taupe: 'var(--color-taupe)',
        cream: 'var(--color-cream)',
      },
      fontFamily: {
        title: ['var(--font-title)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};
