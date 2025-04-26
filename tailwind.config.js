// tailwind.config.js
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
<<<<<<< HEAD
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
=======
    plugin(function({ addUtilities }) {
      // your custom utilities here (if any)
    })
>>>>>>> cb6bd4a3db4a643ea48452c178509de166f6496d
  ],
};
