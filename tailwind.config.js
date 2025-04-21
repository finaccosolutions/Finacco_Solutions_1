/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      minHeight: {
        screen: ['100vh', '100dvh'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};